import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");

test("Phase 6 mobile accessibility check is wired into local and CI gates", () => {
  assert.equal(
    packageJson.scripts["check:phase6-accessibility"],
    "node scripts/check-phase-6-mobile-accessibility.mjs",
  );
  assert.match(localGate, /scripts\/check-phase-6-mobile-accessibility\.mjs/);
  assert.match(ciGate, /scripts\/check-phase-6-mobile-accessibility\.mjs/);
});

test("Phase 6 mobile accessibility contract passes against app surfaces", () => {
  const result = spawnSync("node", ["scripts/check-phase-6-mobile-accessibility.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Failures: 0/);
});
