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

test("family API binds authenticated requests to Supabase user identity", () => {
  assert.match(hookSource, /getSupabaseClient/);
  assert.match(hookSource, /auth\.getSession\(\)/);
  assert.match(hookSource, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(hookSource, /headers: await buildFamilyRequestHeaders\(\)/);
  assert.match(apiSource, /getAuthenticatedServerUser/);
  assert.match(apiSource, /isAnonymousSupabaseUser/);
  assert.match(apiSource, /owner_user_id: userId/);
  assert.match(apiSource, /user_id: userId/);
  assert.match(apiSource, /\.eq\("user_id", userId\)/);
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
  assert.match(familyPageSource, /scope: group \? "family" : "personal"/);
  assert.match(familyPageSource, /filterPublicationApprovedRecipes\(CURATED_RECIPE_RECORDS\)/);
  assert.match(familyPageSource, /rankRecipeRecommendations\(/);
  assert.match(familyPageSource, /filterBeginnerHomeRecipes\(/);
  assert.match(familyPageSource, /\?scope=family#shopping-assistant/);
});

test("live Supabase check verifies family scoped fridge and shopping isolation", () => {
  assert.match(supabaseLiveCheckSource, /family ingredient member insert/);
  assert.match(supabaseLiveCheckSource, /family ingredient joiner read/);
  assert.match(supabaseLiveCheckSource, /family ingredient non-member isolation/);
  assert.match(supabaseLiveCheckSource, /family shopping member insert/);
  assert.match(supabaseLiveCheckSource, /family shopping joiner read/);
  assert.match(supabaseLiveCheckSource, /family shopping non-member isolation/);
});
