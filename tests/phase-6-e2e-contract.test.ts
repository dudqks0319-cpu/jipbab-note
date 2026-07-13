import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const happyPath = readFileSync("scripts/capture-phase-6-e2e-happy.mjs", "utf8");

test("Phase 6 E2E contract is wired into package and release gates", () => {
  assert.equal(
    packageJson.scripts["check:phase6-e2e-contract"],
    "node scripts/check-phase-6-e2e-contract.mjs",
  );
  assert.equal(
    packageJson.scripts["capture:phase6-e2e-negative"],
    "node scripts/capture-phase-6-e2e-negative.mjs",
  );
  assert.equal(
    packageJson.scripts["capture:phase6-e2e-happy"],
    "node scripts/capture-phase-6-e2e-happy.mjs",
  );
  assert.match(localGate, /scripts\/check-phase-6-e2e-contract\.mjs/);
  assert.match(ciGate, /scripts\/check-phase-6-e2e-contract\.mjs/);
  assert.match(happyPath, /shopping_duplicate_merged/);
  assert.match(happyPath, /undersizedControlCount, 0/);
  assert.match(happyPath, /Network\.requestWillBeSent/);
  assert.match(happyPath, /appFailedRequestCount, 0/);
});

test("Phase 6 E2E static contract passes", () => {
  const result = spawnSync("node", ["scripts/check-phase-6-e2e-contract.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Failures: 0/);
});
