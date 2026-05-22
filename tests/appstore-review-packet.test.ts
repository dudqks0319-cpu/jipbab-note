import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/capture-appstore-review-packet.mjs", "utf8");
const readinessChecklist = readFileSync("docs/release-readiness-checklist.md", "utf8");

test("App Store review packet capture command is wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:capture-appstore-review-packet"],
    "node scripts/capture-appstore-review-packet.mjs",
  );
});

test("App Store review packet is scoped to iOS review materials", () => {
  assert.match(source, /docs\/app-store-connect-metadata-ko\.md/);
  assert.match(source, /docs\/app-store-screenshots\/2026-05-19-iphone69/);
  assert.match(source, /public\/icons\/app-icon-512\.png/);
  assert.match(source, /docs\/store-console-confirmation\.md/);
  assert.match(source, /scripts\/check-ios-release-artifact\.mjs/);
  assert.match(source, /scripts\/check-appstore-submit-readiness\.mjs/);
  assert.doesNotMatch(source, /docs\/play-store-metadata-ko\.md/);
  assert.doesNotMatch(source, /docs\/play-store-assets\/phone/);
  assert.doesNotMatch(source, /feature-graphic\.png/);
});

test("App Store review packet validates only App Store asset dimensions before copying", () => {
  assert.match(source, /App Store asset subset check/);
  assert.match(source, /1290x2796/);
  assert.match(source, /512x512 RGB/);
  assert.match(source, /App Store review packet blocked because App Store assets are not ready/);
  assert.match(source, /appstore-assets-check\.txt/);
  assert.match(source, /ios-release-artifact\.txt/);
  assert.match(source, /appstore-submit-gate\.txt/);
  assert.match(source, /appstore-review-packet\.md/);
});

test("App Store review packet never submits and keeps the submit gate authoritative", () => {
  assert.match(source, /does not upload to App Store Connect and does not submit for review/);
  assert.match(source, /Do not submit for review until `pnpm release:appstore-submit-gate` passes/);
  assert.match(source, /App Store review submission is still blocked/);
  assert.match(readinessChecklist, /pnpm release:capture-appstore-review-packet/);
  assert.match(readinessChecklist, /App Store 전용 메타데이터/);
});
