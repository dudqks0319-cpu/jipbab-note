import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const hookSource = readFileSync("hooks/useFamilyShare.ts", "utf8");
const apiSource = readFileSync("app/api/family-groups/route.ts", "utf8");
const signedSessionMigrationSource = readFileSync(
  "supabase/migrations/20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
  "utf8",
);
const familyScopeMigrationSource = readFileSync("supabase/migrations/20260527093000_add_family_scoped_fridge_shopping.sql", "utf8");
const familyRlsRecursionMigrationSource = readFileSync(
  "supabase/migrations/20260528010000_fix_family_member_rls_recursion.sql",
  "utf8",
);
const ingredientsHookSource = readFileSync("hooks/useIngredients.ts", "utf8");
const shoppingHookSource = readFileSync("hooks/useShopping.ts", "utf8");
const familyPageSource = readFileSync("app/family/page.tsx", "utf8");
const supabaseReleaseCheckSource = readFileSync("scripts/check-supabase-release.mjs", "utf8");
const supabaseLiveCheckSource = readFileSync("scripts/check-supabase-live.mjs", "utf8");
const realtimeMigrationSource = readFileSync(
  "supabase/migrations/20260717101000_add_family_realtime_activity.sql",
  "utf8",
);
const realtimeRollbackSource = readFileSync(
  "supabase/rollbacks/20260717101000_add_family_realtime_activity.sql",
  "utf8",
);

test("family invite codes use stronger random generation and longer codes", () => {
  assert.match(hookSource, /INVITE_CODE_LENGTH = 8/);
  assert.match(hookSource, /cryptoApi\?\.getRandomValues/);
  assert.doesNotMatch(hookSource, /Math\.random\(\)\.toString\(36\)\.slice\(2,\s*8\)/);
});

test("family group creation uses a server route instead of unchecked client writes", () => {
  assert.match(hookSource, /fetch\("\/api\/family-groups"/);
  assert.match(hookSource, /action: "create"/);
  assert.match(apiSource, /getServerSupabaseAuthenticatedClient/);
  assert.match(apiSource, /auth\.client\.rpc\("create_family_group"/);
  assert.doesNotMatch(hookSource, /\.from\("family_groups"\)\.upsert/);
  assert.doesNotMatch(hookSource, /\.from\("family_members"\)\.upsert/);
});

test("family API returns a generic service-unavailable response for missing server config", () => {
  assert.match(apiSource, /isMissingServerSupabaseConfigError/);
  assert.match(apiSource, /가족 공유 설정을 확인 중입니다\.", 503/);
  assert.doesNotMatch(apiSource, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("family invite join does not create a fake local group before cloud lookup", () => {
  assert.match(hookSource, /fetch\("\/api\/family-groups"/);
  assert.match(hookSource, /action: "join"/);
  assert.match(apiSource, /join_family_group_by_invite_code/);
  assert.match(apiSource, /family_group_full/);
  assert.doesNotMatch(hookSource, /name: "참여한 가족 냉장고"/);
  assert.doesNotMatch(hookSource, /id: uuidv4\(\),\n\s+name: "참여한 가족 냉장고"/);
});

test("family API binds authenticated requests to Supabase user identity", () => {
  assert.match(hookSource, /getSupabaseClient/);
  assert.match(hookSource, /auth\.getSession\(\)/);
  assert.match(hookSource, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(hookSource, /headers: await buildFamilyRequestHeaders\(\)/);
  assert.match(apiSource, /getAuthenticatedServerUser/);
  assert.match(apiSource, /isAnonymousSupabaseUser/);
  assert.match(apiSource, /getServerSupabaseAuthenticatedClient/);
  assert.match(apiSource, /create_family_group/);
  assert.match(apiSource, /join_family_group_by_invite_code/);
  assert.doesNotMatch(apiSource, /x-device-id/);
  assert.doesNotMatch(apiSource, /\.is\("user_id", null\)/);
});

test("family invite RPC requires permanent signed identity and max member count", () => {
  assert.match(signedSessionMigrationSource, /security definer/);
  assert.match(signedSessionMigrationSource, /permanent_user_required/);
  assert.match(signedSessionMigrationSource, /family_group_full/);
  assert.match(signedSessionMigrationSource, /family_group_access_denied/);
  assert.match(signedSessionMigrationSource, /acting_user_id uuid := \(select auth\.uid\(\)\)/);
  assert.match(signedSessionMigrationSource, /for update/);
  assert.match(
    signedSessionMigrationSource,
    /grant execute on function public\.join_family_group_by_invite_code\(text, text\) to authenticated/,
  );
  assert.match(
    signedSessionMigrationSource,
    /grant execute on function public\.get_family_group_members\(uuid\) to authenticated/,
  );
  assert.doesNotMatch(signedSessionMigrationSource, /grant execute[^;]+to anon/);
  assert.doesNotMatch(signedSessionMigrationSource, /acting_device_id/);
});

test("family fridge and shopping scopes are member-only additions", () => {
  assert.match(familyScopeMigrationSource, /add column if not exists family_group_id/);
  assert.match(familyScopeMigrationSource, /public\.ingredients/);
  assert.match(familyScopeMigrationSource, /public\.shopping_items/);
  assert.match(familyScopeMigrationSource, /from public\.family_members m/);
  assert.match(familyScopeMigrationSource, /m\.family_group_id = ingredients\.family_group_id/);
  assert.match(familyScopeMigrationSource, /m\.family_group_id = shopping_items\.family_group_id/);
  assert.match(familyScopeMigrationSource, /family_group_id is null/);
  assert.match(familyScopeMigrationSource, /family_group_id is not null/);
  assert.match(supabaseReleaseCheckSource, /20260527093000_add_family_scoped_fridge_shopping\.sql/);
  assert.match(supabaseReleaseCheckSource, /hasFamilyScopePolicyConstraint/);
  assert.match(supabaseReleaseCheckSource, /family fridge and shopping rows are member-scoped/);
});

test("family member RLS policies avoid recursive self reads", () => {
  assert.match(familyRlsRecursionMigrationSource, /create or replace function public\.is_current_family_member/);
  assert.match(familyRlsRecursionMigrationSource, /security definer/);
  assert.match(familyRlsRecursionMigrationSource, /public\.is_current_family_member\(family_members\.family_group_id\)/);
  assert.match(familyRlsRecursionMigrationSource, /public\.is_current_family_member\(ingredients\.family_group_id\)/);
  assert.match(familyRlsRecursionMigrationSource, /public\.is_current_family_member\(shopping_items\.family_group_id\)/);
  assert.match(supabaseReleaseCheckSource, /20260528010000_fix_family_member_rls_recursion\.sql/);
});

test("family recommendation UI uses scoped family ingredients", () => {
  assert.match(ingredientsHookSource, /scope\?: IngredientScope/);
  assert.match(ingredientsHookSource, /familyGroupId\?: string \| null/);
  assert.match(shoppingHookSource, /scope\?: ShoppingScope/);
  assert.match(shoppingHookSource, /familyGroupId\?: string \| null/);
  assert.match(familyPageSource, /scope: familyGroupId \? "family" : "personal"/);
  assert.match(familyPageSource, /filterPublicationApprovedRecipes\(CURATED_RECIPE_RECORDS\)/);
  assert.match(familyPageSource, /rankRecipeRecommendations\(/);
  assert.match(familyPageSource, /filterBeginnerHomeRecipes\(/);
  assert.match(familyPageSource, /\?scope=family#shopping-assistant/);
});

test("family UI never presents a local draft or failed sync as shared", () => {
  assert.match(hookSource, /FamilySyncState = "none" \| "syncing" \| "synced" \| "local_only" \| "failed"/);
  assert.match(hookSource, /현재 이 기기에만 저장되며 다른 가족 기기와 공유되지 않습니다/);
  assert.match(familyPageSource, /data-testid="family-sync-state"/);
  assert.match(familyPageSource, /가족과 동기화됨/);
  assert.match(familyPageSource, /동기화 실패 · 이 기기에만 저장/);
  assert.match(familyPageSource, /동기화되지 않은 초대코드는 다른 기기에서 사용할 수 없습니다/);
  assert.doesNotMatch(familyPageSource, /addLocalMember|removeMember/);
});

test("family realtime refresh is RLS scoped and server membership remains authoritative", () => {
  assert.match(apiSource, /export async function GET/);
  assert.match(apiSource, /get_family_group_members/);
  assert.match(apiSource, /family_activity_events/);
  assert.match(apiSource, /readBoundedJsonObject/);
  assert.match(apiSource, /consumeDistributedRateLimit/);
  assert.match(apiSource, /confirmGroupId !== groupId/);
  assert.match(hookSource, /postgres_changes/);
  assert.match(hookSource, /table: "family_activity_events"/);
  assert.match(hookSource, /table: "ingredients"/);
  assert.match(hookSource, /table: "shopping_items"/);
  assert.match(ingredientsHookSource, /jipbab:family-data-changed/);
  assert.match(shoppingHookSource, /jipbab:family-data-changed/);
  assert.match(realtimeMigrationSource, /create table if not exists public\.family_activity_events/);
  assert.match(realtimeMigrationSource, /public\.is_current_family_member\(family_group_id\)/);
  assert.match(realtimeMigrationSource, /create or replace function public\.leave_family_group/);
  assert.match(realtimeMigrationSource, /ownership_transfer_required/);
  assert.match(realtimeMigrationSource, /alter publication supabase_realtime add table public\.family_activity_events/);
  assert.match(realtimeMigrationSource, /replica identity full/);
  assert.doesNotMatch(realtimeRollbackSource, /drop table if exists|truncate|delete from/i);
  assert.match(familyPageSource, /실시간 연결됨/);
  assert.match(familyPageSource, /가족 활동/);
});

test("live Supabase check verifies family scoped fridge and shopping isolation", () => {
  assert.match(supabaseLiveCheckSource, /family ingredient member insert/);
  assert.match(supabaseLiveCheckSource, /family ingredient joiner read/);
  assert.match(supabaseLiveCheckSource, /family ingredient non-member isolation/);
  assert.match(supabaseLiveCheckSource, /family shopping member insert/);
  assert.match(supabaseLiveCheckSource, /family shopping joiner read/);
  assert.match(supabaseLiveCheckSource, /family shopping non-member isolation/);
});
