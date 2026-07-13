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
  assert.match(result.stdout, /Contracts checked: 13/);
  assert.match(result.stdout, /Failures: 0/);
});

test("release-candidate performance capture requires a published recipe identity", () => {
  const result = spawnSync("node", ["scripts/capture-phase-6-performance.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PHASE6_PERFORMANCE_PROFILE: "release-candidate",
      PHASE6_PERFORMANCE_RECIPE_ID: "",
      PHASE6_PERFORMANCE_RECIPE_TITLE: "",
      PHASE6_PERFORMANCE_URL: "",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be a published recipe UUID/);
});

test("performance capture rejects unknown measurement profiles", () => {
  const result = spawnSync("node", ["scripts/capture-phase-6-performance.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PHASE6_PERFORMANCE_PROFILE: "untrusted",
      PHASE6_PERFORMANCE_URL: "",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be baseline or release-candidate/);
});
