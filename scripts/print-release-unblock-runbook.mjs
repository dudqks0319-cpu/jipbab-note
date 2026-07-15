import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// 외부 출시 차단을 푼 직후 운영자가 실행할 절차를 한 곳에서 출력합니다.
const cwd = process.cwd();
const runbookPath = path.join(cwd, "docs/external-release-unblock-runbook.md");

const requiredTerms = [
  "pnpm check:real-device-availability",
  "pnpm release:capture-real-device-qa",
  "pnpm release:capture-ios-real-device-qa",
  "pnpm release:capture-operator-handoff",
  "pnpm release:security-check",
  "pnpm check:real-device-qa-evidence",
  "pnpm release:store-api-credential-status",
  "pnpm check:store-console-confirmation",
  "pnpm release:capture-store-submission-packet",
  "pnpm release:capture-appstore-review-packet",
  "pnpm release:appstore-submit-gate",
  "pnpm release:playstore-submit-gate",
  "pnpm release:external-status",
  "pnpm release:goal-check",
  "pnpm release:submit-gate",
  "SUPABASE_MIGRATION_HISTORY_RECONCILED=1",
  "SUPABASE_BACKUP_VERIFIED=1",
  "20260710130000_gate_recipe_publication.sql",
  "20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
  "20260710150000_add_recipe_v2_schema_and_versioning.sql",
  "20260710151000_seed_phase1_ingredient_catalog.sql",
  "20260710160000_add_distributed_api_rate_limits.sql",
  "20260714100000_add_recipe_feedback.sql",
  "20260714110000_extend_recipe_feedback_completion_details.sql",
  "20260715100000_add_recipe_serving_variants.sql",
  "20260715110000_add_recipe_progress.sql",
  "serving_variants",
  "POST /api/v1/recipe-feedback",
  "POST /api/v1/recipe-progress",
  "POST /api/v1/shopping/items/from-recipe",
  "iPhone `[redacted-device]`",
  "App Store Connect/TestFlight: confirmed",
  "Play Console internal testing: confirmed",
  "com.jipbab.note",
  "Blocked: 0",
  "Missing: 0",
];

if (!existsSync(runbookPath)) {
  console.error("Release unblock runbook check");
  console.error("Status: fail");
  console.error(`- missing ${path.relative(cwd, runbookPath)}`);
  process.exit(1);
}

const runbook = readFileSync(runbookPath, "utf8");
const missing = requiredTerms.filter((term) => !runbook.includes(term));

console.log(runbook.trim());

if (missing.length > 0) {
  console.error("");
  console.error("Release unblock runbook check");
  console.error("Status: fail");
  for (const term of missing) {
    console.error(`- missing required term: ${term}`);
  }
  process.exit(1);
}

console.log("");
console.log("Release unblock runbook check");
console.log("Status: pass");
console.log(`Required terms: ${requiredTerms.length}`);
