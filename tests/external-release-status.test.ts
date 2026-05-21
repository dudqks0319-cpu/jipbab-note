import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/check-external-release-status.mjs", "utf8");

test("external status command is available as a non short-circuiting release helper", () => {
  assert.equal(packageJson.scripts["release:external-status"], "node scripts/check-external-release-status.mjs");
  assert.match(source, /const results = checks\.map\(runCheck\)/);
  assert.match(source, /External release is not complete/);
});

test("external status command includes every external release blocker surface", () => {
  assert.match(source, /scripts\/check-supabase-live\.mjs/);
  assert.match(source, /scripts\/check-oauth-live\.mjs/);
  assert.match(source, /scripts\/check-vercel-production-env\.mjs/);
  assert.match(source, /scripts\/check-production-family-route\.mjs/);
  assert.match(source, /scripts\/check-production-account-deletion-route\.mjs/);
  assert.match(source, /scripts\/check-real-device-availability\.mjs/);
  assert.match(source, /scripts\/check-real-device-qa-evidence\.mjs/);
  assert.match(source, /scripts\/check-store-console-confirmation\.mjs/);
});
