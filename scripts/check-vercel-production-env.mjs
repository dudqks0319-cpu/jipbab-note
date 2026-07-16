import { spawnSync } from "node:child_process";

const requiredProductionEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS",
  "NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED",
  "NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED",
  "NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAILS",
  "API_RATE_LIMIT_HMAC_SECRET",
];

function hasProductionEnv(output, name) {
  return output
    .split(/\r?\n/)
    .some((line) => line.trim().startsWith(name) && /\bProduction\b/.test(line));
}

function run() {
  const result = spawnSync("vercel", ["env", "ls"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.error) {
    console.error(`Vercel production env check failed: ${result.error.message}`);
    process.exit(1);
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    console.error("Vercel production env check failed: unable to list env vars");
    process.exit(result.status ?? 1);
  }

  const missing = requiredProductionEnv.filter((name) => !hasProductionEnv(output, name));

  console.log("Vercel production env check");
  console.log(`Passes: ${requiredProductionEnv.length - missing.length}`);
  console.log(`Failures: ${missing.length}`);

  if (missing.length > 0) {
    console.log("\nFAIL");
    for (const name of missing) {
      console.log(`- ${name}: missing from Production`);
    }
    console.error("\nVercel Production is missing required encrypted env vars.");
    process.exit(1);
  }

  console.log("\nPASS");
  for (const name of requiredProductionEnv) {
    console.log(`- ${name}: present in Production`);
  }
}

run();
