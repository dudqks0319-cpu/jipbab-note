// Checks that the rollback rehearsal is repeatable, isolated, and non-destructive.
import { existsSync, readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const capture = readFileSync("scripts/capture-phase-6-rollback-rehearsal.mjs", "utf8");
const documentation = readFileSync("docs/phase-6-rollback-rehearsal.md", "utf8");
const tests = readFileSync("tests/phase-6-rollback-rehearsal.test.ts", "utf8");
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");

const migrationNames = [
  "20260710130000_gate_recipe_publication.sql",
  "20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
  "20260710150000_add_recipe_v2_schema_and_versioning.sql",
  "20260710151000_seed_phase1_ingredient_catalog.sql",
  "20260710160000_add_distributed_api_rate_limits.sql",
  "20260711113000_harden_security_definer_privileges.sql",
];
const requiredPlanCommands = [
  '["install", "--offline", "--frozen-lockfile"]',
  '["mobile:sync:ios"]',
  '["lint"]',
  '["typecheck"]',
  '["test"]',
  '["test:integration"]',
  '["validate:recipes"]',
  '["test:content"]',
  '["build"]',
];
const checks = [];

function check(name, pass, detail) {
  checks.push({ name, pass, detail });
}

function includesAll(source, fragments) {
  return fragments.every((fragment) => source.includes(fragment));
}

check(
  "required rehearsal files",
  [
    "scripts/capture-phase-6-rollback-rehearsal.mjs",
    "docs/phase-6-rollback-rehearsal.md",
    "tests/phase-6-rollback-rehearsal.test.ts",
  ].every(existsSync),
  "capture, documentation, and regression tests are present",
);
check(
  "repeatable commands",
  packageJson.scripts?.["check:phase6-rollback"] ===
      "node scripts/check-phase-6-rollback-rehearsal.mjs" &&
    packageJson.scripts?.["capture:phase6-rollback"] ===
      "node scripts/capture-phase-6-rollback-rehearsal.mjs",
  "package scripts expose static verification and runtime evidence capture",
);
check(
  "explicit known-good target",
  includesAll(capture, [
    "target_ref_required_or_invalid",
    "target_url_required_or_invalid",
    'targetUrl.hostname.startsWith("jipbab-note-")',
    'targetUrl.hostname.endsWith(".vercel.app")',
    "rollback_target_matches_current_commit",
    '"merge-base", "--is-ancestor"',
  ]),
  "the commit and paired HTTPS app URL are explicit, and the commit is an earlier ancestor",
);
check(
  "isolated archive checkout",
  includesAll(capture, [
    '"archive", "--format=tar"',
    "mkdtempSync",
    "jipbab-note-rollback-",
    "rmSync(temporaryRoot",
  ]) && !/git[^\n]{0,80}(?:reset|checkout|worktree)/i.test(capture),
  "rehearsal uses a disposable archive without changing branches or worktrees",
);
check(
  "offline dependency replay",
  capture.includes('["install", "--offline", "--frozen-lockfile"]') &&
    capture.includes('["mobile:sync:ios"]'),
  "the known-good commit is installed offline and its ignored native config is regenerated",
);
check(
  "plan command coverage",
  includesAll(capture, requiredPlanCommands),
  "native sync, lint, typecheck, tests, integration, content, and production build are replayed",
);
check(
  "local HTTP smoke",
  includesAll(capture, [
    "127.0.0.1",
    "home_status_200",
    "recipe_status_200",
    "api_fail_closed_503",
    "api_dependency_code",
  ]),
  "the archived build is started locally and user plus fail-closed API surfaces are exercised",
);
check(
  "response privacy boundaries",
  includesAll(capture, [
    "api_no_store",
    "api_retry_after_present",
    "api_request_id_present",
    "api_sensitive_detail_absent",
    "minimalEnvironment",
  ]),
  "the rehearsal inherits no app secrets and verifies redacted failure responses",
);
check(
  "bounded evidence output",
  includesAll(capture, [
    "output_dir_must_be_under_output",
    "rollback-rehearsal.json",
    "rollback-rehearsal.md",
    "server-output.txt",
    "[redacted]",
  ]),
  "evidence stays under ignored output with bounded redacted logs",
);
check(
  "critical rollback pairs",
  migrationNames.every(
    (name) =>
      existsSync(`supabase/migrations/${name}`) &&
      existsSync(`supabase/rollbacks/${name}`) &&
      capture.includes(name),
  ),
  "every Phase 0/1/2 and security hardening migration has a rehearsal-visible rollback pair",
);
check(
  "non-destructive database boundary",
  includesAll(capture, [
    "forbiddenDatabaseStatements",
    "destructive_rollback_rejected",
    'live_execution: "blocked_external"',
  ]),
  "destructive SQL is rejected and live execution is not claimed without staging evidence",
);
check(
  "no external mutation",
  !/spawn(?:Sync)?\(\s*["'](?:vercel|supabase)["']/i.test(capture) &&
    includesAll(capture, [
      'vercel: { mutation: "not_executed" }',
      "never changes a Git branch, Vercel alias, or Supabase",
    ]),
  "capture does not invoke Vercel or Supabase mutation commands",
);
check(
  "release gate wiring",
  localGate.includes("scripts/check-phase-6-rollback-rehearsal.mjs") &&
    ciGate.includes("scripts/check-phase-6-rollback-rehearsal.mjs"),
  "local and CI-safe release gates enforce the rehearsal contract",
);
check(
  "documented truth boundary",
  includesAll(documentation, [
    "passed_local_code_rehearsal",
    "blocked_external",
    "운영 Vercel alias를 변경하지 않는다",
    "실제 staging PostgreSQL",
    "Owner `FullStackDev+DBA`",
    "before_any_supabase_db_push",
  ]),
  "documentation separates local code evidence from external Vercel and database recovery",
);
check(
  "negative regression coverage",
  includesAll(tests, [
    "prints help without running a rehearsal",
    "rejects a missing target without echoing environment values",
    "rejects a credentialed target URL without echoing it",
    "rejects a non-JipbabNote host",
    "static rollback rehearsal contract passes",
  ]),
  "help, target input privacy, and static contract boundaries have tests",
);

const failures = checks.filter((item) => !item.pass);
console.log("Phase 6 rollback rehearsal contract check");
console.log(`Contracts checked: ${checks.length}`);
console.log(`Failures: ${failures.length}`);
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} - ${item.name}: ${item.detail}`);
}
if (failures.length > 0) process.exit(1);
