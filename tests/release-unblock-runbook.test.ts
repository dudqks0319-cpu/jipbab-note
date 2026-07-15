import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const scriptSource = readFileSync("scripts/print-release-unblock-runbook.mjs", "utf8");
const supabaseLiveUnblockSqlScript = readFileSync("scripts/print-supabase-live-unblock-sql.mjs", "utf8");
const supabaseLiveUnblockCheckScript = readFileSync("scripts/check-supabase-live-unblock.mjs", "utf8");
const runbook = readFileSync("docs/external-release-unblock-runbook.md", "utf8");

test("release unblock runbook command is available", () => {
  assert.equal(packageJson.scripts["release:unblock-runbook"], "node scripts/print-release-unblock-runbook.mjs");
  assert.match(scriptSource, /docs\/external-release-unblock-runbook\.md/);
  assert.match(scriptSource, /requiredTerms/);
});

test("release unblock runbook covers all remaining external blocker surfaces", () => {
  assert.match(runbook, /실기기 QA/);
  assert.match(runbook, /App Store Connect\/TestFlight/);
  assert.match(runbook, /Play Console 내부 테스트/);
  assert.match(runbook, /iPhone `\[redacted-device\]`/);
  assert.match(runbook, /Mac 로그인 암호/);
  assert.match(runbook, /Android 물리 기기/);
  assert.match(runbook, /com\.jipbab\.note/);
  assert.match(runbook, /20260714100000_add_recipe_feedback\.sql/);
  assert.match(runbook, /20260714110000_extend_recipe_feedback_completion_details\.sql/);
  assert.match(runbook, /20260715100000_add_recipe_serving_variants\.sql/);
  assert.match(runbook, /serving_variants/);
  assert.match(runbook, /POST \/api\/v1\/recipe-feedback/);
  assert.match(runbook, /POST \/api\/v1\/shopping\/items\/from-recipe/);
});

test("release unblock runbook includes the post-unblock verification commands", () => {
  assert.match(runbook, /pnpm release:supabase-live-unblock-sql/);
  assert.match(runbook, /pnpm release:supabase-live-unblock-check/);
  assert.match(runbook, /pnpm check:real-device-availability/);
  assert.match(runbook, /pnpm release:capture-real-device-qa/);
  assert.match(runbook, /pnpm release:capture-ios-real-device-qa/);
  assert.match(runbook, /pnpm release:capture-operator-handoff/);
  assert.match(runbook, /pnpm release:security-check/);
  assert.match(runbook, /pnpm check:real-device-qa-evidence/);
  assert.match(runbook, /pnpm release:store-api-credential-status/);
  assert.match(runbook, /pnpm check:store-console-confirmation/);
  assert.match(runbook, /pnpm release:capture-store-submission-packet/);
  assert.match(runbook, /pnpm release:capture-appstore-review-packet/);
  assert.match(runbook, /pnpm release:appstore-submit-gate/);
  assert.match(runbook, /pnpm release:playstore-submit-gate/);
  assert.match(runbook, /pnpm release:external-status/);
  assert.match(runbook, /pnpm release:goal-check/);
  assert.match(runbook, /pnpm release:submit-gate/);
});

test("release unblock runbook prevents premature completion claims", () => {
  assert.match(runbook, /확인 전에는 `confirmed`로 바꾸지 않습니다/);
  assert.match(runbook, /Blocked: 0/);
  assert.match(runbook, /Missing: 0/);
  assert.match(runbook, /활성 goal을 완료 처리하거나/);
  assert.match(runbook, /스토어 심사 제출을 진행하지 않습니다/);
});

test("Supabase live unblock SQL bundle command is available and complete", () => {
  assert.equal(
    packageJson.scripts["release:supabase-live-unblock-sql"],
    "node scripts/print-supabase-live-unblock-sql.mjs",
  );
  assert.equal(
    packageJson.scripts["release:supabase-live-unblock-check"],
    "node scripts/check-supabase-live-unblock.mjs",
  );
  assert.match(supabaseLiveUnblockSqlScript, /20260710130000_gate_recipe_publication\.sql/);
  assert.match(supabaseLiveUnblockSqlScript, /20260710140000_replace_device_guest_auth_with_signed_sessions\.sql/);
  assert.match(supabaseLiveUnblockSqlScript, /SUPABASE_MIGRATION_HISTORY_RECONCILED/);
  assert.match(supabaseLiveUnblockSqlScript, /SUPABASE_BACKUP_VERIFIED/);
  assert.match(supabaseLiveUnblockSqlScript, /pnpm release:supabase-live-unblock-check/);
  assert.match(supabaseLiveUnblockSqlScript, /pnpm check:supabase-storage-live/);
  assert.match(supabaseLiveUnblockCheckScript, /20260710130000_gate_recipe_publication\.sql/);
  assert.match(supabaseLiveUnblockCheckScript, /20260710140000_replace_device_guest_auth_with_signed_sessions\.sql/);
  assert.match(supabaseLiveUnblockCheckScript, /scripts\/check-supabase-release\.mjs/);
  assert.match(supabaseLiveUnblockCheckScript, /scripts\/check-supabase-live\.mjs/);
  assert.match(supabaseLiveUnblockCheckScript, /scripts\/check-supabase-storage-live\.mjs/);
  assert.match(supabaseLiveUnblockCheckScript, /SUPABASE_LIVE_WRITE_TEST/);
  assert.match(supabaseLiveUnblockCheckScript, /pnpm release:external-status/);

  assert.throws(() => execFileSync("node", ["scripts/print-supabase-live-unblock-sql.mjs"], {
    encoding: "utf8",
    stdio: "pipe",
  }));

  const output = execFileSync("node", ["scripts/print-supabase-live-unblock-sql.mjs"], {
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_MIGRATION_HISTORY_RECONCILED: "1",
      SUPABASE_BACKUP_VERIFIED: "1",
    },
  });

  assert.match(output, /BEGIN supabase\/migrations\/20260710130000_gate_recipe_publication\.sql/);
  assert.match(output, /BEGIN supabase\/migrations\/20260710140000_replace_device_guest_auth_with_signed_sessions\.sql/);
  assert.match(output, /review_status = 'approved'/);
  assert.match(output, /merge_anonymous_user_data/);
  assert.match(output, /SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live/);
});
