// 이 파일은 출시 후보 로컬 게이트를 순서대로 모두 실행하고 실패 항목을 모읍니다.
import { spawnSync } from "node:child_process";

const checks = [
  {
    name: "core-loop-release",
    command: "node",
    args: ["scripts/check-core-loop-release.mjs"],
  },
  {
    name: "local-mode-release",
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
    name: "phase6-analytics-dashboard",
    command: "node",
    args: ["scripts/check-phase-6-analytics-dashboard.mjs"],
  },
  {
    name: "beginner-goal-readiness",
    command: "node",
    args: ["--experimental-strip-types", "scripts/check-beginner-goal-readiness.mjs"],
  },
  {
    name: "phase5-human-evidence",
    command: "node",
    args: ["--experimental-strip-types", "scripts/check-phase-5-human-evidence.mjs"],
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
    name: "release-readiness",
    command: "node",
    args: ["scripts/release-readiness-check.mjs"],
  },
  {
    name: "supabase-release",
    command: "node",
    args: ["scripts/check-supabase-release.mjs"],
  },
  {
    name: "partner-links",
    command: "node",
    args: ["scripts/check-partner-links.mjs"],
  },
  {
    name: "store-assets",
    command: "node",
    args: ["scripts/check-store-assets.mjs"],
  },
  {
    name: "ios-release",
    command: "node",
    args: ["scripts/check-ios-release-artifact.mjs"],
  },
  {
    name: "android-release",
    command: "node",
    args: ["scripts/check-android-release-artifact.mjs"],
  },
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

console.log("\nRelease gate summary");
console.log(`Passed: ${checks.length - failures.length}`);
console.log(`Failed: ${failures.length}`);

if (failures.length > 0) {
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

console.log("- all local release gates passed");
