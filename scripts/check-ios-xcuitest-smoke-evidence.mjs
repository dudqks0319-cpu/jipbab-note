import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveRepositoryRoot } from "./lib/release-evidence-reference.mjs";

const cwd = process.cwd();
const repositoryRoot = resolveRepositoryRoot(cwd);
const evidenceDir = path.join(
  repositoryRoot,
  "output/release-evidence/2026-06-25T09-30-ios-xcuitest-cable-smoke",
);
const requiredFiles = [
  "summary.md",
  "xcresult-primary-tabs-all-fixed-summary.txt",
  "xcresult-core-loop-summary.txt",
  "xcresult-shopping-link-summary.txt",
  "xcresult-notification-settings-nonzero-fixed-summary.txt",
  "primary-tabs-all-attachments/manifest.json",
  "core-loop-attachments/manifest.json",
  "shopping-link-attachments/manifest.json",
  "notification-settings-nonzero-fixed-attachments/manifest.json",
];
const requiredPrimaryTabScreenshotNames = [
  "01-home",
  "02-fridge-tab",
  "03-recipe-tab",
  "04-shopping-tab",
  "05-mypage-tab",
];
const requiredShoppingScreenshotNames = [
  "06-shopping-before-external-link",
  "07-shopping-external-link-safari",
];
const requiredCoreLoopScreenshotNames = [
  "11-core-loop-home-recommendation",
  "12-core-loop-recipe-shopping-assistant",
  "13-core-loop-after-shopping-add",
  "14-core-loop-shopping-list",
];
const requiredNotificationScreenshotNames = [
  "08a-fridge-before-notification-seed",
  "08c-fridge-notification-seed-expiry-selected",
  "08b-fridge-after-notification-seed",
  "09-notification-settings-before-schedule",
  "10-notification-settings-after-schedule",
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function validateSinglePassingXcresult(summary, label, failures, passes) {
  if (
    summary.result === "Passed" &&
    summary.passedTests === 1 &&
    summary.failedTests === 0 &&
    summary.totalTestCount === 1
  ) {
    passes.push(`xcresult: 1 ${label} test passed`);
  } else {
    failures.push(`xcresult: expected one passing ${label} test`);
  }

  if (summary.devicesAndConfigurations?.[0]?.device?.modelName === "iPhone 12 Pro") {
    passes.push(`device: iPhone 12 Pro for ${label}`);
  } else {
    failures.push(`device: expected iPhone 12 Pro ${label} xcresult evidence`);
  }
}

function validateScreenshots(manifest, names, failures, passes) {
  const manifestText = JSON.stringify(manifest);
  for (const screenshotName of names) {
    if (manifestText.includes(screenshotName)) {
      passes.push(`screenshot: ${screenshotName}`);
    } else {
      failures.push(`screenshot missing: ${screenshotName}`);
    }
  }
}

function run() {
  const passes = [];
  const failures = [];
  const warnings = [];

  if (!existsSync(evidenceDir)) {
    failures.push(`evidence directory missing: ${path.relative(cwd, evidenceDir)}`);
  } else {
    passes.push(`evidence directory: ${path.relative(cwd, evidenceDir)}`);

    for (const filename of requiredFiles) {
      const filePath = path.join(evidenceDir, filename);
      if (existsSync(filePath)) {
        passes.push(`${filename}: present`);
      } else {
        failures.push(`${filename}: missing`);
      }
    }

    if (requiredFiles.every((filename) => existsSync(path.join(evidenceDir, filename)))) {
      const summary = readFileSync(path.join(evidenceDir, "summary.md"), "utf8");
      const primaryTabSummary = readJson(path.join(evidenceDir, "xcresult-primary-tabs-all-fixed-summary.txt"));
      const shoppingSummary = readJson(path.join(evidenceDir, "xcresult-shopping-link-summary.txt"));
      const notificationSummary = readJson(path.join(evidenceDir, "xcresult-notification-settings-nonzero-fixed-summary.txt"));
      const primaryTabManifest = readJson(path.join(evidenceDir, "primary-tabs-all-attachments/manifest.json"));
      const shoppingManifest = readJson(path.join(evidenceDir, "shopping-link-attachments/manifest.json"));
      const notificationManifest = readJson(path.join(evidenceDir, "notification-settings-nonzero-fixed-attachments/manifest.json"));

      if (
        summary.includes("Passed for the cable-driven primary-tab smoke path") &&
        summary.includes("home, fridge, recipe, shopping, and mypage") &&
        summary.includes("Passed for the cable-driven recipe-to-shopping core loop path") &&
        summary.includes("home recommendation, recipe shopping assistant, add-to-shopping result, and shopping list") &&
        summary.includes("Passed for the cable-driven shopping external-link handoff path") &&
        summary.includes("Safari opened from the shopping affiliate link") &&
        summary.includes("Passed for the cable-driven local notification scheduling path") &&
        summary.includes("iOS 로컬 알림으로 3개 알림을 준비했어요")
      ) {
        passes.push("summary: primary-tab, core-loop, shopping-link, and notification passes documented");
      } else {
        failures.push("summary: missing primary-tab, core-loop, shopping-link, or notification pass documentation");
      }

      validateSinglePassingXcresult(primaryTabSummary, "primary-tab", failures, passes);
      const coreLoopSummary = readJson(path.join(evidenceDir, "xcresult-core-loop-summary.txt"));
      validateSinglePassingXcresult(shoppingSummary, "shopping-link", failures, passes);
      validateSinglePassingXcresult(notificationSummary, "notification-scheduling", failures, passes);
      const coreLoopManifest = readJson(path.join(evidenceDir, "core-loop-attachments/manifest.json"));
      validateScreenshots(primaryTabManifest, requiredPrimaryTabScreenshotNames, failures, passes);
      validateSinglePassingXcresult(coreLoopSummary, "core-loop", failures, passes);
      validateScreenshots(coreLoopManifest, requiredCoreLoopScreenshotNames, failures, passes);
      validateScreenshots(shoppingManifest, requiredShoppingScreenshotNames, failures, passes);
      validateScreenshots(notificationManifest, requiredNotificationScreenshotNames, failures, passes);
    }
  }

  warnings.push("OAuth completion and account deletion are not covered by the cable XCUITest smoke evidence");

  console.log("iOS XCUITest smoke evidence check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Failures: ${failures.length}`);

  if (passes.length > 0) {
    console.log("\nPASS");
    for (const pass of passes) {
      console.log(`- ${pass}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\nWARN");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFAIL");
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
    process.exit(1);
  }
}

run();
