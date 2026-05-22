import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const scriptSource = readFileSync("scripts/print-release-unblock-runbook.mjs", "utf8");
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
  assert.match(runbook, /iPhone `영빈`/);
  assert.match(runbook, /Mac 로그인 암호/);
  assert.match(runbook, /Android 물리 기기/);
  assert.match(runbook, /com\.jipbab\.note/);
});

test("release unblock runbook includes the post-unblock verification commands", () => {
  assert.match(runbook, /pnpm check:real-device-availability/);
  assert.match(runbook, /pnpm release:capture-real-device-qa/);
  assert.match(runbook, /pnpm release:capture-operator-handoff/);
  assert.match(runbook, /pnpm release:security-check/);
  assert.match(runbook, /pnpm check:real-device-qa-evidence/);
  assert.match(runbook, /pnpm check:store-console-confirmation/);
  assert.match(runbook, /pnpm release:external-status/);
  assert.match(runbook, /pnpm release:goal-check/);
});

test("release unblock runbook prevents premature completion claims", () => {
  assert.match(runbook, /확인 전에는 `confirmed`로 바꾸지 않습니다/);
  assert.match(runbook, /Blocked: 0/);
  assert.match(runbook, /Missing: 0/);
  assert.match(runbook, /활성 goal을 완료 처리하지 않습니다/);
});
