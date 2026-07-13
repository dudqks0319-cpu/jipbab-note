import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("repository binary inventory is wired into local and CI release gates", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
  const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");

  assert.equal(packageJson.scripts["audit:repository-binaries"], "node scripts/audit-repository-binaries.mjs");
  assert.match(localGate, /scripts\/audit-repository-binaries\.mjs/);
  assert.match(ciGate, /scripts\/audit-repository-binaries\.mjs/);
});

test("repository binary inventory is current and blocks oversized release archives", () => {
  const result = spawnSync("node", ["scripts/audit-repository-binaries.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Oversized binaries: 0/);
  assert.match(result.stdout, /Forbidden release archives: 0/);
});
