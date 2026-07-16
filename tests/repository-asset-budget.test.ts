import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const checker = readFileSync("scripts/check-repository-asset-budget.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");

test("repository asset budget is wired into package and CI gates", () => {
  assert.equal(
    packageJson.scripts["check:asset-budget"],
    "node scripts/check-repository-asset-budget.mjs",
  );
  assert.match(ciGate, /scripts\/check-repository-asset-budget\.mjs/);
});

test("asset budget bounds count, total bytes, individual size, and build artifacts", () => {
  assert.match(checker, /MAX_PUBLIC_IMAGE_FILES/);
  assert.match(checker, /MAX_PUBLIC_IMAGE_BYTES/);
  assert.match(checker, /MAX_SINGLE_IMAGE_BYTES/);
  assert.match(checker, /\/\.build\//);
  assert.match(checker, /\/node_modules\//);
  assert.match(checker, /git", \["ls-files"/);
});
