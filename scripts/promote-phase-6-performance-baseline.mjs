// 이 파일은 검토된 출시 후보 성능 증거의 집계값만 회귀 baseline으로 승격합니다.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const evidencePath = path.resolve(
  process.env.PHASE6_PERFORMANCE_EVIDENCE_PATH ??
    "output/performance-evidence/phase6-performance-lab.json",
);
const baselinePath = path.resolve(
  process.env.PHASE6_PERFORMANCE_BASELINE_PATH ??
    "docs/phase-6-performance-baseline.json",
);
const promotionApproved = process.env.PHASE6_PERFORMANCE_PROMOTION_APPROVED === "1";

const requiredReleaseCandidateRoutes = [
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

const absoluteBudgets = Object.freeze({
  lcpP75Milliseconds: 2_500,
  clsP75: 0.1,
  ttfbP75Milliseconds: 800,
  interactionP75Milliseconds: 200,
  searchInputP75Milliseconds: 100,
});

const requiredAggregateMetrics = [
  "lcpMilliseconds",
  "cls",
  "fcpMilliseconds",
  "ttfbMilliseconds",
  "transferBytes",
  "jsTransferBytes",
  "imageTransferBytes",
  "requestCount",
  "totalLongTaskMilliseconds",
  "longTaskOver50Count",
];

function stop(message) {
  console.error(`Performance baseline promotion blocked: ${message}`);
  process.exit(1);
}

function readEvidence() {
  if (!existsSync(evidencePath)) stop("capture evidence file is missing");
  try {
    return JSON.parse(readFileSync(evidencePath, "utf8"));
  } catch {
    stop("capture evidence is not valid JSON");
  }
}

function isFiniteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function isSafeHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  } catch {
    return false;
  }
}

function validateHeader(evidence) {
  if (evidence.schemaVersion !== 1) stop("unsupported evidence schema");
  if (evidence.measurementClass !== "repeatable_mobile_lab_guard_not_field_p75") {
    stop("measurement class is not the approved lab guard");
  }
  if (evidence.measurementProfile !== "release-candidate") {
    stop("measurement profile must be release-candidate");
  }
  if (!/^[a-f0-9]{40}$/i.test(evidence.deploymentSha ?? "")) {
    stop("deployment SHA must be a full Git SHA");
  }
  if (!isSafeHttpsOrigin(evidence.origin)) stop("origin must be a credential-free HTTPS origin");
  if (!Number.isInteger(evidence.runCountPerCacheMode) || evidence.runCountPerCacheMode < 5) {
    stop("at least five cold and five warm runs are required");
  }
  if (
    evidence.totalRunCountPerRoute !== evidence.runCountPerCacheMode * 2 ||
    evidence.runCount !== evidence.totalRunCountPerRoute
  ) {
    stop("total run count must equal the cold and warm sample total");
  }
  if (!Number.isFinite(Date.parse(evidence.capturedAt))) stop("capturedAt must be an ISO timestamp");
}

function validateFailures(evidence) {
  if (!Array.isArray(evidence.failures)) stop("failures must be an array");
  const nonBootstrapFailures = evidence.failures.filter(
    (failure) =>
      typeof failure !== "string" ||
      !failure.startsWith("release-candidate regression baselines are missing:"),
  );
  if (nonBootstrapFailures.length > 0) {
    stop("evidence must not contain absolute performance or runtime failures");
  }
  if (!Array.isArray(evidence.captureFailures) || evidence.captureFailures.length > 0) {
    stop("evidence must not contain capture failures");
  }
}

function validateInteractionBudgets(evidence) {
  if (
    !isFiniteNonNegative(evidence.interactionP75Milliseconds) ||
    evidence.interactionP75Milliseconds > absoluteBudgets.interactionP75Milliseconds
  ) {
    stop("interaction p75 is missing or exceeds 200ms");
  }
  if (
    !isFiniteNonNegative(evidence.searchInputP75Milliseconds) ||
    evidence.searchInputP75Milliseconds > absoluteBudgets.searchInputP75Milliseconds
  ) {
    stop("search input p75 is missing or exceeds 100ms");
  }
}

function validateModeStatistics(statistics, routeName, cacheMode, expectedRuns) {
  if (
    !statistics ||
    statistics.attemptedRuns !== expectedRuns ||
    statistics.successfulRuns !== expectedRuns ||
    statistics.failureRate !== 0
  ) {
    stop(`${routeName} must contain five successful cold and warm runs for ${cacheMode}`);
  }
  for (const metricName of requiredAggregateMetrics) {
    const metric = statistics[metricName];
    for (const statisticName of ["median", "p75", "max", "standardDeviation"]) {
      if (!isFiniteNonNegative(metric?.[statisticName])) {
        stop(`${routeName} ${cacheMode} ${metricName}.${statisticName} is missing`);
      }
    }
  }
}

function validateRouteSummary(summary, routeName, expectedRuns) {
  if (!summary || summary.route !== routeName) stop(`${routeName} summary is missing`);
  if (
    !Number.isInteger(summary.runs) ||
    !Number.isInteger(summary.coldRuns) ||
    !Number.isInteger(summary.warmRuns) ||
    summary.coldRuns !== expectedRuns ||
    summary.warmRuns !== expectedRuns ||
    summary.runs !== expectedRuns * 2
  ) {
    stop(`${routeName} must contain five successful cold and warm runs`);
  }
  validateModeStatistics(summary.statistics?.cold, routeName, "cold", expectedRuns);
  validateModeStatistics(summary.statistics?.warm, routeName, "warm", expectedRuns);
  if (!isFiniteNonNegative(summary.lcpP75Milliseconds) || summary.lcpP75Milliseconds > absoluteBudgets.lcpP75Milliseconds) {
    stop(`${routeName} LCP is missing or exceeds 2500ms`);
  }
  if (!isFiniteNonNegative(summary.clsP75) || summary.clsP75 > absoluteBudgets.clsP75) {
    stop(`${routeName} CLS is missing or exceeds 0.1`);
  }
  if (!isFiniteNonNegative(summary.ttfbP75Milliseconds) || summary.ttfbP75Milliseconds > absoluteBudgets.ttfbP75Milliseconds) {
    stop(`${routeName} TTFB is missing or exceeds 800ms`);
  }
  for (const key of ["consoleErrorCount", "hydrationErrorCount", "unexpectedNetworkErrorCount"]) {
    if (summary[key] !== 0) stop(`${routeName} ${key} must be zero`);
  }
  for (const key of [
    "transferP75Bytes",
    "jsTransferP75Bytes",
    "imageTransferP75Bytes",
    "requestCountP75",
    "totalLongTaskP75Milliseconds",
    "longTaskOver50P75Count",
  ]) {
    if (!isFiniteNonNegative(summary[key])) stop(`${routeName} ${key} is missing`);
  }
  const coldP75Pairs = [
    ["lcpP75Milliseconds", "lcpMilliseconds"],
    ["clsP75", "cls"],
    ["ttfbP75Milliseconds", "ttfbMilliseconds"],
    ["transferP75Bytes", "transferBytes"],
    ["jsTransferP75Bytes", "jsTransferBytes"],
    ["imageTransferP75Bytes", "imageTransferBytes"],
    ["requestCountP75", "requestCount"],
    ["totalLongTaskP75Milliseconds", "totalLongTaskMilliseconds"],
    ["longTaskOver50P75Count", "longTaskOver50Count"],
  ];
  for (const [summaryKey, statisticsKey] of coldP75Pairs) {
    if (summary[summaryKey] !== summary.statistics.cold[statisticsKey].p75) {
      stop(`${routeName} ${summaryKey} must match the cold p75 statistic`);
    }
  }
}

function buildBaseline(evidence) {
  if (!Array.isArray(evidence.routeSummaries)) stop("routeSummaries must be an array");
  const summaries = new Map();
  for (const summary of evidence.routeSummaries) {
    if (typeof summary?.route !== "string" || summaries.has(summary.route)) {
      stop("route summaries must have unique route names");
    }
    summaries.set(summary.route, summary);
  }

  const routes = {};
  for (const routeName of requiredReleaseCandidateRoutes) {
    const summary = summaries.get(routeName);
    validateRouteSummary(summary, routeName, evidence.runCountPerCacheMode);
    routes[routeName] = {
      totalTransferBytes: summary.transferP75Bytes,
      jsTransferBytes: summary.jsTransferP75Bytes,
      imageTransferBytes: summary.imageTransferP75Bytes,
      requestCount: summary.requestCountP75,
      totalLongTaskMilliseconds: summary.totalLongTaskP75Milliseconds,
      longTaskOver50Count: summary.longTaskOver50P75Count,
      statistics: structuredClone(summary.statistics),
    };
  }

  return {
    schemaVersion: 1,
    capturedAt: evidence.capturedAt,
    source: "reviewed release-candidate performance evidence",
    measurementClass: evidence.measurementClass,
    measurementProfile: evidence.measurementProfile,
    deploymentSha: evidence.deploymentSha,
    origin: evidence.origin,
    runCount: evidence.runCount,
    runCountPerCacheMode: evidence.runCountPerCacheMode,
    totalRunCountPerRoute: evidence.totalRunCountPerRoute,
    interactionP75Milliseconds: evidence.interactionP75Milliseconds,
    searchInputP75Milliseconds: evidence.searchInputP75Milliseconds,
    routes,
  };
}

if (!promotionApproved) {
  stop("set PHASE6_PERFORMANCE_PROMOTION_APPROVED=1 only after reviewing the capture evidence");
}

const evidence = readEvidence();
validateHeader(evidence);
validateFailures(evidence);
validateInteractionBudgets(evidence);
const baseline = buildBaseline(evidence);
writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

console.log("Phase 6 performance baseline promotion");
console.log(`Deployment SHA: ${baseline.deploymentSha}`);
console.log(`Routes promoted: ${Object.keys(baseline.routes).length}`);
console.log(`Baseline: ${baselinePath}`);
