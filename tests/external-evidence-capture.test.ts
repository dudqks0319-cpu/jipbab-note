import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/capture-external-release-evidence.mjs", "utf8");

test("external evidence capture command is wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:capture-external-evidence"],
    "node scripts/capture-external-release-evidence.mjs",
  );
});

test("external evidence capture stores release evidence under ignored output directory", () => {
  assert.match(source, /"output", "release-evidence"/);
  assert.match(source, /summary\.md/);
  assert.match(source, /External Release Evidence Capture/);
  assert.match(source, /not store-release approval/);
});

test("external evidence capture records current external and device blocker outputs", () => {
  assert.match(source, /scripts\/check-external-release-status\.mjs/);
  assert.match(source, /scripts\/check-real-device-availability\.mjs/);
  assert.match(source, /scripts\/check-real-device-qa-evidence\.mjs/);
  assert.match(source, /scripts\/check-store-console-confirmation\.mjs/);
  assert.match(source, /"xcrun"/);
  assert.match(source, /"devicectl", "list", "devices"/);
  assert.match(source, /"xctrace", "list", "devices"/);
  assert.match(source, /\["devices", "-l"\]/);
});

test("external evidence capture redacts likely secret values", () => {
  assert.match(source, /redacted-private-key/);
  assert.match(source, /redacted-jwt/);
  assert.match(source, /redacted-api-key/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
});
