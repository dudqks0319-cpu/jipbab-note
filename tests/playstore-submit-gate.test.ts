import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const playStoreGateSource = readFileSync("scripts/check-playstore-submit-readiness.mjs", "utf8");
const playStoreExternalSource = readFileSync("scripts/check-playstore-external-status.mjs", "utf8");
const appStoreGateSource = readFileSync("scripts/check-appstore-submit-readiness.mjs", "utf8");
const appStoreExternalSource = readFileSync("scripts/check-appstore-external-status.mjs", "utf8");
const androidArtifactSource = readFileSync("scripts/check-android-release-artifact.mjs", "utf8");

test("Play Store submission gates are wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:playstore-external-status"],
    "node scripts/check-playstore-external-status.mjs",
  );
  assert.equal(
    packageJson.scripts["release:playstore-submit-gate"],
    "node scripts/check-playstore-submit-readiness.mjs",
  );
});

test("Play Store submission gate checks Android release readiness without the full App Store goal gate", () => {
  assert.match(playStoreGateSource, /scripts\/check-core-loop-release\.mjs/);
  assert.match(playStoreGateSource, /scripts\/check-local-mode-release\.mjs/);
  assert.match(playStoreGateSource, /scripts\/release-readiness-check\.mjs/);
  assert.match(playStoreGateSource, /scripts\/check-supabase-release\.mjs/);
  assert.match(playStoreGateSource, /scripts\/check-store-assets\.mjs/);
  assert.match(playStoreGateSource, /scripts\/check-android-release-artifact\.mjs/);
  assert.match(playStoreGateSource, /scripts\/check-release-security\.mjs/);
  assert.match(playStoreGateSource, /scripts\/check-playstore-external-status\.mjs/);
  assert.match(playStoreGateSource, /This command does not submit to Google Play/);
  assert.match(playStoreGateSource, /does not validate App Store review readiness/);
  assert.doesNotMatch(playStoreGateSource, /scripts\/verify-goal-completion\.mjs/);
  assert.doesNotMatch(playStoreGateSource, /scripts\/check-ios-release-artifact\.mjs/);
});

test("Play Store external gate excludes iOS device and App Store Connect blockers", () => {
  assert.match(playStoreExternalSource, /scripts\/check-supabase-live\.mjs/);
  assert.match(playStoreExternalSource, /scripts\/check-supabase-storage-live\.mjs/);
  assert.match(playStoreExternalSource, /scripts\/check-real-device-availability\.mjs", "--platform=android"/);
  assert.match(playStoreExternalSource, /scripts\/check-real-device-qa-evidence\.mjs", "--platform=android"/);
  assert.match(playStoreExternalSource, /scripts\/check-store-console-confirmation\.mjs", "--platform=play"/);
  assert.match(playStoreExternalSource, /shared production blockers and Android\/Play Store blockers/);
  assert.match(playStoreExternalSource, /does not validate App Store readiness/);
  assert.doesNotMatch(playStoreExternalSource, /--platform=ios/);
  assert.doesNotMatch(playStoreExternalSource, /--platform=appstore/);
});

test("platform-specific submission gates stay separated", () => {
  assert.match(appStoreGateSource, /check-appstore-external-status/);
  assert.match(appStoreExternalSource, /--platform=ios/);
  assert.match(appStoreExternalSource, /--platform=appstore/);
  assert.match(playStoreGateSource, /check-playstore-external-status/);
  assert.match(playStoreExternalSource, /--platform=android/);
  assert.match(playStoreExternalSource, /--platform=play/);
});

test("compact remote-shell AABs are verified by structure and HTTPS runtime URL", () => {
  assert.match(androidArtifactSource, /compactRemoteShellEntries/);
  assert.match(androidArtifactSource, /base\/assets\/public\/runtime-app-config\.json/);
  assert.match(androidArtifactSource, /base\/dex\/classes\.dex/);
  assert.match(androidArtifactSource, /base\/manifest\/AndroidManifest\.xml/);
  assert.match(androidArtifactSource, /startsWith\("https:\/\/"\)/);
  assert.match(androidArtifactSource, /compact remote shell AAB/);
});
