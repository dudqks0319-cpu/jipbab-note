import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("rollback rehearsal commands are wired into package and release gates", () => {
  assert.equal(
    packageJson.scripts["check:phase6-rollback"],
    "node scripts/check-phase-6-rollback-rehearsal.mjs",
  );
  assert.equal(
    packageJson.scripts["capture:phase6-rollback"],
    "node scripts/capture-phase-6-rollback-rehearsal.mjs",
  );
  const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
  const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
  assert.match(localGate, /check-phase-6-rollback-rehearsal\.mjs/);
  assert.match(ciGate, /check-phase-6-rollback-rehearsal\.mjs/);
});

test("prints help without running a rehearsal", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/capture-phase-6-rollback-rehearsal.mjs", "--help"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--target-ref <known-good-commit>/);
  assert.match(result.stdout, /--target-url <known-good-preview>/);
  assert.match(result.stdout, /never changes a Git branch, Vercel alias, or Supabase/);
});

test("rejects a missing target without echoing environment values", () => {
  const sentinel = "SECRET_ROLLBACK_SENTINEL_DO_NOT_PRINT";
  const result = spawnSync(
    process.execPath,
    ["scripts/capture-phase-6-rollback-rehearsal.mjs"],
    { encoding: "utf8", env: { ...process.env, SECRET_ROLLBACK_SENTINEL: sentinel } },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /target_ref_required_or_invalid/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(sentinel));
});

test("rejects a credentialed target URL without echoing it", () => {
  const sentinel = "SECRET_TARGET_URL_SENTINEL";
  const result = spawnSync(
    process.execPath,
    [
      "scripts/capture-phase-6-rollback-rehearsal.mjs",
      "--target-ref",
      "c21b4ae8116836075b33090818b4a68e348c9d1f",
      "--target-url",
      `https://operator:${sentinel}@example.com/`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /target_url_required_or_invalid/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(sentinel));
});

test("rejects a non-JipbabNote host", () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/capture-phase-6-rollback-rehearsal.mjs",
      "--target-ref",
      "c21b4ae8116836075b33090818b4a68e348c9d1f",
      "--target-url",
      "https://example.com/",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /target_url_required_or_invalid/);
});

test("static rollback rehearsal contract passes", () => {
  const result = spawnSync(process.execPath, ["scripts/check-phase-6-rollback-rehearsal.mjs"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Failures: 0/);
});
