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
  assert.match(ciGateSource, /scripts\/check-core-loop-release\.mjs/);
  assert.match(ciGateSource, /scripts\/check-local-mode-release\.mjs/);
  assert.match(ciGateSource, /scripts\/check-beginner-goal-readiness\.mjs/);
  assert.match(ciGateSource, /scripts\/check-phase-1-data-contract\.mjs/);
  assert.match(ciGateSource, /--experimental-strip-types/);
  assert.match(ciGateSource, /scripts\/check-supabase-release\.mjs/);
  assert.match(ciGateSource, /scripts\/check-partner-links\.mjs/);
  assert.match(ciGateSource, /scripts\/check-store-assets\.mjs/);
  assert.match(ciGateSource, /scripts\/check-release-security\.mjs/);
  assert.match(ciGateSource, /scripts\/print-release-unblock-runbook\.mjs/);
  assert.match(ciGateSource, /scripts\/print-store-api-credentials-runbook\.mjs/);
  assert.match(ciGateSource, /CI intentionally excludes machine-local or account-bound release gates/);
  assert.doesNotMatch(ciGateSource, /check-supabase-live\.mjs/);
  assert.doesNotMatch(ciGateSource, /check-oauth-live\.mjs/);
  assert.doesNotMatch(ciGateSource, /check-real-device-availability\.mjs/);
  assert.doesNotMatch(ciGateSource, /check-store-console-confirmation\.mjs/);
});

test("GitHub release workflow runs code gates and keeps goal status informational", () => {
  assert.match(workflowSource, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"/);
  assert.match(workflowSource, /actions\/checkout v6\.0\.2/);
  assert.match(workflowSource, /actions\/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd/);
  assert.match(workflowSource, /actions\/setup-node v6\.4\.0/);
  assert.match(workflowSource, /actions\/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e/);
  assert.doesNotMatch(workflowSource, /uses: actions\/checkout@v/);
  assert.doesNotMatch(workflowSource, /uses: actions\/setup-node@v/);
  assert.match(workflowSource, /pnpm install --frozen-lockfile/);
  assert.match(workflowSource, /pnpm test/);
  assert.match(workflowSource, /pnpm test:integration/);
  assert.match(workflowSource, /pnpm test:content/);
  assert.match(workflowSource, /pnpm build/);
  assert.match(workflowSource, /pnpm capture:phase6-e2e-negative/);
  assert.match(workflowSource, /pnpm capture:phase6-e2e-happy/);
  assert.match(workflowSource, /pnpm release:ci-static-check/);
  assert.match(workflowSource, /pnpm release:security-check/);
  assert.match(workflowSource, /pnpm release:goal-report/);
  for (const requiredCheck of [
    "Code Quality / Test",
    "Code Quality / Integration",
    "Content / Recipe Validation",
    "Build / Next Production",
    "Browser / Negative",
    "Browser / Happy Fixture",
    "Security / Release",
    "Release / Static Gates",
  ]) {
    assert.match(workflowSource, new RegExp(`name: ${requiredCheck.replace("/", "\\/")}`));
  }
  assert.match(workflowSource, /outputs:\n\s+test: \$\{\{ steps\.test\.outcome \}\}/);
  assert.match(workflowSource, /id: browser_happy\n\s+if: steps\.build\.outcome == 'success'/);
  assert.match(workflowSource, /continue-on-error: true/);
  assert.match(workflowSource, /integration\/\*\*/);
  assert.equal(
    packageJson.scripts["release:candidate-gate"],
    "node scripts/verify-goal-completion.mjs",
  );
  assert.equal(
    packageJson.scripts["release:security-check"],
    "node scripts/check-release-security.mjs",
  );
  assert.match(packageJson.scripts["release:full-check"], /pnpm release:security-check/);
  assert.match(packageJson.scripts["release:full-check"], /pnpm release:external-check/);
  assert.match(packageJson.scripts["release:external-check"], /pnpm check:supabase-storage-live/);
  assert.doesNotMatch(workflowSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflowSource, /ADMIN_EMAILS/);
  assert.doesNotMatch(workflowSource, /release:external-check/);
  assert.doesNotMatch(workflowSource, /release:full-check/);
});
