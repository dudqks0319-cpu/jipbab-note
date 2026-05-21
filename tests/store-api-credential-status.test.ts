import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const statusSource = readFileSync("scripts/check-store-api-credential-status.mjs", "utf8");
const captureSource = readFileSync("scripts/capture-store-console-confirmation-packet.mjs", "utf8");
const runbook = readFileSync("docs/store-api-credentials-runbook.md", "utf8");
const evidence = readFileSync("docs/store-console-confirmation.md", "utf8");

test("store API credential status command is available", () => {
  assert.equal(
    packageJson.scripts["release:store-api-credential-status"],
    "node scripts/check-store-api-credential-status.mjs",
  );
});

test("store API credential status checks env names without printing values", () => {
  assert.match(statusSource, /APP_STORE_CONNECT_API_KEY_ID/);
  assert.match(statusSource, /APP_STORE_CONNECT_API_ISSUER_ID/);
  assert.match(statusSource, /APP_STORE_CONNECT_API_PRIVATE_KEY_PATH/);
  assert.match(statusSource, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(statusSource, /GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
  assert.match(statusSource, /Ready:/);
  assert.match(statusSource, /Blocked:/);
  assert.match(statusSource, /Security failures:/);
  assert.doesNotMatch(statusSource, /console\.log\([^)]*envValue/);
  assert.doesNotMatch(statusSource, /console\.log\([^)]*readFileSync/);
});

test("store API credential status verifies ignored secret files and restricted permissions", () => {
  assert.match(statusSource, /check-ignore/);
  assert.match(statusSource, /private key path is ignored by git/);
  assert.match(statusSource, /service account path is ignored by git/);
  assert.match(statusSource, /file mode is restricted/);
  assert.match(statusSource, /0o077/);
  assert.ok(statusSource.includes(".release-secrets/[redacted-file]"));
});

test("store API credential status warns when local p8 files are not wired for ASC API", () => {
  assert.ok(statusSource.includes("local .p8 file"));
  assert.match(statusSource, /not wired as App Store Connect API credentials/);
  assert.match(statusSource, /Users and Access/);
});

test("store console packet includes store API credential status output", () => {
  assert.match(captureSource, /scripts\/check-store-api-credential-status\.mjs/);
  assert.match(captureSource, /store-api-credential-status\.txt/);
  assert.match(captureSource, /Store API credential status command/);
  assert.match(captureSource, /release:store-api-credential-status/);
});

test("store API runbook and store console docs mention credential status preflight", () => {
  assert.match(runbook, /pnpm release:store-api-credential-status/);
  assert.match(runbook, /private key path is not ignored by git/);
  assert.match(runbook, /service account path is not ignored by git/);
  assert.match(evidence, /pnpm release:store-api-credential-status/);
});
