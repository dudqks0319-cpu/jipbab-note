import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const vercelEnvCheckSource = readFileSync("scripts/check-vercel-production-env.mjs", "utf8");

test("external release check includes Vercel production env verification", () => {
  assert.equal(
    packageJson.scripts["check:vercel-production-env"],
    "node scripts/check-vercel-production-env.mjs",
  );
  assert.match(packageJson.scripts["release:external-check"], /check:vercel-production-env/);
});

test("Vercel production env check requires server-only release secrets without printing values", () => {
  assert.match(vercelEnvCheckSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(vercelEnvCheckSource, /ADMIN_EMAILS/);
  assert.match(vercelEnvCheckSource, /vercel", \["env", "ls"\]/);
  assert.doesNotMatch(vercelEnvCheckSource, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(vercelEnvCheckSource, /console\.log\(.*value/);
});
