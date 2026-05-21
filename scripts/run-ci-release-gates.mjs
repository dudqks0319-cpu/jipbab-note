// 이 파일은 GitHub Actions에서 실행 가능한 정적 출시 게이트만 모아 검증합니다.
import { spawnSync } from "node:child_process";

const checks = [
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
