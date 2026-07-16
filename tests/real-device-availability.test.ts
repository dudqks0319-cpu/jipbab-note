import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/check-real-device-availability.mjs", "utf8");
const evidenceSource = readFileSync("scripts/check-real-device-qa-evidence.mjs", "utf8");
const packetSource = readFileSync("scripts/capture-real-device-qa-packet.mjs", "utf8");
const evidenceDoc = readFileSync("docs/real-device-qa.md", "utf8");

test("external release check includes real physical device availability", () => {
  assert.equal(
    packageJson.scripts["check:real-device-availability"],
    "node scripts/check-real-device-availability.mjs",
  );
  assert.equal(
    packageJson.scripts["check:real-device-qa-evidence"],
    "node scripts/check-real-device-qa-evidence.mjs",
  );
  assert.match(packageJson.scripts["release:external-check"], /check:real-device-availability/);
  assert.match(packageJson.scripts["release:external-check"], /check:real-device-qa-evidence/);
  assert.equal(
    packageJson.scripts["release:capture-real-device-qa"],
    "node scripts/capture-real-device-qa-packet.mjs",
  );
  assert.equal(
    packageJson.scripts["release:capture-ios-real-device-qa"],
    "node scripts/capture-real-device-qa-packet.mjs --platform=ios",
  );
  assert.equal(
    packageJson.scripts["release:capture-android-real-device-qa"],
    "node scripts/capture-real-device-qa-packet.mjs --platform=android",
  );
});

test("real device availability check inspects iOS physical devices and excludes simulators", () => {
  assert.match(source, /"xcrun", \["xctrace", "list", "devices"\]/);
  assert.match(source, /"xcrun", \["devicectl", "list", "devices"\]/);
  assert.match(source, /iOS CoreDevice unavailable/);
  assert.match(source, /sectionLines\(output, "Devices"\)\.filter\(looksLikeIosPhysicalDevice\)/);
  assert.match(source, /sectionLines\(output, "Devices Offline"\)\.filter\(looksLikeIosPhysicalDevice\)/);
  assert.doesNotMatch(source, /sectionLines\(output, "Simulators"\)/);
});

test("real device availability check requires an attached Android device", () => {
  assert.match(source, /adbPath/);
  assert.match(source, /\["devices", "-l"\]/);
  assert.match(source, /function looksLikeAndroidPhysicalDevice/);
  assert.match(source, /function looksLikeAndroidEmulator/);
  assert.match(source, /available: deviceLines\.filter\(looksLikeAndroidPhysicalDevice\)\.map\(redactAndroidDeviceLine\)/);
  assert.match(source, /Android emulator ignored for physical-device gate/);
  assert.match(source, /Android physical device: none attached/);
});

test("real device availability output redacts device identifiers", () => {
  assert.match(source, /function redactAppleDeviceLine/);
  assert.match(source, /\[redacted-device-id\]/);
  assert.match(source, /\[redacted-device\]/);
  assert.match(source, /function redactAndroidDeviceLine/);
  assert.match(source, /\[redacted-android-device\]/);
  assert.match(packetSource, /\[redacted-device-id\]/);
  assert.match(packetSource, /Apple host \(\[redacted-device-id\]\)/);
  assert.match(packetSource, /iOS device/);
  assert.match(packetSource, /\[redacted-android-device\]/);
});

test("real-device QA evidence gate requires end-to-end manual release checks", () => {
  assert.match(evidenceSource, /docs\/real-device-qa\.md/);
  assert.match(evidenceSource, /iOS real-device QA: confirmed/);
  assert.match(evidenceSource, /Android real-device QA: confirmed/);
  assert.match(evidenceSource, /iOS core loop: confirmed/);
  assert.match(evidenceSource, /Android core loop: confirmed/);
  assert.match(evidenceSource, /providerTerms\("iOS"\)/);
  assert.match(evidenceSource, /providerTerms\("Android"\)/);
  assert.match(evidenceSource, /\$\{platform\} Google login: confirmed/);
  assert.match(evidenceSource, /iOS Apple login: confirmed/);
  assert.match(evidenceSource, /Android Apple login\/provider behavior: confirmed/);
  assert.match(evidenceSource, /resolveEnabledProviders/);
  assert.match(evidenceSource, /enabledProviders\.includes\("kakao"\)/);
  assert.match(evidenceSource, /\$\{platform\} Kakao login: confirmed/);
  assert.match(evidenceSource, /iOS local notification permission and scheduling: confirmed/);
  assert.match(evidenceSource, /Android local notification permission and scheduling: confirmed/);
  assert.match(evidenceSource, /iOS shopping external link: confirmed/);
  assert.match(evidenceSource, /Android shopping external link: confirmed/);
  assert.match(evidenceSource, /iOS account deletion: confirmed/);
  assert.match(evidenceSource, /Android account deletion: confirmed/);
  assert.match(evidenceSource, /iOS raw error disclosure: not observed/);
  assert.match(evidenceSource, /Android raw error disclosure: not observed/);
  assert.match(evidenceSource, /iOS evidence date: YYYY-MM-DD/);
  assert.match(evidenceSource, /iOS evidence artifacts/);
  assert.match(evidenceSource, /Android evidence date: YYYY-MM-DD/);
  assert.match(evidenceSource, /Android evidence artifacts/);
  assert.match(evidenceSource, /existing local path or URL/);
  assert.match(evidenceSource, /releaseEvidenceReferenceExists\(lineValue\(source, label\)\)/);
  assert.match(evidenceSource, /function hasEvidenceTerm/);
  assert.match(evidenceSource, /escapeRegExp\(term\)/);
  assert.equal(evidenceSource.includes('new RegExp(`^\\\\s*-\\\\s*${escapeRegExp(term)}\\\\s*$`, "m")'), true);
  assert.doesNotMatch(evidenceSource, /terms\.every\(\(term\) => source\.includes\(term\)\)/);
});

test("real-device QA evidence stays blocked until full manual evidence is recorded", () => {
  assert.match(evidenceDoc, /iOS real-device QA: confirmed/);
  assert.match(evidenceDoc, /Android real-device QA: not confirmed/);
  assert.match(evidenceDoc, /iOS Google login: confirmed/);
  assert.match(evidenceDoc, /iOS Apple login: confirmed/);
  assert.match(evidenceDoc, /iOS Kakao login: confirmed/);
  assert.match(evidenceDoc, /iOS core loop: confirmed/);
  assert.match(evidenceDoc, /iOS local notification permission and scheduling: confirmed/);
  assert.match(evidenceDoc, /iOS shopping external link: confirmed/);
  assert.match(evidenceDoc, /iOS account deletion screen access: confirmed/);
  assert.match(evidenceDoc, /iOS account deletion: confirmed/);
  assert.match(evidenceDoc, /direct account deletion completed/i);
  assert.match(evidenceDoc, /iOS evidence artifacts: <repo>\/output\/release-evidence\//);
  assert.match(evidenceDoc, /Android evidence artifacts: (pending|<repo>\/output\/release-evidence\/)/);
  assert.doesNotMatch(evidenceDoc, /Android real-device QA: confirmed/);
});

test("real-device QA packet captures native artifacts and manual evidence template", () => {
  assert.match(packetSource, /"output", "release-evidence"/);
  assert.match(packetSource, /Real-device QA Packet/);
  assert.match(packetSource, /parsePlatform/);
  assert.match(packetSource, /--platform=ios, --platform=android, or --platform=all/);
  assert.match(packetSource, /real-device-qa-\$\{platform\}/);
  assert.match(packetSource, /manual-qa-template\.md/);
  assert.match(packetSource, /operator-checklist\.md/);
  assert.match(packetSource, /device-unblock-checklist\.md/);
  assert.match(packetSource, /native-artifacts\.md/);
  assert.match(packetSource, /JipbabNote-\$\{iosBuildNumber\}\.xcarchive/);
  assert.match(packetSource, /app-release\.aab/);
  assert.match(packetSource, /app-debug\.apk/);
  assert.match(packetSource, /REAL_DEVICE_QA_LAUNCH_ANDROID/);
  assert.match(packetSource, /screencap/);
  assert.match(packetSource, /Platform scope/);
  assert.match(packetSource, /--platform=\$\{platform\}/);
  assert.match(packetSource, /xcrun devicectl list devices/);
  assert.match(packetSource, /xcrun xctrace list devices/);
  assert.match(packetSource, /USB debugging/);
  assert.match(packetSource, /iOS evidence artifacts/);
  assert.match(packetSource, /Android evidence artifacts/);
  assert.match(packetSource, /check:real-device-qa-evidence -- --platform=\$\{platform\}/);
});
