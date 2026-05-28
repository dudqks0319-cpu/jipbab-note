import { spawnSync } from "node:child_process";

const checks = [
  {
    label: "Supabase live read/write/RLS",
    args: ["scripts/check-supabase-live.mjs"],
    env: {
      SUPABASE_LIVE_WRITE_TEST: "1",
    },
  },
  {
    label: "Supabase Storage path policy",
    args: ["scripts/check-supabase-storage-live.mjs"],
  },
  {
    label: "OAuth provider start/callback boundary",
    args: ["scripts/check-oauth-live.mjs"],
  },
  {
    label: "Vercel Production env",
    args: ["scripts/check-vercel-production-env.mjs"],
  },
  {
    label: "Production family route smoke",
    args: ["scripts/check-production-family-route.mjs"],
  },
  {
    label: "Production account-deletion route smoke",
    args: ["scripts/check-production-account-deletion-route.mjs"],
  },
  {
    label: "Android real-device availability",
    args: ["scripts/check-real-device-availability.mjs", "--platform=android"],
  },
  {
    label: "Android real-device QA evidence",
    args: ["scripts/check-real-device-qa-evidence.mjs", "--platform=android"],
  },
  {
    label: "Google Play Console internal testing confirmation",
    args: ["scripts/check-store-console-confirmation.mjs", "--platform=play"],
  },
];

function indent(output) {
  return output
    .trim()
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join("\n");
}

function runCheck(check) {
  const result = spawnSync(process.execPath, check.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      ...(check.env ?? {}),
    },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const status = result.status === 0 ? "pass" : "blocked";

  return {
    ...check,
    output,
    status,
    exitCode: result.status ?? 1,
    error: result.error?.message ?? "",
  };
}

const results = checks.map(runCheck);
const passed = results.filter((result) => result.status === "pass");
const blocked = results.filter((result) => result.status !== "pass");

console.log("Play Store external release status");
console.log("This command checks shared production blockers and Android/Play Store blockers only; it does not validate App Store readiness.");
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
  console.log("\nPlay Store external release is not complete. Resolve blocked Android/Play Store items before Play production submission.");
  process.exit(1);
}

console.log("\nPlay Store external release checks passed.");
