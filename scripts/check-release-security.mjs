// 이 파일은 출시 전 의존성 audit와 secret 파일 추적 여부를 확인합니다.
import { spawnSync } from "node:child_process";

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

const auditArgs = ["audit", "--prod", "--audit-level", "moderate"];
let audit = run("pnpm", auditArgs);
let auditCommand = "pnpm audit --prod --audit-level moderate";
const auditOutput = `${audit.stdout ?? ""}\n${audit.stderr ?? ""}`;

// pnpm 10 still calls npm's retired audit endpoint and receives HTTP 410.
// Retry only that tooling failure with a pinned pnpm release that uses the bulk endpoint.
if (
  audit.status !== 0
  && /(?:audit endpoint[\s\S]*\b410\b|\b410\b[\s\S]*audit endpoint)/i.test(auditOutput)
) {
  audit = run("npx", ["--yes", "pnpm@11.0.0", ...auditArgs]);
  auditCommand = "npx --yes pnpm@11.0.0 audit --prod --audit-level moderate";
}

if (audit.error) {
  fail("production dependency audit", audit.error.message);
} else if (audit.status === 0) {
  pass("production dependency audit", `${auditCommand} reported no known vulnerabilities at moderate-or-higher severity`);
} else {
  fail(
    "production dependency audit",
    oneLine(`${audit.stdout}\n${audit.stderr}`) || `audit exited ${audit.status ?? "unknown"}`,
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
