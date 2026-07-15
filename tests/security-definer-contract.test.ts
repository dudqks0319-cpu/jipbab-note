import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const securityGate = readFileSync("scripts/check-release-security.mjs", "utf8");
const hardening = readFileSync(
  "supabase/migrations/20260711113000_harden_security_definer_privileges.sql",
  "utf8",
);
const rollback = readFileSync(
  "supabase/rollbacks/20260711113000_harden_security_definer_privileges.sql",
  "utf8",
);
const appHelperHardening = readFileSync(
  "supabase/migrations/20260715120555_fix_app_helper_search_paths_20260715.sql",
  "utf8",
);
const appHelperRollback = readFileSync(
  "supabase/rollbacks/20260715120555_fix_app_helper_search_paths_20260715.sql",
  "utf8",
);

test("SECURITY DEFINER contract is wired into the release security gate", () => {
  assert.equal(
    packageJson.scripts["check:security-definer"],
    "node scripts/check-security-definer-contract.mjs",
  );
  assert.match(securityGate, /scripts\/check-security-definer-contract\.mjs/);
  assert.match(securityGate, /SECURITY DEFINER contract/);
});

test("account deletion trigger is direct-call denied with a fixed search path", () => {
  assert.match(
    hardening,
    /alter function public\.handle_user_deletion\(\)\s+set search_path = pg_catalog, public, auth/,
  );
  assert.match(
    hardening,
    /revoke all on function public\.handle_user_deletion\(\)\s+from public, anon, authenticated, service_role/,
  );
});

test("unused family count definer is removed and app roles are least privilege", () => {
  assert.match(hardening, /drop function if exists public\.family_group_member_count\(uuid\)/);
  assert.doesNotMatch(hardening, /grant execute[^;]+to (?:public|anon)/i);
  assert.match(hardening, /create_family_group[^;]+to authenticated/i);
  assert.match(hardening, /merge_anonymous_user_data[^;]+to service_role/i);
});

test("rollback fails closed without destructive data changes", () => {
  assert.doesNotMatch(rollback, /\bgrant execute\b/i);
  assert.doesNotMatch(rollback, /\bdrop table\b|\btruncate\b/i);
  assert.match(rollback, /revoke all on function public\.consume_api_rate_limit/);
  assert.match(rollback, /revoke all on function public\.handle_user_deletion/);
});

test("app helper functions use fixed search paths and preserve least privilege", () => {
  assert.match(
    appHelperHardening,
    /alter function app\.current_device_id\(\)\s+set search_path = pg_catalog/,
  );
  assert.match(
    appHelperHardening,
    /alter function app\.is_permanent_user\(\)\s+set search_path = pg_catalog, auth/,
  );
  assert.match(
    appHelperHardening,
    /revoke all on function app\.current_device_id\(\)\s+from public, anon, authenticated, service_role/,
  );
  assert.match(
    appHelperHardening,
    /grant execute on function app\.is_permanent_user\(\) to authenticated/,
  );
  assert.doesNotMatch(appHelperHardening, /grant execute[^;]+to (?:public|anon)/i);
});

test("app helper rollback keeps the hardened lookup path and fails closed", () => {
  assert.match(appHelperRollback, /set search_path = pg_catalog, auth/);
  assert.match(appHelperRollback, /revoke all on function app\.is_permanent_user/);
  assert.doesNotMatch(appHelperRollback, /\bgrant execute\b|\bdrop table\b|\btruncate\b/i);
});
