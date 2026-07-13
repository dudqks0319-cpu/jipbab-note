import { existsSync, readFileSync } from "node:fs";

const files = {
  report: "lib/analytics/dashboard-report.ts",
  events: "lib/analytics/product-events.ts",
  generator: "scripts/generate-phase-6-analytics-dashboard.mjs",
  tests: "tests/analytics-dashboard.test.ts",
  productFixture: "tests/fixtures/phase-6-product-events.jsonl",
  operationalFixture: "tests/fixtures/phase-6-operational-events.jsonl",
  docs: "docs/phase-6-analytics-dashboard.md",
};

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, existsSync(file) ? readFileSync(file, "utf8") : ""]),
);
const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

function includesAll(value, required) {
  return required.every((item) => value.includes(item));
}

check(
  "required dashboard files",
  Object.values(files).every((file) => existsSync(file)),
  "implementation, generator, fixtures, tests, and runbook are present",
);
check(
  "repeatable dashboard commands",
  packageJson.scripts?.["check:phase6-analytics-dashboard"] ===
      "node scripts/check-phase-6-analytics-dashboard.mjs" &&
    packageJson.scripts?.["capture:phase6-analytics-dashboard"] ===
      "node --experimental-strip-types scripts/generate-phase-6-analytics-dashboard.mjs",
  "check and capture commands are exposed without new dependencies",
);
check(
  "release gate wiring",
  localGate.includes("scripts/check-phase-6-analytics-dashboard.mjs") &&
    ciGate.includes("scripts/check-phase-6-analytics-dashboard.mjs"),
  "local and CI-safe release gates include the dashboard contract",
);
check(
  "strict product event parser",
  includesAll(source.events, [
    "parseProductAnalyticsEvent",
    "const EVENT_KEYS = new Set",
    "const PROPERTY_KEYS = new Set",
    'assertAllowedKeys(record, EVENT_KEYS, "event")',
    'assertAllowedKeys(properties, PROPERTY_KEYS, "properties")',
    "timestamp_invalid",
  ]),
  "JSONL product records reject unknown fields and non-canonical timestamps",
);
check(
  "ordered product funnel",
  includesAll(source.report, [
    'event: "onboarding_viewed"',
    'event: "ingredient_added"',
    'event: "recommendation_result_viewed"',
    'event: "recipe_viewed"',
    'event: "cooking_started"',
    'event: "cooking_completed"',
    "cursor += relativeIndex + 1",
  ]),
  "conversion stages require ordered events in the same pseudonymous session",
);
check(
  "seven day return window",
  source.report.includes("elapsed >= 7 * DAY_MILLISECONDS") &&
    source.report.includes("elapsed < 8 * DAY_MILLISECONDS"),
  "D7 return uses the explicit seventh-day 24-hour window",
);
check(
  "recipe quality metrics",
  includesAll(source.report, [
    "completion_rate_pct",
    "abandonment_rate_pct",
    "failure_rate_pct",
    "top_abandonment_step",
    "median_elapsed_seconds",
    "p95_elapsed_seconds",
    "shopping_add_rate_pct",
  ]),
  "start, completion, abandonment, failure, time, and shopping evidence are aggregated",
);
check(
  "transparent review ranking",
  source.report.includes("failure_codes.safety_concern") &&
    source.report.includes("right.failure_rate_pct") &&
    source.report.includes("right.abandonment_rate_pct") &&
    source.report.includes('recipe.starts < 5 ? "insufficient" : "reviewable"'),
  "safety, failure, abandonment, volume, and sample status drive visible ranking",
);
check(
  "operational dashboard metrics",
  includesAll(source.report, [
    "client_error_rate_pct",
    "server_error_rate_pct",
    "p50_latency_ms",
    "p95_latency_ms",
    "deployment_shas",
    "instrumentation_gaps",
  ]),
  "API errors, latency, deployment versions, and missing instrumentation stay explicit",
);
check(
  "privacy-safe aggregate output",
  source.report.includes("unique_session_count") &&
    source.report.includes("privacy_safe_local_evidence_not_live_product_analytics") &&
    !source.report.slice(source.report.indexOf("export function renderPhase6AnalyticsDashboardHtml")).includes(
      "anonymous_session_id",
    ),
  "session IDs are used only for aggregation and are not rendered",
);
check(
  "bounded JSONL input",
  includesAll(source.generator, [
    "MAX_INPUT_BYTES",
    "MAX_RECORDS",
    "too_many_records",
    "line_${index + 1}",
  ]),
  "input size and record count are bounded and failures identify only line numbers",
);
check(
  "local-only generator",
  !source.generator.includes("fetch(") &&
    !source.generator.includes("https://") &&
    !source.generator.includes("http://"),
  "dashboard generation performs no network transmission",
);
check(
  "responsive accessible HTML",
  includesAll(source.report, [
    '<html lang="ko">',
    'href="#main-content"',
    '<main id="main-content" tabindex="-1">',
    '@media (max-width:700px)',
    'role="img"',
    ':focus-visible',
  ]),
  "mobile, keyboard, landmark, and non-hover evidence paths are present",
);
check(
  "evidence-bearing visual style",
  !source.report.includes("linear-gradient") &&
    !source.report.includes("radial-gradient") &&
    !source.report.includes("<canvas") &&
    !source.report.includes("<script"),
  "the report uses direct labels and CSS data bars without decorative or executable layers",
);
check(
  "fixture provenance",
  source.productFixture.includes("fixture_session_") &&
    source.operationalFixture.includes("api.request_completed") &&
    source.docs.includes("합성 QA fixture"),
  "committed examples are clearly synthetic QA evidence",
);
check(
  "dashboard formulas documented",
  includesAll(source.docs, [
    "온보딩 → 재료 등록 → 추천 확인 → 상세 → 조리 시작 → 조리 완료",
    "7일째 24시간",
    "안전 우려",
    "5회 미만",
    "발행 승인 근거가 아니다",
  ]),
  "funnel, retention, ranking, sample, and publication caveats are reviewable",
);
check(
  "analytics remains disabled",
  source.docs.includes("제품 분석 전송은 계속 기본 비활성") &&
    source.events.includes("enabled: false") &&
    source.events.includes('consent: "pending"'),
  "the local dashboard does not enable collection or bypass consent",
);
check(
  "dashboard regression coverage",
  includesAll(source.tests, [
    "ordered product funnel",
    "recipe quality ranking",
    "does not emit session IDs",
    "invalid JSONL",
    "responsive HTML",
  ]),
  "aggregation, privacy, CLI failure, and responsive output boundaries have tests",
);

const failures = checks.filter((item) => !item.passed);
console.log("Phase 6 analytics dashboard contract check");
console.log(`Contracts checked: ${checks.length}`);
console.log(`Failures: ${failures.length}`);
console.log("");
for (const item of checks) {
  console.log(`${item.passed ? "PASS" : "FAIL"} - ${item.name}: ${item.detail}`);
}
if (failures.length > 0) process.exit(1);
