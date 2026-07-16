import { spawnSync } from "node:child_process";

const CLOUDFLARE_APP_URL =
  process.env.PRODUCTION_APP_URL || process.env.CAPACITOR_SERVER_URL || "";

if (!CLOUDFLARE_APP_URL) {
  console.error("Set PRODUCTION_APP_URL or CAPACITOR_SERVER_URL to the Cloudflare app URL.");
  process.exit(2);
}

const sharedEnv = {
  SUPABASE_LIVE_WRITE_TEST: "1",
  CHECK_VERCEL_PRODUCTION_ENV: "0",
  PRODUCTION_APP_URL: CLOUDFLARE_APP_URL,
  NEXT_PUBLIC_SITE_URL: CLOUDFLARE_APP_URL,
  CAPACITOR_SERVER_URL: CLOUDFLARE_APP_URL,
};

const checks = [
  {
    label: "Cloudflare live home",
    args: ["scripts/check-cloudflare-live-home.mjs"],
  },
  {
    label: "Supabase live read/write/RLS",
    args: ["scripts/check-supabase-live.mjs"],
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
    label: "Cloudflare production family route smoke",
    args: ["scripts/check-production-family-route.mjs"],
  },
  {
    label: "Cloudflare production account-deletion route smoke",
    args: ["scripts/check-production-account-deletion-route.mjs"],
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
      ...sharedEnv,
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

console.log("Cloudflare external release status");
console.log(`URL: ${CLOUDFLARE_APP_URL}`);
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
  console.log("\nCloudflare external release checks are not complete.");
  process.exit(1);
}

console.log("\nCloudflare external release checks passed.");
