import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const ciGateSource = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const workflowSource = readFileSync(".github/workflows/release-gate.yml", "utf8");

test("CI static release gate is wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:ci-static-check"],
    "node scripts/run-ci-release-gates.mjs",
  );
});

test("CI static release gate runs only repository-local deterministic release checks", () => {
  assert.match(ciGateSource, /scripts\/check-supabase-release\.mjs/);
  assert.match(ciGateSource, /scripts\/check-partner-links\.mjs/);
  assert.match(ciGateSource, /scripts\/check-store-assets\.mjs/);
  assert.match(ciGateSource, /CI intentionally excludes machine-local or account-bound release gates/);
  assert.doesNotMatch(ciGateSource, /check-supabase-live\.mjs/);
  assert.doesNotMatch(ciGateSource, /check-oauth-live\.mjs/);
  assert.doesNotMatch(ciGateSource, /check-real-device-availability\.mjs/);
  assert.doesNotMatch(ciGateSource, /check-store-console-confirmation\.mjs/);
});

test("GitHub release workflow runs code gates and keeps goal status informational", () => {
  assert.match(workflowSource, /pnpm install --frozen-lockfile/);
  assert.match(workflowSource, /pnpm test/);
  assert.match(workflowSource, /pnpm build/);
  assert.match(workflowSource, /pnpm release:ci-static-check/);
  assert.match(workflowSource, /pnpm release:goal-check \|\| true/);
  assert.doesNotMatch(workflowSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflowSource, /ADMIN_EMAILS/);
  assert.doesNotMatch(workflowSource, /release:external-check/);
  assert.doesNotMatch(workflowSource, /release:full-check/);
});
