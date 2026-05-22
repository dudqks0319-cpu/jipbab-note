import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const scriptSource = readFileSync("scripts/print-store-api-credentials-runbook.mjs", "utf8");
const runbook = readFileSync("docs/store-api-credentials-runbook.md", "utf8");
const confirmationDoc = readFileSync("docs/store-console-confirmation.md", "utf8");
const unblockRunbook = readFileSync("docs/external-release-unblock-runbook.md", "utf8");

test("store API credentials runbook command is available", () => {
  assert.equal(
    packageJson.scripts["release:store-api-runbook"],
    "node scripts/print-store-api-credentials-runbook.mjs",
  );
  assert.match(scriptSource, /docs\/store-api-credentials-runbook\.md/);
  assert.match(scriptSource, /requiredTerms/);
});

test("store API credentials runbook covers App Store Connect API env", () => {
  assert.match(runbook, /APP_STORE_CONNECT_API_KEY_ID/);
  assert.match(runbook, /APP_STORE_CONNECT_API_ISSUER_ID/);
  assert.match(runbook, /APP_STORE_CONNECT_API_PRIVATE_KEY_PATH/);
  assert.match(runbook, /APP_STORE_CONNECT_BUNDLE_ID=com\.jipbab\.note/);
  assert.match(runbook, /APP_STORE_CONNECT_BUILD_VERSION=2026052001/);
  assert.match(runbook, /AuthKey_<KEY_ID>\.p8/);
  assert.match(runbook, /\.env\.store-api\.local/);
});

test("store API credentials runbook covers Google Play API env", () => {
  assert.match(runbook, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(runbook, /GOOGLE_PLAY_PACKAGE_NAME=com\.jipbab\.note/);
  assert.match(runbook, /GOOGLE_PLAY_VERSION_CODE=1/);
  assert.match(runbook, /GOOGLE_PLAY_TRACK=internal/);
  assert.match(runbook, /google-play-service-account\.json/);
});

test("store API credentials runbook keeps credentials out of git", () => {
  assert.match(runbook, /\.release-secrets\//);
  assert.match(runbook, /chmod 600/);
  assert.match(runbook, /커밋하지 않습니다/);
  assert.match(runbook, /git check-ignore -v/);
  assert.match(runbook, /\.env\.store-api\.local/);
  assert.match(runbook, /credential 값은 출력하지 않습니다/);
});

test("store console docs point to the credential runbook", () => {
  assert.match(confirmationDoc, /store-api-credentials-runbook\.md/);
  assert.match(unblockRunbook, /store-api-credentials-runbook\.md/);
});
