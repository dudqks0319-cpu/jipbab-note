import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const routeSources = [
  readFileSync("app/api/v1/recipes/route.ts", "utf8"),
  readFileSync("app/api/v1/recipes/[id]/route.ts", "utf8"),
  readFileSync("app/api/v1/recommendations/route.ts", "utf8"),
  readFileSync("app/api/v1/recipe-feedback/route.ts", "utf8"),
  readFileSync("app/api/v1/recipe-progress/route.ts", "utf8"),
  readFileSync("app/api/v1/shopping/items/from-recipe/route.ts", "utf8"),
];

test("Phase 6 observability contract is wired into package and release gates", () => {
  assert.equal(
    packageJson.scripts["check:phase6-observability"],
    "node scripts/check-phase-6-observability.mjs",
  );
  assert.match(localGate, /scripts\/check-phase-6-observability\.mjs/);
  assert.match(ciGate, /scripts\/check-phase-6-observability\.mjs/);
});

test("API v1 routes use the structured operational responder", () => {
  for (const source of routeSources) {
    assert.match(source, /createApiV1Responder/);
    assert.doesNotMatch(source, /console\.(?:log|info|warn|error)/);
  }
});

test("Phase 6 observability static contract passes", () => {
  const result = spawnSync("node", ["scripts/check-phase-6-observability.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Contracts checked: 16/);
  assert.match(result.stdout, /Failures: 0/);
});
