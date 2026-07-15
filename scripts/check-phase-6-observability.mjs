import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "lib/operational-telemetry.ts",
  "lib/analytics/product-events.ts",
  "docs/phase-6-observability-incident-response.md",
  "tests/product-analytics.test.ts",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const operational = readFileSync("lib/operational-telemetry.ts", "utf8");
const apiResponse = readFileSync("lib/api-v1-response.ts", "utf8");
const analytics = readFileSync("lib/analytics/product-events.ts", "utf8");
const runbook = readFileSync("docs/phase-6-observability-incident-response.md", "utf8");
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const routeSources = [
  readFileSync("app/api/v1/recipes/route.ts", "utf8"),
  readFileSync("app/api/v1/recipes/[id]/route.ts", "utf8"),
  readFileSync("app/api/v1/recommendations/route.ts", "utf8"),
  readFileSync("app/api/v1/recipe-feedback/route.ts", "utf8"),
  readFileSync("app/api/v1/recipe-progress/route.ts", "utf8"),
];

const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

function includesAll(source, values) {
  return values.every((value) => source.includes(value));
}

const metadataBlock = operational.match(/export type ApiOperationMetadata = \{([\s\S]*?)\n\};/)?.[1] ?? "";
const metadataKeys = [...metadataBlock.matchAll(/^\s+([a-z_]+)\??:/gm)].map((match) => match[1]);
const eventBlock = analytics.match(/PRODUCT_ANALYTICS_EVENT_NAMES = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
const eventNames = [...eventBlock.matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);

check(
  "required observability files",
  requiredFiles.every((file) => existsSync(file)),
  "implementation, analytics contract, runbook, and tests are present",
);
check(
  "package command",
  packageJson.scripts?.["check:phase6-observability"] ===
    "node scripts/check-phase-6-observability.mjs",
  "repeatable Phase 6 observability check is exposed",
);
check(
  "local release gate wiring",
  localGate.includes("scripts/check-phase-6-observability.mjs"),
  "local release gate includes observability",
);
check(
  "CI release gate wiring",
  ciGate.includes("scripts/check-phase-6-observability.mjs"),
  "CI-safe release gate includes observability",
);
check(
  "operational metadata allowlist",
  JSON.stringify(metadataKeys) ===
    JSON.stringify(["request_id", "endpoint", "status", "latency_ms", "error_code", "deployment_sha"]),
  "only plan-approved request metadata is emitted",
);
check(
  "bounded API endpoint allowlist",
  includesAll(operational, [
    '"GET /api/v1/recipes"',
    '"GET /api/v1/recipes/:id"',
    '"POST /api/v1/recommendations"',
    '"POST /api/v1/recipe-feedback"',
    '"GET /api/v1/recipe-progress"',
    '"POST /api/v1/recipe-progress"',
  ]),
  "API v1 list, detail, recommendation, feedback, and progress endpoints are named without raw URLs",
);
check(
  "one-shot request recorder",
  includesAll(operational, ["createApiOperationRecorder", "let recorded = false", "if (recorded)", "recorded = true"]),
  "each request records at most one completion event",
);
check(
  "response boundary integration",
  includesAll(apiResponse, [
    "createApiOperationRecorder",
    "recordAndQueueAlert(status)",
    "recordAndQueueAlert(status, code)",
  ]),
  "success and error responses share the same recorder and alert queue boundary",
);
check(
  "API route integration",
  routeSources.every((source) => source.includes("createApiV1Responder")),
  "all API v1 route modules use the observed responder",
);
check(
  "product event catalog",
  eventNames.length === 33 && new Set(eventNames).size === 33,
  "all 33 plan events are unique",
);
check(
  "product common properties",
  includesAll(analytics, [
    "anonymous_session_id",
    "user_status",
    "recipe_id",
    "recipe_version",
    "screen",
    "app_version",
    "platform",
    "deployment_sha",
    "experiment_id",
  ]),
  "plan common properties are explicit",
);
check(
  "structured event measurements",
  includesAll(analytics, ["ingredient_count", "step_number", "elapsed_seconds", "filter_id", "failure_code"]),
  "counts and failure reasons are bounded identifiers rather than free text",
);
check(
  "analytics disabled by default",
  includesAll(analytics, ["enabled: false", 'consent: "pending"', "options.enabled !== true"]),
  "local and unconfigured runtimes do not send analytics",
);
check(
  "analytics consent and transport gates",
  includesAll(analytics, ['options.consent !== "granted"', "!options.transport", "options.transport.send(payload)"]),
  "explicit consent and transport are both required",
);
check(
  "incident alert thresholds",
  includesAll(runbook, ["P0", "P1", "10%", "5분", "3%", "15분", "p95", "2,000ms"]),
  "severity, time windows, and minimum samples are documented",
);
check(
  "incident rollback and privacy gates",
  includesAll(runbook, [
    "vercel rollback <deployment-id> --yes",
    "restorable backup",
    "기본 비활성",
    "사용자 동의",
    "보관기간",
    "request body",
    "외부 경보 채널: 미연결",
  ]),
  "rollback, external wiring blockers, and no-free-text logging are explicit",
);

const failures = checks.filter((item) => !item.passed);

console.log("Phase 6 observability and analytics contract check");
console.log(`Contracts checked: ${checks.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) {
    console.log(`- ${failure.name}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log("\nPASS");
for (const item of checks) {
  console.log(`- ${item.name}: ${item.detail}`);
}
