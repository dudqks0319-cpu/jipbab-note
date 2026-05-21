import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const checkSource = readFileSync("scripts/check-store-console-confirmation.mjs", "utf8");
const evidence = readFileSync("docs/store-console-confirmation.md", "utf8");

test("external release check includes store console confirmation", () => {
  assert.equal(
    packageJson.scripts["check:store-console-confirmation"],
    "node scripts/check-store-console-confirmation.mjs",
  );
  assert.match(packageJson.scripts["release:external-check"], /check:store-console-confirmation/);
});

test("store console confirmation requires both app store and play console evidence", () => {
  assert.match(checkSource, /App Store Connect\/TestFlight: confirmed/);
  assert.match(checkSource, /TestFlight processing: confirmed/);
  assert.match(checkSource, /Internal tester availability: confirmed/);
  assert.match(checkSource, /Play Console internal testing: confirmed/);
  assert.match(checkSource, /AAB upload: confirmed/);
  assert.match(checkSource, /Internal testing track: confirmed/);
});

test("store console confirmation evidence stays blocked until manually confirmed", () => {
  assert.match(evidence, /App Store Connect\/TestFlight: not confirmed/);
  assert.match(evidence, /TestFlight processing: not confirmed/);
  assert.match(evidence, /Play Console internal testing: not confirmed/);
  assert.match(evidence, /AAB upload: not confirmed/);
});
