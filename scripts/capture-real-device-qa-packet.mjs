import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const adbPath = process.env.ADB_PATH || "/Users/jyb-m3max/Library/Android/sdk/platform-tools/adb";
const appId = "com.jipbab.note";
const iosBuildNumber = "2026052001";
const androidVersionCode = "1";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(cwd, "output", "release-evidence", `${stamp}-real-device-qa`);

const commandCaptures = [
  {
    name: "real-device-availability",
    command: process.execPath,
    args: ["scripts/check-real-device-availability.mjs"],
  },
  {
    name: "ios-devicectl-devices",
    command: "xcrun",
    args: ["devicectl", "list", "devices"],
  },
  {
    name: "ios-xctrace-devices",
    command: "xcrun",
    args: ["xctrace", "list", "devices"],
  },
  {
    name: "android-adb-devices",
    command: adbPath,
    args: ["devices", "-l"],
    skipWhenMissing: true,
  },
  {
    name: "android-installed-package",
    command: adbPath,
    args: ["shell", "pm", "path", appId],
    skipWhenMissing: true,
  },
];

const launchCaptures = [
  {
    name: "android-launch",
    command: adbPath,
    args: ["shell", "monkey", "-p", appId, "-c", "android.intent.category.LAUNCHER", "1"],
    skipWhenMissing: true,
  },
  {
    name: "android-screenshot.png",
    command: adbPath,
    args: ["exec-out", "screencap", "-p"],
    binary: true,
    skipWhenMissing: true,
  },
];

const nativeArtifacts = [
  ["iOS archive", `ios/build/JipbabNote-${iosBuildNumber}.xcarchive`],
  ["iOS app bundle", `ios/build/JipbabNote-${iosBuildNumber}.xcarchive/Products/Applications/App.app`],
  ["iOS App Store IPA", `ios/build/export-${iosBuildNumber}/App.ipa`],
  ["Android signed AAB", "android/app/build/outputs/bundle/release/app-release.aab"],
  ["Android debug APK", "android/app/build/outputs/apk/debug/app-debug.apk"],
];

function redact(value) {
  return value
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[redacted-private-key]")
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[redacted-jwt]")
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[redacted-api-key]")
    .replace(/\b(AIza[0-9A-Za-z_-]{20,})\b/g, "[redacted-google-api-key]")
    .replace(/((?:SUPABASE_SERVICE_ROLE_KEY|ADMIN_EMAILS|APP_STORE_CONNECT_API_PRIVATE_KEY|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)\s*=\s*)\S+/g, "$1[redacted]");
}

function runCommand(capture) {
  if (capture.skipWhenMissing && !existsSync(capture.command)) {
    return {
      ...capture,
      status: "skipped",
      exitCode: null,
      output: `${capture.command} not found`,
      fileName: `${capture.name}.txt`,
    };
  }

  const result = spawnSync(capture.command, capture.args, {
    cwd,
    encoding: capture.binary ? "buffer" : "utf8",
  });
  const exitCode = result.status ?? 1;
  const status = exitCode === 0 ? "pass" : "blocked";
  const fileName = capture.binary ? capture.name : `${capture.name}.txt`;
  const filePath = path.join(outDir, fileName);

  if (capture.binary) {
    const buffer = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
    writeFileSync(filePath, buffer);
    return {
      ...capture,
      status,
      exitCode,
      output: result.error ? `ERROR: ${result.error.message}` : `${buffer.length} bytes captured`,
      fileName,
    };
  }

  const output = [
    `$ ${[capture.command, ...capture.args].join(" ")}`,
    "",
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? `ERROR: ${result.error.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  writeFileSync(filePath, `${redact(output).trim()}\n`);
  return {
    ...capture,
    status,
    exitCode,
    output,
    fileName,
  };
}

function fileDigest(filePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
}

function inventoryLine([label, relativePath]) {
  const absolutePath = path.join(cwd, relativePath);
  if (!existsSync(absolutePath)) {
    return `- ${label}: missing (${relativePath})`;
  }

  const stats = statSync(absolutePath);
  if (stats.isDirectory()) {
    return `- ${label}: present (${relativePath})`;
  }

  return `- ${label}: present (${relativePath}), ${Math.round(stats.size / 1024 / 1024)}MB, sha256 ${fileDigest(absolutePath)}`;
}

function writeManualQaTemplate() {
  const template = [
    "# Real-device QA Confirmation Template",
    "",
    "Copy these lines into `docs/real-device-qa.md` only after the matching checks pass on physical devices.",
    "",
    "## iOS",
    "",
    "- iOS real-device QA: confirmed",
    "- Device: iPhone",
    `- iOS build: ${iosBuildNumber}`,
    `- Bundle ID: ${appId}`,
    "- iOS core loop: confirmed",
    "- iOS Google login: confirmed",
    "- iOS Apple login: confirmed",
    "- iOS Kakao login: confirmed",
    "- iOS local notification permission and scheduling: confirmed",
    "- iOS shopping external link: confirmed",
    "- iOS account deletion request: confirmed",
    "- iOS raw error disclosure: not observed",
    "- iOS evidence date: YYYY-MM-DD",
    `- iOS evidence artifacts: ${outDir}`,
    "",
    "## Android",
    "",
    "- Android real-device QA: confirmed",
    "- Device: Android",
    `- Android package: ${appId}`,
    "- Android core loop: confirmed",
    "- Android Google login: confirmed",
    "- Android Kakao login: confirmed",
    "- Android Apple login/provider behavior: confirmed",
    "- Android local notification permission and scheduling: confirmed",
    "- Android shopping external link: confirmed",
    "- Android account deletion request: confirmed",
    "- Android back navigation: confirmed",
    "- Android raw error disclosure: not observed",
    "- Android evidence date: YYYY-MM-DD",
    `- Android evidence artifacts: ${outDir}`,
    "",
  ].join("\n");

  writeFileSync(path.join(outDir, "manual-qa-template.md"), template);
}

function writeOperatorChecklist() {
  const checklist = [
    "# Real-device QA Operator Checklist",
    "",
    "Use this checklist while testing the physical devices. This file is not proof by itself; only mark `docs/real-device-qa.md` as confirmed after the matching app behavior has been observed and the artifact paths have been reviewed.",
    "",
    "## Preflight",
    "",
    "- [ ] iPhone is unlocked, trusted by this Mac, and CoreDevice shows available.",
    "- [ ] Android physical device is connected, USB debugging is allowed, and `adb devices -l` shows `device`.",
    "- [ ] Native build identity matches `com.jipbab.note`, iOS build `2026052001`, Android versionCode `1`.",
    "- [ ] Production URL is `https://jipbab-note-app.vercel.app`.",
    "",
    "## iOS checks",
    "",
    "- [ ] Home, fridge, recipe, shopping, and my-page tabs render without a production error screen.",
    "- [ ] Add, edit, and delete a fridge ingredient.",
    "- [ ] Open a recommended recipe from current ingredients.",
    "- [ ] Add missing recipe ingredients to shopping.",
    "- [ ] Mark purchased shopping items and add them back to fridge inventory.",
    "- [ ] Complete Google login and return to the app with a session.",
    "- [ ] Complete Apple login and return to the app with a session.",
    "- [ ] Complete Kakao login and return to the app with a session.",
    "- [ ] Allow or deny local notification permission and verify the app remains usable.",
    "- [ ] Open the external shopping link in the expected browser/app surface.",
    "- [ ] Submit an account deletion request or reach the account deletion request screen.",
    "- [ ] Confirm no raw stack trace, env name, token, or server error detail is visible.",
    "",
    "## Android checks",
    "",
    "- [ ] Home, fridge, recipe, shopping, and my-page tabs render without a production error screen.",
    "- [ ] Add, edit, and delete a fridge ingredient.",
    "- [ ] Open a recommended recipe from current ingredients.",
    "- [ ] Add missing recipe ingredients to shopping.",
    "- [ ] Mark purchased shopping items and add them back to fridge inventory.",
    "- [ ] Complete Google login and return to the app with a session.",
    "- [ ] Complete Kakao login and return to the app with a session.",
    "- [ ] Verify Apple login/provider behavior on Android matches the release decision.",
    "- [ ] Allow or deny local notification permission and verify the app remains usable.",
    "- [ ] Open the external shopping link in the expected browser/app surface.",
    "- [ ] Submit an account deletion request or reach the account deletion request screen.",
    "- [ ] Android back navigation returns to the previous screen or exits only from the top-level screen.",
    "- [ ] Confirm no raw stack trace, env name, token, or server error detail is visible.",
    "",
    "## After QA",
    "",
    "- [ ] Review this packet for account names, device identifiers, screenshots, and sensitive details before sharing.",
    "- [ ] Copy `manual-qa-template.md` lines into `docs/real-device-qa.md` only for platforms that were actually tested.",
    "- [ ] Replace `YYYY-MM-DD` with the real test date.",
    "- [ ] Keep `iOS evidence artifacts` and `Android evidence artifacts` pointed at reviewed local paths or URLs.",
    "- [ ] Rerun `pnpm check:real-device-qa-evidence`.",
    "- [ ] Rerun `pnpm release:external-status`.",
    "- [ ] Rerun `pnpm release:goal-check`.",
    "",
  ].join("\n");

  writeFileSync(path.join(outDir, "operator-checklist.md"), checklist);
}

mkdirSync(outDir, { recursive: true });

const captures = [...commandCaptures];
if (process.env.REAL_DEVICE_QA_LAUNCH_ANDROID === "1") {
  captures.push(...launchCaptures);
}

const results = captures.map(runCommand);
const artifactInventory = [
  "# Native Artifact Inventory",
  "",
  ...nativeArtifacts.map(inventoryLine),
  "",
  `- Android optional launch/screenshot capture: ${process.env.REAL_DEVICE_QA_LAUNCH_ANDROID === "1" ? "enabled" : "disabled; set REAL_DEVICE_QA_LAUNCH_ANDROID=1"}`,
  "",
].join("\n");
writeFileSync(path.join(outDir, "native-artifacts.md"), artifactInventory);
writeManualQaTemplate();
writeOperatorChecklist();

const passed = results.filter((result) => result.status === "pass");
const blocked = results.filter((result) => result.status === "blocked");
const skipped = results.filter((result) => result.status === "skipped");
const summary = [
  "# Real-device QA Packet",
  "",
  `- Captured at: ${new Date().toISOString()}`,
  `- Output directory: ${outDir}`,
  `- App ID: ${appId}`,
  `- iOS build: ${iosBuildNumber}`,
  `- Android versionCode: ${androidVersionCode}`,
  `- Passed captures: ${passed.length}`,
  `- Blocked captures: ${blocked.length}`,
  `- Skipped captures: ${skipped.length}`,
  "- Note: this packet does not confirm QA by itself; it collects device state, install state, artifact inventory, and a manual confirmation template.",
  "",
  "## Files",
  "",
  ...results.map((result) => `- ${result.status}: ${result.fileName}`),
  "- info: native-artifacts.md",
  "- info: manual-qa-template.md",
  "- info: operator-checklist.md",
  "",
  "## Use In Release Ledger",
  "",
  `- iOS evidence artifacts: ${outDir}`,
  `- Android evidence artifacts: ${outDir}`,
  "",
  "Keep this directory local unless it has been reviewed for screenshots, account names, device identifiers, and other sensitive details.",
  "",
].join("\n");

writeFileSync(path.join(outDir, "summary.md"), summary);

console.log("Real-device QA packet captured");
console.log(`Output: ${outDir}`);
console.log(`Passed: ${passed.length}`);
console.log(`Blocked: ${blocked.length}`);
console.log(`Skipped: ${skipped.length}`);
if (blocked.length > 0) {
  console.log("Blocked captures:");
  for (const result of blocked) {
    console.log(`- ${result.name}: exit ${result.exitCode}`);
  }
}
