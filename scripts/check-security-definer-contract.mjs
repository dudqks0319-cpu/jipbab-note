import { readFileSync } from "node:fs";

const paths = {
  accountDeletion: "supabase/migrations/20260530000000_cascade_user_deletion.sql",
  signedGuest: "supabase/migrations/20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
  recipeV2: "supabase/migrations/20260710150000_add_recipe_v2_schema_and_versioning.sql",
  rateLimit: "supabase/migrations/20260710160000_add_distributed_api_rate_limits.sql",
  hardening: "supabase/migrations/20260711113000_harden_security_definer_privileges.sql",
  rollback: "supabase/rollbacks/20260711113000_harden_security_definer_privileges.sql",
  appHelpers: "supabase/migrations/20260715120555_fix_app_helper_search_paths_20260715.sql",
  appHelpersRollback: "supabase/rollbacks/20260715120555_fix_app_helper_search_paths_20260715.sql",
};

const source = Object.fromEntries(
  Object.entries(paths).map(([key, filePath]) => [key, readFileSync(filePath, "utf8").toLowerCase()]),
);

const passes = [];
const failures = [];

function check(label, condition, detail) {
  (condition ? passes : failures).push({ label, detail });
}

function includesAll(value, fragments) {
  return fragments.every((fragment) => value.includes(fragment));
}

function functionBlock(value, qualifiedName) {
  const marker = `create or replace function ${qualifiedName}`;
  const start = value.indexOf(marker);
  if (start < 0) return "";
  const end = value.indexOf("$$;", start);
  return end < 0 ? value.slice(start) : value.slice(start, end + 3);
}

const accountDeletionBlock = functionBlock(source.accountDeletion, "public.handle_user_deletion");
check(
  "account deletion trigger body",
  includesAll(accountDeletionBlock, [
    "security definer",
    "update public.account_deletion_requests",
    "user_id = null",
    "email = null",
    "reason = null",
    "delete from public.ingredients",
    "delete from public.shopping_items",
  ]),
  "the trigger scrubs deletion-request PII and removes user-owned rows",
);

const permanentFamilyFunctions = [
  "public.is_current_family_member",
  "public.is_current_family_group_owner",
  "public.create_family_group",
  "public.join_family_group_by_invite_code",
  "public.get_family_group_members",
];
for (const functionName of permanentFamilyFunctions) {
  const block = functionBlock(source.signedGuest, functionName);
  check(
    `${functionName} signed identity`,
    block.includes("security definer") &&
      (block.includes("app.is_permanent_user()") || block.includes("public.is_current_family_member")),
    "the effective family definer requires a permanent signed user or member check",
  );
}

const serviceRoleFunctions = [
  [source.signedGuest, "public.merge_anonymous_user_data"],
  [source.recipeV2, "app.build_recipe_v2_snapshot"],
  [source.recipeV2, "public.capture_recipe_version"],
  [source.recipeV2, "public.restore_recipe_version"],
  [source.rateLimit, "public.consume_api_rate_limit"],
];
for (const [migrationSource, functionName] of serviceRoleFunctions) {
  const block = functionBlock(migrationSource, functionName);
  check(
    `${functionName} service role guard`,
    block.includes("security definer") && block.includes("auth.role()) <> 'service_role'"),
    "the server-only definer rejects non-service-role callers in its body",
  );
}

const hardeningRequirements = [
  "alter function public.handle_user_deletion()\nset search_path = pg_catalog, public, auth",
  "revoke all on function public.handle_user_deletion()\nfrom public, anon, authenticated, service_role",
  "drop function if exists public.family_group_member_count(uuid)",
  "alter function public.is_current_family_member(uuid)\nset search_path = pg_catalog, public, app, auth, pg_temp",
  "alter function public.is_current_family_group_owner(uuid)\nset search_path = pg_catalog, public, app, auth, pg_temp",
  "revoke all on function public.is_current_family_member(uuid)\nfrom public, anon, authenticated, service_role",
  "revoke all on function public.create_family_group(uuid, text, text, text)\nfrom public, anon, authenticated, service_role",
  "revoke all on function public.merge_anonymous_user_data(uuid, uuid)\nfrom public, anon, authenticated, service_role",
  "grant execute on function public.create_family_group(uuid, text, text, text) to authenticated",
  "grant execute on function public.join_family_group_by_invite_code(text, text) to authenticated",
  "grant execute on function public.get_family_group_members(uuid) to authenticated",
  "grant execute on function public.merge_anonymous_user_data(uuid, uuid) to service_role",
  "grant execute on function app.build_recipe_v2_snapshot(uuid) to service_role",
  "grant execute on function public.capture_recipe_version(uuid, integer, text, uuid) to service_role",
  "grant execute on function public.restore_recipe_version(uuid, integer, integer, text, uuid) to service_role",
  "grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role",
];
check(
  "effective definer privilege map",
  includesAll(source.hardening, hardeningRequirements),
  "the final migration fixes search paths and grants each definer only to its required role",
);

check(
  "no anonymous definer grants",
  !/grant\s+execute\s+on\s+function[\s\S]*?\s+to\s+(public|anon)\s*;/i.test(source.hardening),
  "the effective hardening migration grants no SECURITY DEFINER function to PUBLIC or anon",
);

check(
  "app helper search paths",
  includesAll(source.appHelpers, [
    "alter function app.current_device_id()\nset search_path = pg_catalog",
    "alter function app.is_permanent_user()\nset search_path = pg_catalog, auth",
    "revoke all on function app.current_device_id()\nfrom public, anon, authenticated, service_role",
    "revoke all on function app.is_permanent_user()\nfrom public, anon, authenticated, service_role",
    "grant execute on function app.is_permanent_user() to authenticated",
  ]),
  "SECURITY INVOKER helpers use trusted lookup paths and keep the existing minimum access map",
);

check(
  "app helper fail-closed rollback",
  includesAll(source.appHelpersRollback, [
    "alter function app.current_device_id()\nset search_path = pg_catalog",
    "alter function app.is_permanent_user()\nset search_path = pg_catalog, auth",
    "revoke all on function app.is_permanent_user()\nfrom public, anon, authenticated, service_role",
  ]) && !/\bgrant\s+execute\b|\bdrop\s+table\b|\btruncate\b/i.test(source.appHelpersRollback),
  "rollback preserves fixed lookup paths and disables helper execution without deleting data",
);

check(
  "fail-closed rollback",
  includesAll(source.rollback, [
    "revoke all on function public.create_family_group",
    "revoke all on function public.merge_anonymous_user_data",
    "revoke all on function public.consume_api_rate_limit",
    "revoke all on function public.handle_user_deletion",
  ]) &&
    !/\bgrant\s+execute\b|\bdrop\s+table\b|\btruncate\b/i.test(source.rollback),
  "rollback disables RPC execution without reopening privileges or deleting stored data",
);

console.log("SECURITY DEFINER contract check");
console.log(`Passes: ${passes.length}`);
console.log(`Failures: ${failures.length}`);

if (passes.length > 0) {
  console.log("\nPASS");
  for (const result of passes) console.log(`- ${result.label}: ${result.detail}`);
}

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const result of failures) console.log(`- ${result.label}: ${result.detail}`);
  process.exit(1);
}
