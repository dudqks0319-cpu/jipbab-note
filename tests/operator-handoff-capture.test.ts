import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/capture-release-operator-handoff.mjs", "utf8");
const readinessChecklist = readFileSync("docs/release-readiness-checklist.md", "utf8");

test("operator handoff capture command is wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:capture-operator-handoff"],
    "node scripts/capture-release-operator-handoff.mjs",
  );
});

test("operator handoff capture combines all external blocker packets", () => {
  assert.match(source, /scripts\/capture-external-release-evidence\.mjs/);
  assert.match(source, /scripts\/capture-real-device-qa-packet\.mjs/);
  assert.match(source, /scripts\/capture-store-console-confirmation-packet\.mjs/);
  assert.match(source, /scripts\/check-store-api-credential-status\.mjs/);
  assert.match(source, /scripts\/check-release-security\.mjs/);
  assert.match(source, /scripts\/check-appstore-submit-readiness\.mjs/);
  assert.match(source, /scripts\/check-playstore-submit-readiness\.mjs/);
  assert.match(source, /scripts\/verify-goal-completion\.mjs/);
  assert.match(source, /operator-handoff\.md/);
  assert.match(source, /Release Operator Handoff/);
  assert.match(source, /successStatus: "captured"/);
  assert.match(source, /successStatus: "checked"/);
  assert.match(source, /Captured packets/);
  assert.match(source, /Checked commands/);
  assert.match(source, /Passed gates/);
  assert.match(source, /Remaining External Actions/);
  assert.match(source, /Final Verification After Unblock/);
  assert.match(source, /pnpm release:security-check/);
  assert.match(source, /pnpm release:store-api-credential-status/);
  assert.match(source, /pnpm release:appstore-submit-gate/);
  assert.match(source, /pnpm release:playstore-submit-gate/);
  assert.match(source, /pnpm release:submit-gate/);
});

test("operator handoff capture keeps secret-bearing values redacted", () => {
  assert.match(source, /redacted-private-key/);
  assert.match(source, /redacted-jwt/);
  assert.match(source, /redacted-api-key/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
  assert.match(source, /GOOGLE_APPLICATION_CREDENTIALS/);
});

test("release checklist points operators to the handoff packet", () => {
  assert.match(readinessChecklist, /pnpm release:capture-operator-handoff/);
  assert.match(readinessChecklist, /operator handoff/);
});
