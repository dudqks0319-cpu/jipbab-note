import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  buildBulkAuditPayload,
  findBlockingAdvisories,
} from "../scripts/npm-bulk-advisory-audit.mjs";

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
  assert.match(source, /"pnpm", \["list", "--prod", "--json", "--depth", "Infinity"\]/);
  assert.match(source, /security\/advisories\/bulk/);
  assert.doesNotMatch(source, /ignore-registry-errors/);
  assert.match(source, /production dependency audit/);
  assert.match(source, /no moderate-or-higher advisories/i);
});

test("bulk advisory payload includes every installed production version", () => {
  const payload = buildBulkAuditPayload([
    {
      dependencies: {
        react: {
          version: "19.2.3",
          dependencies: {
            scheduler: { version: "0.27.0" },
          },
        },
        alias: {
          version: "1.0.0",
          dependencies: {
            react: { version: "18.3.1" },
          },
        },
      },
    },
  ]);

  assert.deepEqual(payload, {
    alias: ["1.0.0"],
    react: ["18.3.1", "19.2.3"],
    scheduler: ["0.27.0"],
  });
});

test("bulk advisory parser blocks moderate and higher severities", () => {
  const blocking = findBlockingAdvisories({
    safe: [{ severity: "low", title: "low issue", url: "https://example.com/low" }],
    vulnerable: [
      {
        severity: "high",
        title: "high issue",
        url: "https://github.com/advisories/GHSA-abcd-1234-efgh",
      },
      {
        severity: "moderate",
        title: "moderate issue",
        url: "https://github.com/advisories/GHSA-1111-2222-3333",
      },
    ],
  });

  assert.deepEqual(
    blocking.map(({ packageName, severity, ghsa }) => ({ packageName, severity, ghsa })),
    [
      { packageName: "vulnerable", severity: "high", ghsa: "GHSA-ABCD-1234-EFGH" },
      { packageName: "vulnerable", severity: "moderate", ghsa: "GHSA-1111-2222-3333" },
    ],
  );
  assert.throws(() => findBlockingAdvisories([]), /JSON object/);
  assert.throws(
    () => findBlockingAdvisories({ broken: [{ severity: "unknown" }] }),
    /unknown severity/,
  );
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
