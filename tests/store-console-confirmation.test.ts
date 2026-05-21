import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const checkSource = readFileSync("scripts/check-store-console-confirmation.mjs", "utf8");
const captureSource = readFileSync("scripts/capture-store-console-confirmation-packet.mjs", "utf8");
const evidence = readFileSync("docs/store-console-confirmation.md", "utf8");

test("external release check includes store console confirmation", () => {
  assert.equal(
    packageJson.scripts["check:store-console-confirmation"],
    "node scripts/check-store-console-confirmation.mjs",
  );
  assert.match(packageJson.scripts["release:external-check"], /check:store-console-confirmation/);
  assert.equal(
    packageJson.scripts["release:capture-store-console"],
    "node scripts/capture-store-console-confirmation-packet.mjs",
  );
});

test("store console confirmation requires both app store and play console evidence", () => {
  assert.match(checkSource, /App Store Connect\/TestFlight: confirmed/);
  assert.match(checkSource, /TestFlight processing: confirmed/);
  assert.match(checkSource, /Internal tester availability: confirmed/);
  assert.match(checkSource, /Play Console internal testing: confirmed/);
  assert.match(checkSource, /AAB upload: confirmed/);
  assert.match(checkSource, /Internal testing track: confirmed/);
  assert.match(checkSource, /App Store Connect evidence date: YYYY-MM-DD/);
  assert.match(checkSource, /App Store Connect evidence artifacts/);
  assert.match(checkSource, /Play Console evidence date: YYYY-MM-DD/);
  assert.match(checkSource, /Play Console evidence artifacts/);
  assert.match(checkSource, /existing local path or URL/);
  assert.match(checkSource, /existsSync\(artifactPath\)/);
});

test("store console confirmation reports missing optional store API credentials without values", () => {
  assert.match(checkSource, /APP_STORE_CONNECT_API_KEY_ID/);
  assert.match(checkSource, /APP_STORE_CONNECT_API_ISSUER_ID/);
  assert.match(checkSource, /APP_STORE_CONNECT_API_PRIVATE_KEY_PATH/);
  assert.match(checkSource, /GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
  assert.match(checkSource, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(checkSource, /Browser confirmation is still required/);
  assert.match(checkSource, /value\.trim\(\)\.length > 0/);
  assert.doesNotMatch(checkSource, /process\.env\[[^\]]+\]\s*\)/);
});

test("store console confirmation can verify store dashboards through official APIs", () => {
  assert.match(checkSource, /https:\/\/api\.appstoreconnect\.apple\.com/);
  assert.match(checkSource, /appstoreconnect-v1/);
  assert.match(checkSource, /\/v1\/apps/);
  assert.match(checkSource, /\/builds/);
  assert.match(checkSource, /\/betaGroups/);
  assert.match(checkSource, /https:\/\/oauth2\.googleapis\.com\/token/);
  assert.match(checkSource, /https:\/\/www\.googleapis\.com\/auth\/androidpublisher/);
  assert.match(checkSource, /\/edits/);
  assert.match(checkSource, /\/tracks/);
  assert.match(checkSource, /GOOGLE_PLAY_VERSION_CODE/);
  assert.match(checkSource, /GOOGLE_PLAY_TRACK/);
});

test("store console confirmation evidence stays blocked until manually confirmed", () => {
  assert.match(evidence, /App Store Connect\/TestFlight: not confirmed/);
  assert.match(evidence, /TestFlight processing: not confirmed/);
  assert.match(evidence, /Play Console internal testing: not confirmed/);
  assert.match(evidence, /AAB upload: not confirmed/);
  assert.match(evidence, /App Store Connect evidence artifacts: pending/);
  assert.match(evidence, /Play Console evidence artifacts: pending/);
});

test("store console confirmation packet captures checker output and manual templates", () => {
  assert.match(captureSource, /output", "release-evidence"/);
  assert.match(captureSource, /Store Console Confirmation Packet/);
  assert.match(captureSource, /scripts\/check-store-console-confirmation\.mjs/);
  assert.match(captureSource, /store-console-confirmation\.txt/);
  assert.match(captureSource, /operator-checklist\.md/);
  assert.match(captureSource, /manual-store-console-template\.md/);
  assert.match(captureSource, /App Store Connect\/TestFlight: confirmed/);
  assert.match(captureSource, /Play Console internal testing: confirmed/);
  assert.match(captureSource, /App Store Connect evidence artifacts/);
  assert.match(captureSource, /Play Console evidence artifacts/);
  assert.match(captureSource, /redacted-private-key/);
  assert.match(evidence, /pnpm release:capture-store-console/);
});
