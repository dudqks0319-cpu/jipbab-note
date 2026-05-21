import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const hookSource = readFileSync("hooks/useFamilyShare.ts", "utf8");
const apiSource = readFileSync("app/api/family-groups/route.ts", "utf8");
const migrationSource = readFileSync("supabase/migrations/20260521160347_add_family_group_rpc.sql", "utf8");

test("family invite codes use stronger random generation and longer codes", () => {
  assert.match(hookSource, /INVITE_CODE_LENGTH = 8/);
  assert.match(hookSource, /cryptoApi\?\.getRandomValues/);
  assert.doesNotMatch(hookSource, /Math\.random\(\)\.toString\(36\)\.slice\(2,\s*8\)/);
});

test("family group creation uses a server route instead of unchecked client writes", () => {
  assert.match(hookSource, /fetch\("\/api\/family-groups"/);
  assert.match(hookSource, /action: "create"/);
  assert.match(apiSource, /getServerSupabaseAdminClient/);
  assert.match(apiSource, /await client\.from\("family_groups"\)\.delete\(\)\.eq\("id", groupId\)/);
  assert.doesNotMatch(hookSource, /\.from\("family_groups"\)\.upsert/);
  assert.doesNotMatch(hookSource, /\.from\("family_members"\)\.upsert/);
});

test("family API returns a generic service-unavailable response for missing server config", () => {
  assert.match(apiSource, /isMissingServerSupabaseConfigError/);
  assert.match(apiSource, /가족 공유 설정을 확인 중입니다\. 잠시 후 다시 시도해 주세요\.", 503/);
  assert.doesNotMatch(apiSource, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("family invite join does not create a fake local group before cloud lookup", () => {
  assert.match(hookSource, /fetch\("\/api\/family-groups"/);
  assert.match(hookSource, /action: "join"/);
  assert.match(apiSource, /\.eq\("invite_code", inviteCode\)/);
  assert.match(apiSource, /members\.length > MAX_MEMBERS/);
  assert.doesNotMatch(hookSource, /name: "참여한 가족 냉장고"/);
  assert.doesNotMatch(hookSource, /id: uuidv4\(\),\n\s+name: "참여한 가족 냉장고"/);
});

test("family invite RPC validates device identity and max member count", () => {
  assert.match(migrationSource, /security definer/);
  assert.match(migrationSource, /missing_device_id/);
  assert.match(migrationSource, /family_group_full/);
  assert.match(migrationSource, /family_group_access_denied/);
  assert.match(migrationSource, /values \(\n\s+group_id_input,\n\s+acting_user_id/);
  assert.match(migrationSource, /for update/);
  assert.match(
    migrationSource,
    /grant execute on function public\.join_family_group_by_invite_code\(text, text\) to anon, authenticated/,
  );
  assert.match(
    migrationSource,
    /grant execute on function public\.get_family_group_members\(uuid\) to anon, authenticated/,
  );
});
