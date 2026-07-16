// 이 파일은 출시 전 의존성 audit와 secret 파일 추적 여부를 확인합니다.
import { spawnSync } from "node:child_process";
import {
  buildBulkAuditPayload,
  findBlockingAdvisories,
} from "./npm-bulk-advisory-audit.mjs";

const secretPathsThatMustStayIgnored = [
  ".env",
  ".env.local",
  ".env.android-signing.local",
  ".env.store-api.local",
  ".release-secrets/",
  ".release-secrets/AuthKey_<KEY_ID>.p8",
  ".release-secrets/android-upload.jks",
  ".release-secrets/google-play-service-account.json",
];

const trackedSecretPathPatterns = [
  /^\.env(?:\.|$)(?!example$)/,
  /^\.release-secrets\//,
  /(^|\/)AuthKey_[A-Z0-9]+\.p8$/,
  /(^|\/)android-upload\.jks$/,
  /(^|\/)google-play-service-account\.json$/,
];

const passes = [];
const failures = [];

function pass(label, detail) {
  passes.push({ label, detail });
}

function fail(label, detail) {
  failures.push({ label, detail });
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function oneLine(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" | ");
}

async function runProductionDependencyAudit() {
  const dependencyTree = run("pnpm", ["list", "--prod", "--json", "--depth", "Infinity"]);
  if (dependencyTree.error) {
    throw new Error(dependencyTree.error.message);
  }
  if (dependencyTree.status !== 0) {
    throw new Error(
      oneLine(`${dependencyTree.stdout}\n${dependencyTree.stderr}`) ||
        `pnpm list exited ${dependencyTree.status ?? "unknown"}`,
    );
  }

  let projects;
  try {
    projects = JSON.parse(dependencyTree.stdout);
  } catch {
    throw new Error("pnpm production dependency tree returned invalid JSON");
  }

  const payload = buildBulkAuditPayload(projects);
  const packageCount = Object.keys(payload).length;
  if (packageCount === 0) {
    throw new Error("pnpm production dependency tree contained no auditable packages");
  }

  const response = await fetch(
    "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": "jipbab-note-release-security-check/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(`npm bulk advisory request returned HTTP ${response.status}`);
  }

  let report;
  try {
    report = await response.json();
  } catch {
    throw new Error("npm bulk advisory response returned invalid JSON");
  }

  return {
    packageCount,
    advisories: findBlockingAdvisories(report, "moderate"),
  };
}

try {
  const audit = await runProductionDependencyAudit();
  if (audit.advisories.length === 0) {
    pass(
      "production dependency audit",
      `npm bulk advisory audit checked ${audit.packageCount} installed production packages and found no moderate-or-higher advisories`,
    );
  } else {
    const summary = audit.advisories
      .slice(0, 3)
      .map((advisory) => `${advisory.packageName} ${advisory.severity} ${advisory.ghsa}: ${advisory.title}`)
      .join(" | ");
    fail(
      "production dependency audit",
      `${audit.advisories.length} moderate-or-higher advisories: ${summary}`,
    );
  }
} catch (error) {
  fail(
    "production dependency audit",
    error instanceof Error ? error.message : "npm bulk advisory audit failed",
  );
}

const ignoredFailures = [];
for (const secretPath of secretPathsThatMustStayIgnored) {
  const result = run("git", ["check-ignore", "-q", secretPath]);
  if (result.error || result.status !== 0) {
    ignoredFailures.push(secretPath);
  }
}

if (ignoredFailures.length === 0) {
  pass("secret file ignore rules", ".env* and .release-secrets paths are ignored by git");
} else {
  fail("secret file ignore rules", `not ignored: ${ignoredFailures.join(", ")}`);
}

const tracked = run("git", ["ls-files", "-z"]);
if (tracked.error) {
  fail("tracked secret files", tracked.error.message);
} else if (tracked.status !== 0) {
  fail("tracked secret files", oneLine(`${tracked.stdout}\n${tracked.stderr}`) || "git ls-files failed");
} else {
  const trackedFiles = tracked.stdout.split("\0").filter(Boolean);
  const trackedSecretFiles = trackedFiles.filter((filePath) => {
    if (filePath === ".env.example") {
      return false;
    }

    return trackedSecretPathPatterns.some((pattern) => pattern.test(filePath));
  });

  if (trackedSecretFiles.length === 0) {
    pass("tracked secret files", "no env or release-secret files are tracked");
  } else {
    fail("tracked secret files", trackedSecretFiles.join(", "));
  }
}

const securityDefiner = run("node", ["scripts/check-security-definer-contract.mjs"]);
if (securityDefiner.error) {
  fail("SECURITY DEFINER contract", securityDefiner.error.message);
} else if (securityDefiner.status === 0) {
  pass("SECURITY DEFINER contract", "fixed search paths and least-privilege EXECUTE grants passed");
} else {
  fail(
    "SECURITY DEFINER contract",
    oneLine(`${securityDefiner.stdout}\n${securityDefiner.stderr}`) ||
      `contract check exited ${securityDefiner.status ?? "unknown"}`,
  );
}

console.log("Release security check");
console.log(`Passes: ${passes.length}`);
console.log(`Failures: ${failures.length}`);

if (passes.length > 0) {
  console.log("\nPASS");
  for (const result of passes) {
    console.log(`- ${result.label}: ${result.detail}`);
  }
}

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const result of failures) {
    console.log(`- ${result.label}: ${result.detail}`);
  }
  process.exit(1);
}
