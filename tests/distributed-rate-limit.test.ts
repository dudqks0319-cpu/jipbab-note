import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  consumeDistributedRateLimit,
  hashRateLimitKey,
} from "../lib/distributed-rate-limit.ts";
import { readBoundedJsonObject } from "../lib/request-security.ts";

const migration = readFileSync(
  "supabase/migrations/20260710160000_add_distributed_api_rate_limits.sql",
  "utf8",
);
const rollback = readFileSync(
  "supabase/rollbacks/20260710160000_add_distributed_api_rate_limits.sql",
  "utf8",
);
const dailyMigration = readFileSync(
  "supabase/migrations/20260716131500_allow_daily_api_rate_limit_windows.sql",
  "utf8",
);
const dailyRollback = readFileSync(
  "supabase/rollbacks/20260716131500_allow_daily_api_rate_limit_windows.sql",
  "utf8",
);

test("distributed rate-limit keys are HMAC pseudonyms", () => {
  const first = hashRateLimitKey("recipes:list", "ip:203.0.113.10", "a".repeat(32));
  const second = hashRateLimitKey("recipes:detail", "ip:203.0.113.10", "a".repeat(32));
  const third = hashRateLimitKey("recipes:list", "ip:203.0.113.10", "b".repeat(32));

  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, second);
  assert.notEqual(first, third);
  assert.ok(!first.includes("203.0.113.10"));
});

test("production fails closed when distributed limiter configuration is missing", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.API_RATE_LIMIT_HMAC_SECRET;
  Reflect.set(process.env, "NODE_ENV", "production");
  delete process.env.API_RATE_LIMIT_HMAC_SECRET;
  try {
    const result = await consumeDistributedRateLimit(
      new Request("https://example.com/api/v1/recipes", {
        headers: { "x-real-ip": "203.0.113.11" },
      }),
      "recipes:list",
      { limit: 10, windowSeconds: 60 },
    );
    assert.equal(result.status, "unavailable");
  } finally {
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    if (previousSecret === undefined) delete process.env.API_RATE_LIMIT_HMAC_SECRET;
    else process.env.API_RATE_LIMIT_HMAC_SECRET = previousSecret;
  }
});

test("development fallback remains bounded without pretending to be distributed", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.API_RATE_LIMIT_HMAC_SECRET;
  Reflect.set(process.env, "NODE_ENV", "development");
  delete process.env.API_RATE_LIMIT_HMAC_SECRET;
  const routeKey = `test:${Date.now()}`;
  try {
    const request = new Request("https://example.com/api/v1/recipes", {
      headers: { "x-real-ip": "198.51.100.2" },
    });
    const first = await consumeDistributedRateLimit(request, routeKey, {
      limit: 1,
      windowSeconds: 60,
    });
    const second = await consumeDistributedRateLimit(request, routeKey, {
      limit: 1,
      windowSeconds: 60,
    });
    assert.equal(first.status, "allowed");
    assert.equal(second.status, "limited");
  } finally {
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    if (previousSecret === undefined) delete process.env.API_RATE_LIMIT_HMAC_SECRET;
    else process.env.API_RATE_LIMIT_HMAC_SECRET = previousSecret;
  }
});

test("database rate limiting is atomic, private, and service-role only", () => {
  assert.match(migration, /create table if not exists public\.api_rate_limit_buckets/);
  assert.match(migration, /primary key \(route_key, key_hash, window_start\)/);
  assert.match(migration, /on conflict \(route_key, key_hash, window_start\)/);
  assert.match(migration, /request_count = public\.api_rate_limit_buckets\.request_count \+ 1/);
  assert.match(migration, /alter table public\.api_rate_limit_buckets enable row level security/);
  assert.match(migration, /revoke all on table public\.api_rate_limit_buckets from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.consume_api_rate_limit[\s\S]*to service_role/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(migration, /request_time timestamptz := clock_timestamp\(\)/);
  assert.doesNotMatch(migration, /declare\s+current_time/i);
  assert.match(migration, /auth\.role\(\)\) <> 'service_role'/);
  assert.doesNotMatch(migration, /to anon|to authenticated/);
  assert.doesNotMatch(rollback, /drop table|truncate/i);
});

test("database limiter accepts 24-hour budgets with a non-destructive rollback", () => {
  assert.match(dailyMigration, /window_seconds > 86400/);
  assert.match(dailyMigration, /request_limit > 100000/);
  assert.match(dailyMigration, /from public, anon, authenticated, service_role/);
  assert.match(dailyMigration, /to service_role/);
  assert.match(dailyRollback, /window_seconds > 3600/);
  assert.doesNotMatch(dailyRollback, /drop table|truncate/i);
  assert.match(dailyRollback, /delete from public\.api_rate_limit_buckets\s+where expires_at < request_time/i);
});

test("bounded JSON parsing rejects chunked bodies beyond the API limit", async () => {
  const oversized = new Request("https://example.com/api/v1/recommendations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ingredientIds: ["x".repeat(17_000)] }),
  });
  const valid = new Request("https://example.com/api/v1/recommendations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ingredientIds: ["veg-onion"] }),
  });

  assert.equal(oversized.headers.get("content-length"), null);
  assert.deepEqual(await readBoundedJsonObject(oversized, 16 * 1024), { status: "too_large" });
  assert.deepEqual(await readBoundedJsonObject(valid, 16 * 1024), {
    status: "ok",
    value: { ingredientIds: ["veg-onion"] },
  });
});
