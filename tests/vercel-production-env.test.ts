import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const vercelEnvCheckSource = readFileSync("scripts/check-vercel-production-env.mjs", "utf8");
const familyRouteSmokeSource = readFileSync("scripts/check-production-family-route.mjs", "utf8");
const cloudflareExternalSource = readFileSync("scripts/check-cloudflare-external-release.mjs", "utf8");

test("external release check includes Vercel production env verification", () => {
  assert.equal(
    packageJson.scripts["check:vercel-production-env"],
    "node scripts/check-vercel-production-env.mjs",
  );
  assert.equal(
    packageJson.scripts["check:production-family-route"],
    "node scripts/check-production-family-route.mjs",
  );
  assert.match(packageJson.scripts["release:external-check"], /check:vercel-production-env/);
  assert.match(packageJson.scripts["release:external-check"], /check:production-family-route/);
  assert.equal(
    packageJson.scripts["release:cloudflare-external-check"],
    "node scripts/check-cloudflare-external-release.mjs",
  );
  assert.match(cloudflareExternalSource, /CHECK_VERCEL_PRODUCTION_ENV: "0"/);
  assert.match(cloudflareExternalSource, /check-production-family-route\.mjs/);
});

test("Vercel production env check requires server-only release secrets without printing values", () => {
  assert.match(vercelEnvCheckSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(vercelEnvCheckSource, /ADMIN_EMAILS/);
  assert.match(vercelEnvCheckSource, /vercel", \["env", "ls"\]/);
  assert.doesNotMatch(vercelEnvCheckSource, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(vercelEnvCheckSource, /console\.log\(.*value/);
});

test("production family route smoke creates, joins, and cleans up without printing secrets", () => {
  assert.match(familyRouteSmokeSource, /\/api\/family-groups/);
  assert.match(familyRouteSmokeSource, /assertVercelProductionServerEnv/);
  assert.match(familyRouteSmokeSource, /CHECK_VERCEL_PRODUCTION_ENV/);
  assert.match(familyRouteSmokeSource, /endsWith\("\.vercel\.app"\)/);
  assert.match(familyRouteSmokeSource, /spawnSync\("vercel", \["env", "ls"\]/);
  assert.match(familyRouteSmokeSource, /action: "create"/);
  assert.match(familyRouteSmokeSource, /action: "join"/);
  assert.match(familyRouteSmokeSource, /family_groups\?id=eq\.\$\{groupId\}/);
  assert.match(familyRouteSmokeSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(familyRouteSmokeSource, /console\.(?:log|error)\([^)]*serviceRoleKey/);
});
