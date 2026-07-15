import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/check-release-security.mjs", "utf8");

test("release security check is wired into package scripts", () => {
  assert.equal(
    packageJson.scripts["release:security-check"],
    "node scripts/check-release-security.mjs",
  );
});

test("release security check audits production dependencies at moderate severity", () => {
  assert.match(source, /auditArgs = \["audit", "--prod", "--audit-level", "moderate"\]/);
  assert.match(source, /run\("pnpm", auditArgs\)/);
  assert.match(source, /pnpm@11\.0\.0/);
  assert.match(source, /audit endpoint.*410|410.*audit endpoint/i);
  assert.match(source, /production dependency audit/);
  assert.match(source, /No known vulnerabilities|no known vulnerabilities/i);
});

test("release security check blocks tracked env and release secret files", () => {
  assert.match(source, /git", \["check-ignore", "-q"/);
  assert.match(source, /\.env\.local/);
  assert.match(source, /\.env\.android-signing\.local/);
  assert.match(source, /\.env\.store-api\.local/);
  assert.match(source, /\.release-secrets/);
  assert.match(source, /git", \["ls-files", "-z"\]/);
  assert.match(source, /trackedSecretPathPatterns/);
  assert.match(source, /\.env\.example/);
});
