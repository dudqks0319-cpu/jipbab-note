// 이 파일은 App Store/Play Store 제출 직전에 모든 출시 차단 게이트를 모아 확인합니다.
import { spawnSync } from "node:child_process";

const checks = [
  {
    name: "local-release-gates",
    label: "Local release gates",
    args: ["scripts/run-release-gates.mjs"],
  },
  {
    name: "release-security",
    label: "Release security gate",
    args: ["scripts/check-release-security.mjs"],
  },
  {
    name: "external-release-status",
    label: "External release status",
    args: ["scripts/check-external-release-status.mjs"],
  },
  {
    name: "goal-completion",
    label: "Goal completion evidence",
    args: ["scripts/verify-goal-completion.mjs"],
  },
];

function indent(output) {
  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `  ${line}`)
    .join("\n");
}

function runCheck(check) {
  const result = spawnSync(process.execPath, check.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_LIVE_WRITE_TEST: "1",
    },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const status = result.status === 0 ? "pass" : "blocked";

  return {
    ...check,
    status,
    exitCode: result.status ?? 1,
    output,
    error: result.error?.message ?? "",
  };
}

const results = checks.map(runCheck);
const passed = results.filter((result) => result.status === "pass");
const blocked = results.filter((result) => result.status !== "pass");

console.log("Store submission readiness gate");
console.log("This command does not submit to App Store Connect or Google Play.");
console.log(`Passed: ${passed.length}`);
console.log(`Blocked: ${blocked.length}`);

for (const result of results) {
  const marker = result.status === "pass" ? "PASS" : "BLOCKED";
  console.log(`\n${marker}: ${result.label}`);
  console.log(`Command: node ${result.args.join(" ")}`);
  if (result.error) {
    console.log(indent(result.error));
  }
  if (result.output) {
    console.log(indent(result.output));
  }
}

if (blocked.length > 0) {
  console.log("\nStore submission is blocked. Do not submit this build to App Store review or Play production.");
  console.log("Resolve every blocked gate above, then rerun `pnpm release:submit-gate`.");
  process.exit(1);
}

console.log("\nStore submission gate passed.");
console.log("Proceed with store submission only after the operator confirms the target app record and release track.");
