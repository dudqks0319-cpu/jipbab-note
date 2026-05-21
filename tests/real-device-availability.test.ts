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
  assert.ok(source.includes("available: deviceLines.filter((line) => /^\\S+\\s+device\\b/.test(line)),"));
  assert.match(source, /Android physical device: none attached/);
});

test("real-device QA evidence gate requires end-to-end manual release checks", () => {
  assert.match(evidenceSource, /docs\/real-device-qa\.md/);
  assert.match(evidenceSource, /iOS real-device QA: confirmed/);
  assert.match(evidenceSource, /Android real-device QA: confirmed/);
  assert.match(evidenceSource, /iOS core loop: confirmed/);
  assert.match(evidenceSource, /Android core loop: confirmed/);
  assert.match(evidenceSource, /iOS Google login: confirmed/);
  assert.match(evidenceSource, /Android Google login: confirmed/);
  assert.match(evidenceSource, /iOS Apple login: confirmed/);
  assert.match(evidenceSource, /Android Apple login\/provider behavior: confirmed/);
  assert.match(evidenceSource, /iOS Kakao login: confirmed/);
  assert.match(evidenceSource, /Android Kakao login: confirmed/);
  assert.match(evidenceSource, /iOS local notification permission and scheduling: confirmed/);
  assert.match(evidenceSource, /Android local notification permission and scheduling: confirmed/);
  assert.match(evidenceSource, /iOS shopping external link: confirmed/);
  assert.match(evidenceSource, /Android shopping external link: confirmed/);
  assert.match(evidenceSource, /iOS account deletion request: confirmed/);
  assert.match(evidenceSource, /Android account deletion request: confirmed/);
  assert.match(evidenceSource, /iOS raw error disclosure: not observed/);
  assert.match(evidenceSource, /Android raw error disclosure: not observed/);
  assert.match(evidenceSource, /iOS evidence date: YYYY-MM-DD/);
  assert.match(evidenceSource, /iOS evidence artifacts/);
  assert.match(evidenceSource, /Android evidence date: YYYY-MM-DD/);
  assert.match(evidenceSource, /Android evidence artifacts/);
  assert.match(evidenceSource, /existing local path or URL/);
  assert.match(evidenceSource, /existsSync\(artifactPath\)/);
});

test("real-device QA evidence starts blocked until actual device evidence is recorded", () => {
  assert.match(evidenceDoc, /iOS real-device QA: not confirmed/);
  assert.match(evidenceDoc, /Android real-device QA: not confirmed/);
  assert.match(evidenceDoc, /iOS evidence artifacts: pending/);
  assert.match(evidenceDoc, /Android evidence artifacts: pending/);
  assert.doesNotMatch(evidenceDoc, /iOS real-device QA: confirmed/);
  assert.doesNotMatch(evidenceDoc, /Android real-device QA: confirmed/);
});

test("real-device QA packet captures native artifacts and manual evidence template", () => {
  assert.match(packetSource, /"output", "release-evidence"/);
  assert.match(packetSource, /Real-device QA Packet/);
  assert.match(packetSource, /manual-qa-template\.md/);
  assert.match(packetSource, /native-artifacts\.md/);
  assert.match(packetSource, /JipbabNote-\$\{iosBuildNumber\}\.xcarchive/);
  assert.match(packetSource, /app-release\.aab/);
  assert.match(packetSource, /app-debug\.apk/);
  assert.match(packetSource, /REAL_DEVICE_QA_LAUNCH_ANDROID/);
  assert.match(packetSource, /screencap/);
  assert.match(packetSource, /iOS evidence artifacts/);
  assert.match(packetSource, /Android evidence artifacts/);
});
