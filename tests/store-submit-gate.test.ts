import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/check-store-submit-readiness.mjs", "utf8");

test("store submission gate is wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:submit-gate"],
    "node scripts/check-store-submit-readiness.mjs",
  );
});

test("store submission gate aggregates every pre-submit release gate", () => {
  assert.match(source, /scripts\/run-release-gates\.mjs/);
  assert.match(source, /scripts\/check-release-security\.mjs/);
  assert.match(source, /scripts\/check-external-release-status\.mjs/);
  assert.match(source, /scripts\/verify-goal-completion\.mjs/);
  assert.match(source, /SUPABASE_LIVE_WRITE_TEST/);
});

test("store submission gate refuses to submit when any gate is blocked", () => {
  assert.match(source, /This command does not submit to App Store Connect or Google Play/);
  assert.match(source, /Store submission is blocked/);
  assert.match(source, /Do not submit this build to App Store review or Play production/);
  assert.match(source, /process\.exit\(1\)/);
});
