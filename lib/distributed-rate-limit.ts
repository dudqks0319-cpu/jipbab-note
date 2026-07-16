import { createHmac } from "node:crypto";

import { getRateLimitIdentityKeys } from "./request-security.ts";
import { getServerSupabaseAdminClient } from "./supabase-server.ts";

export type DistributedRateLimitResult =
  | { status: "allowed"; remaining: number; retryAfter: number }
  | { status: "limited"; remaining: 0; retryAfter: number }
  | { status: "unavailable"; remaining: 0; retryAfter: number };

type LocalBucket = { count: number; startedAt: number };
const LOCAL_BUCKET_CAPACITY = 10_000;
const localBuckets = new Map<string, LocalBucket>();

type DistributedRateLimitOptions = {
  limit: number;
  windowSeconds: number;
  userId?: string | null;
  dailyLimit?: number;
  globalLimit?: number;
  globalWindowSeconds?: number;
  globalDailyLimit?: number;
};

export function hashRateLimitKey(routeKey: string, requestKey: string, secret: string): string {
  return createHmac("sha256", secret).update(`${routeKey}\n${requestKey}`).digest("hex");
}

function localDevelopmentLimit(
  routeKey: string,
  requestKey: string,
  limit: number,
  windowSeconds: number,
): DistributedRateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `${routeKey}:${requestKey}`;
  const current = localBuckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    if (current) {
      localBuckets.delete(key);
    }
    for (const [bucketKey, bucket] of localBuckets) {
      if (now - bucket.startedAt >= windowMs) {
        localBuckets.delete(bucketKey);
      }
    }
    while (localBuckets.size >= LOCAL_BUCKET_CAPACITY) {
      const oldestKey = localBuckets.keys().next().value;
      if (typeof oldestKey !== "string") break;
      localBuckets.delete(oldestKey);
    }
    localBuckets.set(key, { count: 1, startedAt: now });
    return { status: "allowed", remaining: Math.max(limit - 1, 0), retryAfter: windowSeconds };
  }
  current.count += 1;
  const retryAfter = Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000));
  return current.count <= limit
    ? { status: "allowed", remaining: Math.max(limit - current.count, 0), retryAfter }
    : { status: "limited", remaining: 0, retryAfter };
}

export async function consumeDistributedRateLimitForKey(
  routeKey: string,
  requestKey: string,
  options: { limit: number; windowSeconds: number },
): Promise<DistributedRateLimitResult> {
  const secret = process.env.API_RATE_LIMIT_HMAC_SECRET?.trim();
  const production = process.env.NODE_ENV === "production";
  if (!secret || secret.length < 32) {
    return production
      ? { status: "unavailable", remaining: 0, retryAfter: 60 }
      : localDevelopmentLimit(routeKey, requestKey, options.limit, options.windowSeconds);
  }

  try {
    const keyHash = hashRateLimitKey(routeKey, requestKey, secret);
    const client = getServerSupabaseAdminClient();
    const { data, error } = await client.rpc("consume_api_rate_limit", {
      input_route_key: routeKey,
      input_key_hash: keyHash,
      request_limit: options.limit,
      window_seconds: options.windowSeconds,
    });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return production
        ? { status: "unavailable", remaining: 0, retryAfter: 60 }
        : localDevelopmentLimit(routeKey, requestKey, options.limit, options.windowSeconds);
    }

    const row = data as Record<string, unknown>;
    const allowed = row.allowed === true;
    const remaining = Number.isFinite(Number(row.remaining)) ? Math.max(0, Number(row.remaining)) : 0;
    const retryAfter = Number.isFinite(Number(row.retryAfter))
      ? Math.max(1, Math.ceil(Number(row.retryAfter)))
      : options.windowSeconds;
    return allowed
      ? { status: "allowed", remaining, retryAfter }
      : { status: "limited", remaining: 0, retryAfter };
  } catch {
    return production
      ? { status: "unavailable", remaining: 0, retryAfter: 60 }
      : localDevelopmentLimit(routeKey, requestKey, options.limit, options.windowSeconds);
  }
}

function mergeLimitedResult(
  current: DistributedRateLimitResult,
  next: DistributedRateLimitResult,
): DistributedRateLimitResult {
  if (current.status === "unavailable" || next.status === "unavailable") {
    return {
      status: "unavailable",
      remaining: 0,
      retryAfter: Math.max(current.retryAfter, next.retryAfter),
    };
  }
  if (current.status === "limited" || next.status === "limited") {
    return {
      status: "limited",
      remaining: 0,
      retryAfter: Math.max(current.retryAfter, next.retryAfter),
    };
  }
  return {
    status: "allowed",
    remaining: Math.min(current.remaining, next.remaining),
    retryAfter: Math.max(current.retryAfter, next.retryAfter),
  };
}

async function consumeAll(
  checks: Array<{
    routeKey: string;
    requestKey: string;
    limit: number;
    windowSeconds: number;
  }>,
): Promise<DistributedRateLimitResult> {
  let aggregate: DistributedRateLimitResult = {
    status: "allowed",
    remaining: Number.MAX_SAFE_INTEGER,
    retryAfter: 1,
  };

  for (const check of checks) {
    const result = await consumeDistributedRateLimitForKey(
      check.routeKey,
      check.requestKey,
      check,
    );
    aggregate = mergeLimitedResult(aggregate, result);
    if (aggregate.status !== "allowed") {
      return aggregate;
    }
  }

  return aggregate;
}

export async function consumeDistributedRateLimit(
  request: Request,
  routeKey: string,
  options: DistributedRateLimitOptions,
): Promise<DistributedRateLimitResult> {
  const identityKeys = getRateLimitIdentityKeys(request, options.userId);
  const identityChecks = identityKeys.flatMap((requestKey) => [
    {
      routeKey: `${routeKey}:burst`,
      requestKey,
      limit: options.limit,
      windowSeconds: options.windowSeconds,
    },
    ...(options.dailyLimit
      ? [{
          routeKey: `${routeKey}:daily`,
          requestKey,
          limit: options.dailyLimit,
          windowSeconds: 86_400,
        }]
      : []),
  ]);
  const identityResult = await consumeAll(identityChecks);
  if (identityResult.status !== "allowed") {
    return identityResult;
  }

  const globalChecks = [
    ...(options.globalLimit
      ? [{
          routeKey: `${routeKey}:global-burst`,
          requestKey: "global",
          limit: options.globalLimit,
          windowSeconds: options.globalWindowSeconds ?? options.windowSeconds,
        }]
      : []),
    ...(options.globalDailyLimit
      ? [{
          routeKey: `${routeKey}:global-daily`,
          requestKey: "global",
          limit: options.globalDailyLimit,
          windowSeconds: 86_400,
        }]
      : []),
  ];

  return globalChecks.length > 0 ? consumeAll(globalChecks) : identityResult;
}
