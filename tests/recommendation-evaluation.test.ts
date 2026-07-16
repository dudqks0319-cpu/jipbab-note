import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildRecommendationEvaluationScenarios,
  evaluateRecommendationTop3,
} from "../lib/recommendation-evaluation.ts";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
const script = readFileSync("scripts/check-recommendation-top3-evaluation.mjs", "utf8");

test("recommendation regression set contains 100 unique labeled scenarios", () => {
  const scenarios = buildRecommendationEvaluationScenarios();
  assert.equal(scenarios.length, 100);
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, 100);
  assert.equal(new Set(scenarios.map((scenario) => scenario.targetRecipeName)).size, 20);
});

test("synthetic Top 3 regression hit rate stays above the plan threshold", () => {
  const report = evaluateRecommendationTop3();
  assert.equal(report.scenarioCount, 100);
  assert.ok(report.top3HitRatePercent >= 85, JSON.stringify(report.results.filter((result) => !result.passed)));
  assert.match(script, /not human preference or field accuracy evidence/);
  assert.equal(
    packageJson.scripts["check:recommendation-top3"],
    "node --experimental-strip-types scripts/check-recommendation-top3-evaluation.mjs",
  );
});
