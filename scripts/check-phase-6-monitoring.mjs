import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "lib/operational-alerts.ts",
  "lib/api-v1-response.ts",
  "tests/operational-alerts.test.ts",
  "docs/monitoring-channel-confirmation.md",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const alerts = readFileSync("lib/operational-alerts.ts", "utf8");
const response = readFileSync("lib/api-v1-response.ts", "utf8");
const tests = readFileSync("tests/operational-alerts.test.ts", "utf8");
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const runbook = readFileSync("docs/phase-6-observability-incident-response.md", "utf8");
const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

function includesAll(source, values) {
  return values.every((value) => source.includes(value));
}

check(
  "required monitoring files",
  requiredFiles.every((file) => existsSync(file)),
  "implementation, API integration, tests, and external confirmation ledger are present",
);
check(
  "package command",
  packageJson.scripts?.["check:phase6-monitoring"] ===
    "node scripts/check-phase-6-monitoring.mjs",
  "repeatable monitoring delivery contract check is exposed",
);
check(
  "release gate wiring",
  localGate.includes("scripts/check-phase-6-monitoring.mjs") &&
    ciGate.includes("scripts/check-phase-6-monitoring.mjs"),
  "local and CI-safe release gates include monitoring delivery",
);
check(
  "server-only configuration",
  includesAll(alerts, [
    "OPERATIONAL_ALERTS_ENABLED",
    "OPERATIONAL_ALERT_WEBHOOK_URL",
    "OPERATIONAL_ALERT_HMAC_SECRET",
  ]) && !alerts.includes("NEXT_PUBLIC_OPERATIONAL_ALERT"),
  "alert URL and signing secret are never public environment variables",
);
check(
  "deny-by-default configuration",
  includesAll(alerts, [
    'OPERATIONAL_ALERTS_ENABLED !== "true"',
    'url.protocol !== "https:"',
    "url.username",
    "url.password",
    "url.search",
    "url.hash",
    "MIN_HMAC_SECRET_LENGTH",
  ]),
  "delivery requires explicit enablement, HTTPS, no URL credentials/query, and a strong secret",
);
check(
  "bounded alert payload",
  includesAll(alerts, [
    'event: "api.request_failed"',
    'level: "error"',
    'metadata.error_code === "INTERNAL_ERROR"',
    "REQUEST_ID_PATTERN",
    "API_OPERATION_ENDPOINTS.includes(metadata.endpoint)",
    "DEPLOYMENT_SHA_PATTERN",
  ]),
  "only an allowlisted internal-error event with bounded identifiers can leave the app",
);
check(
  "signed one-shot delivery",
  includesAll(alerts, [
    'createHmac("sha256"',
    '"X-Jipbab-Alert-Signature"',
    '"X-Jipbab-Alert-Version"',
    "AbortController",
    "ALERT_TIMEOUT_MS",
    'redirect: "error"',
    'credentials: "omit"',
  ]),
  "webhook bodies are HMAC signed, timeout-bounded, non-credentialed, and never redirected",
);
check(
  "response-safe scheduling",
  includesAll(response, [
    "after, NextResponse",
    "queueOperationalAlert",
    "recordAndQueueAlert",
    "scheduleAfterResponse ?? after",
  ]) && includesAll(alerts, ["options.schedule(async () =>", "catch {", "return false"]),
  "Next.js after schedules delivery and failures cannot change the API response",
);
check(
  "privacy and failure tests",
  includesAll(tests, [
    "only the bounded monitoring allowlist",
    "requires explicit enablement",
    "never sends environment secrets",
    "do not trigger alerts",
    "remain isolated from the caller",
  ]),
  "negative paths cover privacy, malformed configuration, expected errors, and sink failure",
);
check(
  "external signoff remains explicit",
  includesAll(runbook, [
    "외부 경보 채널",
    "docs/monitoring-channel-confirmation.md",
    "테스트 경보 수신 증거",
  ]),
  "local delivery proof cannot be confused with an account-bound monitoring channel",
);

const failures = checks.filter((item) => !item.passed);

console.log("Phase 6 monitoring delivery contract check");
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
