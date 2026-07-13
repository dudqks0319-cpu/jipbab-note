import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/check-ios-cable-qa-evidence.mjs", "utf8");
const xcuitestSmokeSource = readFileSync("scripts/check-ios-xcuitest-smoke-evidence.mjs", "utf8");
const appStoreExternalStatus = readFileSync("scripts/check-appstore-external-status.mjs", "utf8");
const iosReleaseArtifactSource = readFileSync("scripts/check-ios-release-artifact.mjs", "utf8");
const iosProjectSource = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
const iosSchemeSource = readFileSync("ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme", "utf8");
const iosSmokeTestSource = readFileSync("ios/App/AppReleaseSmokeUITests/AppReleaseSmokeUITests.swift", "utf8");

test("iOS cable QA evidence check is wired into package scripts", () => {
  assert.equal(packageJson.scripts["check:ios-cable-qa"], "node scripts/check-ios-cable-qa-evidence.mjs");
  assert.equal(packageJson.scripts["check:ios-xcuitest-smoke"], "node scripts/check-ios-xcuitest-smoke-evidence.mjs");
});

test("iOS cable QA evidence check is part of App Store external status", () => {
  assert.match(appStoreExternalStatus, /iOS cable QA evidence/);
  assert.match(appStoreExternalStatus, /check-ios-cable-qa-evidence\.mjs/);
  assert.match(appStoreExternalStatus, /iOS XCUITest smoke evidence/);
  assert.match(appStoreExternalStatus, /check-ios-xcuitest-smoke-evidence\.mjs/);
});

test("iOS cable QA checkers resolve ignored evidence from the canonical repository", () => {
  assert.match(source, /resolveRepositoryRoot\(cwd\)/);
  assert.match(source, /path\.join\(repositoryRoot, "output", "release-evidence"\)/);
  assert.match(xcuitestSmokeSource, /resolveRepositoryRoot\(cwd\)/);
  assert.match(
    xcuitestSmokeSource,
    /path\.join\(\s*repositoryRoot,\s*"output\/release-evidence\/2026-06-25T09-30-ios-xcuitest-cable-smoke",?\s*\)/,
  );
});

test("iOS cable QA evidence check validates build identity and cable launch proof", () => {
  assert.match(source, /CURRENT_PROJECT_VERSION/);
  assert.match(source, /com\.jipbab\.note/);
  assert.match(source, /2026062602/);
  assert.match(source, /launch-home\.json/);
  assert.match(source, /launch-home\.log/);
  assert.match(source, /processes-after-launch\.txt/);
  assert.match(source, /App\.app\/App/);
  assert.match(source, /backlight is on and active/);
  assert.match(source, /no iPhone Mirroring used/);
});

test("iOS cable QA evidence check validates production image and API headers", () => {
  assert.match(source, /prod-root\.headers\.txt/);
  assert.match(source, /prod-api-recipes\.headers\.txt/);
  assert.match(source, /prod-fridge-image\.headers\.txt/);
  assert.match(source, /prod-beginner-030\.headers\.txt/);
  assert.match(source, /prod-beginner-053\.headers\.txt/);
  assert.match(source, /HTTP\/2 200/);
  assert.match(source, /content-type: image\/png/);
  assert.match(source, /x-matched-path/);
});

test("iOS cable QA evidence check does not claim tap-driven QA", () => {
  assert.match(source, /tap-driven OAuth/);
  assert.match(source, /notification permission UI/);
  assert.match(source, /shopping external link UI/);
  assert.match(source, /account deletion UI/);
  assert.match(source, /not covered by cable-only QA/);
});

test("iOS cable XCUITest target is wired for primary tab smoke", () => {
  assert.match(iosProjectSource, /AppReleaseSmokeUITests/);
  assert.match(iosProjectSource, /com\.apple\.product-type\.bundle\.ui-testing/);
  assert.match(iosSchemeSource, /AppReleaseSmokeUITests\.xctest/);
  assert.match(iosSmokeTestSource, /testAutomationModeProbe/);
  assert.match(iosSmokeTestSource, /testCableLaunchAndPrimaryTabs/);
  assert.match(iosSmokeTestSource, /01-home/);
  assert.match(iosSmokeTestSource, /02-fridge-tab/);
  assert.match(iosSmokeTestSource, /03-recipe-tab/);
  assert.match(iosSmokeTestSource, /04-shopping-tab/);
  assert.match(iosSmokeTestSource, /05-mypage-tab/);
});

test("iOS cable XCUITest target covers shopping handoff and notification preparation", () => {
  assert.match(iosSmokeTestSource, /testCoreLoopRecipeRecommendationToShoppingList/);
  assert.match(iosSmokeTestSource, /11-core-loop-home-recommendation/);
  assert.match(iosSmokeTestSource, /12-core-loop-recipe-shopping-assistant/);
  assert.match(iosSmokeTestSource, /13-core-loop-after-shopping-add/);
  assert.match(iosSmokeTestSource, /14-core-loop-shopping-list/);
  assert.match(iosSmokeTestSource, /장보기 리스트/);
  assert.match(iosSmokeTestSource, /testShoppingExternalLinkHandoff/);
  assert.match(iosSmokeTestSource, /06-shopping-before-external-link/);
  assert.match(iosSmokeTestSource, /07-shopping-external-link-safari/);
  assert.match(iosSmokeTestSource, /testNotificationPreparationFromSettings/);
  assert.match(iosSmokeTestSource, /08a-fridge-before-notification-seed/);
  assert.match(iosSmokeTestSource, /08c-fridge-notification-seed-expiry-selected/);
  assert.match(iosSmokeTestSource, /08b-fridge-after-notification-seed/);
  assert.match(iosSmokeTestSource, /09-notification-settings-before-schedule/);
  assert.match(iosSmokeTestSource, /10-notification-settings-after-schedule/);
  assert.match(iosSmokeTestSource, /\.\*\[1-9\]\[0-9\]\*개 알림을 준비\.\*/);
  assert.match(iosSmokeTestSource, /testAccountDeletionScreenProbe/);
  assert.match(iosSmokeTestSource, /19-account-deletion-screen/);
  assert.match(iosSmokeTestSource, /20-account-deletion-ready-not-submitted/);
  assert.match(iosSmokeTestSource, /계정 바로 삭제/);
  assert.doesNotMatch(iosSmokeTestSource, /tapButtonScrollingIfNeeded\(label: "계정 바로 삭제"/);
});

test("iOS release artifact check reads only the app target settings", () => {
  assert.match(iosReleaseArtifactSource, /resolveRepositoryRoot\(cwd\)/);
  assert.match(iosReleaseArtifactSource, /path\.join\(repositoryRoot, "ios\/build"\)/);
  assert.match(iosReleaseArtifactSource, /appTargetBuildConfigurationIds/);
  assert.match(iosReleaseArtifactSource, /PBXNativeTarget "App"/);
  assert.match(iosReleaseArtifactSource, /com\\.apple\\.product-type\\.application/);
});

test("iOS XCUITest smoke evidence check validates passed screenshots without widening full QA", () => {
  assert.match(xcuitestSmokeSource, /xcresult-primary-tabs-all-fixed-summary\.txt/);
  assert.match(xcuitestSmokeSource, /xcresult-core-loop-summary\.txt/);
  assert.match(xcuitestSmokeSource, /xcresult-shopping-link-summary\.txt/);
  assert.match(xcuitestSmokeSource, /xcresult-notification-settings-nonzero-fixed-summary\.txt/);
  assert.match(xcuitestSmokeSource, /primary-tabs-all-attachments\/manifest\.json/);
  assert.match(xcuitestSmokeSource, /core-loop-attachments\/manifest\.json/);
  assert.match(xcuitestSmokeSource, /shopping-link-attachments\/manifest\.json/);
  assert.match(xcuitestSmokeSource, /notification-settings-nonzero-fixed-attachments\/manifest\.json/);
  assert.match(xcuitestSmokeSource, /summary\.result === "Passed"/);
  assert.match(xcuitestSmokeSource, /01-home/);
  assert.match(xcuitestSmokeSource, /02-fridge-tab/);
  assert.match(xcuitestSmokeSource, /03-recipe-tab/);
  assert.match(xcuitestSmokeSource, /04-shopping-tab/);
  assert.match(xcuitestSmokeSource, /05-mypage-tab/);
  assert.match(xcuitestSmokeSource, /11-core-loop-home-recommendation/);
  assert.match(xcuitestSmokeSource, /14-core-loop-shopping-list/);
  assert.match(xcuitestSmokeSource, /06-shopping-before-external-link/);
  assert.match(xcuitestSmokeSource, /07-shopping-external-link-safari/);
  assert.match(xcuitestSmokeSource, /08a-fridge-before-notification-seed/);
  assert.match(xcuitestSmokeSource, /10-notification-settings-after-schedule/);
  assert.match(xcuitestSmokeSource, /OAuth completion/);
  assert.match(xcuitestSmokeSource, /account deletion/);
  assert.match(xcuitestSmokeSource, /not covered by the cable XCUITest smoke evidence/);
});
