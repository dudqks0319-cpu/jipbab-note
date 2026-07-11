import { createHmac } from "node:crypto";

import { getRateLimitKey } from "./request-security.ts";
import { getServerSupabaseAdminClient } from "./supabase-server.ts";

export type DistributedRateLimitResult =
  | { status: "allowed"; remaining: number; retryAfter: number }
  | { status: "limited"; remaining: 0; retryAfter: number }
  | { status: "unavailable"; remaining: 0; retryAfter: number };

type LocalBucket = { count: number; startedAt: number };
const LOCAL_BUCKET_CAPACITY = 10_000;
const localBuckets = new Map<string, LocalBucket>();

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

export async function consumeDistributedRateLimit(
  request: Request,
  routeKey: string,
  options: { limit: number; windowSeconds: number },
): Promise<DistributedRateLimitResult> {
  const requestKey = getRateLimitKey(request);
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
