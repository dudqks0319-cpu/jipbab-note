import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const listRouteSource = readFileSync("app/api/account-deletion-requests/route.ts", "utf8");
const updateRouteSource = readFileSync("app/api/account-deletion-requests/[id]/route.ts", "utf8");
const serverSource = readFileSync("lib/supabase-server.ts", "utf8");

test("server Supabase helper exposes a shared missing-config detector", () => {
  assert.match(serverSource, /export function isMissingServerSupabaseConfigError/);
  assert.match(serverSource, /환경변수가 설정되어 있지 않습니다/);
});

test("account deletion list route returns generic 503 for missing server config", () => {
  assert.match(listRouteSource, /SERVICE_UNAVAILABLE_MESSAGE/);
  assert.match(listRouteSource, /계정 삭제 운영 설정을 확인 중입니다\. 잠시 후 다시 시도해 주세요/);
  assert.match(listRouteSource, /isMissingServerSupabaseConfigError/);
  assert.match(listRouteSource, /return serviceUnavailable\(\);/);
  assert.doesNotMatch(listRouteSource, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("account deletion update route returns generic 503 for missing server config", () => {
  assert.match(updateRouteSource, /SERVICE_UNAVAILABLE_MESSAGE/);
  assert.match(updateRouteSource, /계정 삭제 운영 설정을 확인 중입니다\. 잠시 후 다시 시도해 주세요/);
  assert.match(updateRouteSource, /isMissingServerSupabaseConfigError/);
  assert.match(updateRouteSource, /return serviceUnavailable\(\);/);
  assert.doesNotMatch(updateRouteSource, /SUPABASE_SERVICE_ROLE_KEY/);
});
