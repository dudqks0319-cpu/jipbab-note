import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/check-real-device-availability.mjs", "utf8");

test("external release check includes real physical device availability", () => {
  assert.equal(
    packageJson.scripts["check:real-device-availability"],
    "node scripts/check-real-device-availability.mjs",
  );
  assert.match(packageJson.scripts["release:external-check"], /check:real-device-availability/);
});

test("real device availability check inspects iOS physical devices and excludes simulators", () => {
  assert.match(source, /"xcrun", \["xctrace", "list", "devices"\]/);
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
