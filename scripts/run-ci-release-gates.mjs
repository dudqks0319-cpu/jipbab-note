// 이 파일은 GitHub Actions에서 실행 가능한 정적 출시 게이트만 모아 검증합니다.
import { spawnSync } from "node:child_process";

const checks = [
  {
    name: "core-loop-contract",
    command: "node",
    args: ["scripts/check-core-loop-release.mjs"],
  },
  {
    name: "local-mode-contract",
    command: "node",
    args: ["scripts/check-local-mode-release.mjs"],
  },
  {
    name: "phase6-mobile-accessibility",
    command: "node",
    args: ["scripts/check-phase-6-mobile-accessibility.mjs"],
  },
  {
    name: "phase6-e2e-contract",
    command: "node",
    args: ["scripts/check-phase-6-e2e-contract.mjs"],
  },
  {
    name: "phase6-performance-budget",
    command: "node",
    args: ["scripts/check-phase-6-performance-budget.mjs"],
  },
  {
    name: "phase6-observability",
    command: "node",
    args: ["scripts/check-phase-6-observability.mjs"],
  },
  {
    name: "beginner-goal-readiness",
    command: "node",
    args: ["--experimental-strip-types", "scripts/check-beginner-goal-readiness.mjs"],
  },
  {
    name: "phase1-data-contract",
    command: "node",
    args: ["scripts/check-phase-1-data-contract.mjs"],
  },
  {
    name: "api-v1-contract",
    command: "node",
    args: ["scripts/check-api-v1-contract.mjs"],
  },
  {
    name: "supabase-release-contract",
    command: "node",
    args: ["scripts/check-supabase-release.mjs"],
  },
  {
    name: "partner-links-contract",
    command: "node",
    args: ["scripts/check-partner-links.mjs"],
  },
  {
    name: "store-assets-contract",
    command: "node",
    args: ["scripts/check-store-assets.mjs"],
  },
  {
    name: "cloudflare-config-contract",
    command: "node",
    args: ["scripts/check-cloudflare-config.mjs"],
  },
  {
    name: "release-security",
    command: "node",
    args: ["scripts/check-release-security.mjs"],
  },
  {
    name: "external-unblock-runbook",
    command: "node",
    args: ["scripts/print-release-unblock-runbook.mjs"],
  },
  {
    name: "store-api-credentials-runbook",
    command: "node",
    args: ["scripts/print-store-api-credentials-runbook.mjs"],
  },
];

const intentionallyExternal = [
  "iOS archive/IPA artifact verification",
  "Android signed AAB artifact verification",
  "Supabase live write/RLS",
  "OAuth provider boundary",
  "Vercel Production API smokes",
  "real-device QA",
  "App Store Connect/TestFlight",
  "Google Play internal testing",
];

const failures = [];

for (const check of checks) {
  console.log(`\n=== ${check.name} ===`);
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) {
    failures.push(`${check.name}: ${result.error.message}`);
    continue;
  }

  if (result.status !== 0) {
    failures.push(`${check.name}: exit ${result.status ?? "unknown"}`);
  }
}

console.log("\nCI release gate summary");
console.log(`Passed: ${checks.length - failures.length}`);
console.log(`Failed: ${failures.length}`);
console.log("\nCI intentionally excludes machine-local or account-bound release gates:");
for (const item of intentionallyExternal) {
  console.log(`- ${item}`);
}

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nPASS");
console.log("- all CI-safe release gates passed");
