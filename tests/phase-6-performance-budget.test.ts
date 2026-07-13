import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");

test("Phase 6 performance budget is wired into package and release gates", () => {
  assert.equal(
    packageJson.scripts["check:phase6-performance"],
    "node scripts/check-phase-6-performance-budget.mjs",
  );
  assert.equal(
    packageJson.scripts["capture:phase6-performance"],
    "node scripts/capture-phase-6-performance.mjs",
  );
  assert.match(localGate, /scripts\/check-phase-6-performance-budget\.mjs/);
  assert.match(ciGate, /scripts\/check-phase-6-performance-budget\.mjs/);
});

test("Phase 6 performance static contract passes", () => {
  const result = spawnSync("node", ["scripts/check-phase-6-performance-budget.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Contracts checked: 11/);
  assert.match(result.stdout, /Failures: 0/);
});
