import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/capture-store-submission-packet.mjs", "utf8");
const operatorHandoffSource = readFileSync("scripts/capture-release-operator-handoff.mjs", "utf8");
const readinessChecklist = readFileSync("docs/release-readiness-checklist.md", "utf8");

test("store submission packet capture command is wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:capture-store-submission-packet"],
    "node scripts/capture-store-submission-packet.mjs",
  );
});

test("store submission packet validates assets before copying upload files", () => {
  assert.match(source, /scripts\/check-store-assets\.mjs/);
  assert.match(source, /Store submission packet blocked because store assets are not ready/);
  assert.match(source, /docs\/app-store-connect-metadata-ko\.md/);
  assert.match(source, /docs\/play-store-metadata-ko\.md/);
  assert.match(source, /docs\/app-store-screenshots\/2026-05-19-iphone69/);
  assert.match(source, /docs\/play-store-assets\/phone/);
  assert.match(source, /docs\/play-store-assets\/feature-graphic\.png/);
  assert.match(source, /public\/icons\/app-icon-512\.png/);
  assert.match(source, /store-submission-packet\.md/);
});

test("store submission packet is local-only and blocks review submission until the submit gate passes", () => {
  assert.match(source, /does not upload to App Store Connect or Google Play/);
  assert.match(source, /Do not submit for review until `pnpm release:submit-gate` passes/);
  assert.match(source, /bundle ID `com\.jipbab\.note`/);
  assert.match(source, /package `com\.jipbab\.note`/);
});

test("operator handoff and checklist include the store submission packet", () => {
  assert.match(operatorHandoffSource, /scripts\/capture-store-submission-packet\.mjs/);
  assert.match(operatorHandoffSource, /Store submission metadata and image packet/);
  assert.match(operatorHandoffSource, /pnpm release:capture-store-submission-packet/);
  assert.match(readinessChecklist, /pnpm release:capture-store-submission-packet/);
  assert.match(readinessChecklist, /store submission packet/);
});
