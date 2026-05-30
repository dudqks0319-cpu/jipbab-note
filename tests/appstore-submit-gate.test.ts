import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const appStoreGateSource = readFileSync("scripts/check-appstore-submit-readiness.mjs", "utf8");
const appStoreExternalSource = readFileSync("scripts/check-appstore-external-status.mjs", "utf8");
const releaseReadinessSource = readFileSync("scripts/release-readiness-check.mjs", "utf8");
const iosProjectSource = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
const iosInfoPlistSource = readFileSync("ios/App/App/Info.plist", "utf8");
const iosAppIconSource = readFileSync(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json",
  "utf8",
);
const realDeviceAvailabilitySource = readFileSync("scripts/check-real-device-availability.mjs", "utf8");
const realDeviceEvidenceSource = readFileSync("scripts/check-real-device-qa-evidence.mjs", "utf8");
const storeConsoleSource = readFileSync("scripts/check-store-console-confirmation.mjs", "utf8");

test("App Store submission gates are wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:appstore-external-status"],
    "node scripts/check-appstore-external-status.mjs",
  );
  assert.equal(
    packageJson.scripts["release:appstore-submit-gate"],
    "node scripts/check-appstore-submit-readiness.mjs",
  );
});

test("App Store submission gate checks iOS release readiness without the full Play goal gate", () => {
  assert.match(appStoreGateSource, /scripts\/check-core-loop-release\.mjs/);
  assert.match(appStoreGateSource, /scripts\/check-local-mode-release\.mjs/);
  assert.match(appStoreGateSource, /scripts\/release-readiness-check\.mjs", "--platform=appstore"/);
  assert.match(appStoreGateSource, /scripts\/check-supabase-release\.mjs/);
  assert.match(appStoreGateSource, /scripts\/check-store-assets\.mjs/);
  assert.match(appStoreGateSource, /scripts\/check-ios-release-artifact\.mjs/);
  assert.match(appStoreGateSource, /scripts\/check-release-security\.mjs/);
  assert.match(appStoreGateSource, /scripts\/check-appstore-external-status\.mjs/);
  assert.match(appStoreGateSource, /This command does not submit to App Store Connect/);
  assert.match(appStoreGateSource, /does not validate Google Play production or internal testing readiness/);
  assert.doesNotMatch(appStoreGateSource, /scripts\/verify-goal-completion\.mjs/);
  assert.doesNotMatch(appStoreGateSource, /scripts\/check-android-release-artifact\.mjs/);
});

test("App Store release readiness scope excludes Play-only native checks", () => {
  assert.match(releaseReadinessSource, /releasePlatformAliases/);
  assert.match(releaseReadinessSource, /const checksAppStore = releasePlatform === "all" \|\| releasePlatform === "appstore"/);
  assert.match(releaseReadinessSource, /const checksPlayStore = releasePlatform === "all" \|\| releasePlatform === "playstore"/);
  assert.match(releaseReadinessSource, /if \(checksPlayStore\) \{/);
  assert.match(releaseReadinessSource, /Android upload signing/);
  assert.match(releaseReadinessSource, /if \(checksAppStore && existsSync\(iosCapacitorConfigPath\)\)/);
});

test("App Store release target stays iPhone-only until iPad QA is complete", () => {
  assert.match(releaseReadinessSource, /iOS targeted device family/);
  assert.match(releaseReadinessSource, /iOS app icon catalog/);
  assert.match(releaseReadinessSource, /iPhone-only release target is configured/);
  assert.match(releaseReadinessSource, /no iPad-only orientation override/);
  assert.match(releaseReadinessSource, /iPad screenshots and real-device QA/);
  assert.match(releaseReadinessSource, /iPad icon slots until iPad QA is complete/);
  assert.doesNotMatch(iosProjectSource, /TARGETED_DEVICE_FAMILY = "1,2"/);
  assert.match(iosProjectSource, /TARGETED_DEVICE_FAMILY = 1;/);
  assert.doesNotMatch(iosInfoPlistSource, /UISupportedInterfaceOrientations~ipad/);
  assert.doesNotMatch(iosAppIconSource, /"idiom" : "ipad"/);
  assert.match(iosAppIconSource, /"idiom" : "ios-marketing"/);
  assert.equal(
    existsSync("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-76@1x.png"),
    false,
  );
  assert.equal(
    existsSync("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-76@2x.png"),
    false,
  );
  assert.equal(
    existsSync("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-83.5@2x.png"),
    false,
  );
});

test("App Store external gate excludes Android device and Play Console blockers", () => {
  assert.match(appStoreExternalSource, /scripts\/check-real-device-availability\.mjs", "--platform=ios"/);
  assert.match(appStoreExternalSource, /scripts\/check-real-device-qa-evidence\.mjs", "--platform=ios"/);
  assert.match(appStoreExternalSource, /scripts\/check-store-console-confirmation\.mjs", "--platform=appstore"/);
  assert.match(appStoreExternalSource, /does not validate Play Console readiness/);
  assert.doesNotMatch(appStoreExternalSource, /--platform=android/);
  assert.doesNotMatch(appStoreExternalSource, /--platform=play/);
});

test("real-device and store-console checkers support platform filters", () => {
  assert.match(realDeviceAvailabilitySource, /--platform=ios/);
  assert.match(realDeviceAvailabilitySource, /REAL_DEVICE_PLATFORM/);
  assert.match(realDeviceEvidenceSource, /--platform=ios/);
  assert.match(realDeviceEvidenceSource, /platform: "ios"/);
  assert.match(storeConsoleSource, /--platform=appstore/);
  assert.match(storeConsoleSource, /STORE_CONSOLE_PLATFORM/);
  assert.match(storeConsoleSource, /platform: "appstore"/);
  assert.match(storeConsoleSource, /platform: "play"/);
});
