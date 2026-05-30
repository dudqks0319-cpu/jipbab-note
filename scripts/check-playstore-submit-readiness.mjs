import { spawnSync } from "node:child_process";

const checks = [
  {
    label: "Core loop release gate",
    args: ["scripts/check-core-loop-release.mjs"],
  },
  {
    label: "Local mode release gate",
    args: ["scripts/check-local-mode-release.mjs"],
  },
  {
    label: "Release readiness gate",
    args: ["scripts/release-readiness-check.mjs", "--platform=playstore"],
  },
  {
    label: "Supabase local RLS/schema gate",
    args: ["scripts/check-supabase-release.mjs"],
  },
  {
    label: "Partner link gate",
    args: ["scripts/check-partner-links.mjs"],
  },
  {
    label: "Store asset gate",
    args: ["scripts/check-store-assets.mjs"],
  },
  {
    label: "Android release artifact gate",
    args: ["scripts/check-android-release-artifact.mjs"],
  },
  {
    label: "Release security gate",
    args: ["scripts/check-release-security.mjs"],
  },
  {
    label: "Play Store external status",
    args: ["scripts/check-playstore-external-status.mjs"],
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

console.log("Play Store submission readiness gate");
console.log("This command does not submit to Google Play.");
console.log("This command does not validate App Store review readiness.");
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
  console.log("\nPlay Store submission is blocked. Do not submit this build to Play production.");
  console.log("Resolve every blocked Play Store gate above, then rerun `pnpm release:playstore-submit-gate`.");
  process.exit(1);
}

console.log("\nPlay Store submission gate passed.");
console.log("Proceed with Play production submission only after confirming the target app record and release track in Google Play Console.");
