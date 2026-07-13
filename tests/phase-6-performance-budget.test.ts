import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { summarizeSamples } from "../scripts/lib/performance-statistics.mjs";

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
  assert.equal(
    packageJson.scripts["promote:phase6-performance-baseline"],
    "node scripts/promote-phase-6-performance-baseline.mjs",
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
  assert.match(result.stdout, /Contracts checked: 15/);
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

test("release-candidate performance capture requires an exact deployment SHA", () => {
  const result = spawnSync("node", ["scripts/capture-phase-6-performance.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PHASE6_PERFORMANCE_PROFILE: "release-candidate",
      PHASE6_PERFORMANCE_RECIPE_ID: "11111111-1111-4111-8111-111111111111",
      PHASE6_PERFORMANCE_RECIPE_TITLE: "성능 측정 레시피",
      PHASE6_PERFORMANCE_DEPLOYMENT_SHA: "",
      PHASE6_PERFORMANCE_URL: "",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /PHASE6_PERFORMANCE_DEPLOYMENT_SHA must be a full Git SHA/);
});

const releaseCandidateRoutes = [
  "published-home",
  "published-recipe-list-12",
  "image-recipe-detail-serving",
  "shopping-list-20",
  "cooking-mode",
  "timer-running",
  "family-fridge",
  "login-callback",
  "app-info",
];

const aggregateStatistics = {
  attemptedRuns: 5,
  successfulRuns: 5,
  failureRate: 0,
  lcpMilliseconds: {
    median: 1200,
    p75: 1200,
    max: 1200,
    standardDeviation: 0,
  },
  cls: { median: 0.02, p75: 0.02, max: 0.02, standardDeviation: 0 },
  fcpMilliseconds: {
    median: 800,
    p75: 800,
    max: 800,
    standardDeviation: 0,
  },
  ttfbMilliseconds: {
    median: 300,
    p75: 300,
    max: 300,
    standardDeviation: 0,
  },
  transferBytes: {
    median: 400000,
    p75: 400000,
    max: 400000,
    standardDeviation: 0,
  },
  jsTransferBytes: {
    median: 250000,
    p75: 250000,
    max: 250000,
    standardDeviation: 0,
  },
  imageTransferBytes: {
    median: 100000,
    p75: 100000,
    max: 100000,
    standardDeviation: 0,
  },
  requestCount: { median: 30, p75: 30, max: 30, standardDeviation: 0 },
  totalLongTaskMilliseconds: {
    median: 20,
    p75: 20,
    max: 20,
    standardDeviation: 0,
  },
  longTaskOver50Count: { median: 0, p75: 0, max: 0, standardDeviation: 0 },
};

test("performance statistics include median, p75, maximum, and population deviation", () => {
  assert.deepEqual(summarizeSamples([100, 200, 300, 400, 500]), {
    median: 300,
    p75: 400,
    max: 500,
    standardDeviation: 141.4,
  });
  assert.equal(summarizeSamples([0.0111, 0.0222, 0.0333, 0.0444, 0.0555], 4).p75, 0.0444);
});

function validReleaseCandidateEvidence() {
  return {
    schemaVersion: 1,
    capturedAt: "2026-07-14T00:00:00.000Z",
    measurementClass: "repeatable_mobile_lab_guard_not_field_p75",
    measurementProfile: "release-candidate",
    deploymentSha: "1".repeat(40),
    origin: "https://preview.example.com",
    runCount: 10,
    runCountPerCacheMode: 5,
    totalRunCountPerRoute: 10,
    interactionP75Milliseconds: 80,
    searchInputP75Milliseconds: 45,
    failures: ["release-candidate regression baselines are missing: bootstrap"],
    missingBaselines: ["bootstrap"],
    captureFailures: [],
    routeSummaries: releaseCandidateRoutes.map((route) => ({
      route,
      runs: 10,
      coldRuns: 5,
      warmRuns: 5,
      lcpP75Milliseconds: 1200,
      clsP75: 0.02,
      ttfbP75Milliseconds: 300,
      transferP75Bytes: 400000,
      jsTransferP75Bytes: 250000,
      imageTransferP75Bytes: 100000,
      requestCountP75: 30,
      totalLongTaskP75Milliseconds: 20,
      longTaskOver50P75Count: 0,
      consoleErrorCount: 0,
      hydrationErrorCount: 0,
      unexpectedNetworkErrorCount: 0,
      statistics: {
        cold: structuredClone(aggregateStatistics),
        warm: structuredClone(aggregateStatistics),
      },
    })),
    results: [{ raw: "must not be promoted" }],
  };
}

function runPromotion(evidence: object, approved: boolean) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "phase6-performance-promotion-"));
  const evidencePath = path.join(tempDir, "evidence.json");
  const baselinePath = path.join(tempDir, "baseline.json");
  writeFileSync(evidencePath, `${JSON.stringify(evidence)}\n`);
  const result = spawnSync("node", ["scripts/promote-phase-6-performance-baseline.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      PHASE6_PERFORMANCE_EVIDENCE_PATH: evidencePath,
      PHASE6_PERFORMANCE_BASELINE_PATH: baselinePath,
      PHASE6_PERFORMANCE_PROMOTION_APPROVED: approved ? "1" : "0",
    },
  });
  const baseline = result.status === 0 ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;
  rmSync(tempDir, { recursive: true, force: true });
  return { result, baseline };
}

test("performance baseline promotion requires explicit approval", () => {
  const { result } = runPromotion(validReleaseCandidateEvidence(), false);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /PHASE6_PERFORMANCE_PROMOTION_APPROVED=1/);
});

test("performance baseline promotion rejects non-baseline failures", () => {
  const evidence = validReleaseCandidateEvidence();
  evidence.failures = ["published-home LCP p75 2600ms > 2500ms"];
  const { result } = runPromotion(evidence, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /absolute performance or runtime failures/);
});

test("performance baseline promotion rejects incomplete cold and warm sampling", () => {
  const evidence = validReleaseCandidateEvidence();
  evidence.routeSummaries[0].statistics.warm.successfulRuns = 4;
  const { result } = runPromotion(evidence, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cold and warm runs/);
});

test("performance baseline promotion writes only reviewed aggregate evidence", () => {
  const evidence = validReleaseCandidateEvidence();
  const { result, baseline } = runPromotion(evidence, true);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(baseline.measurementProfile, "release-candidate");
  assert.equal(baseline.deploymentSha, "1".repeat(40));
  assert.equal(baseline.runCount, 10);
  assert.equal(baseline.runCountPerCacheMode, 5);
  assert.equal(baseline.totalRunCountPerRoute, 10);
  assert.equal(baseline.routes["published-home"].totalTransferBytes, 400000);
  assert.equal(baseline.routes["published-home"].statistics.warm.successfulRuns, 5);
  assert.equal("results" in baseline, false);
  assert.equal("failures" in baseline, false);
});
