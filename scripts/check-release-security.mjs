// 이 파일은 출시 전 의존성 audit와 secret 파일 추적 여부를 확인합니다.
import { spawnSync } from "node:child_process";

const secretPathsThatMustStayIgnored = [
  ".env",
  ".env.local",
  ".env.android-signing.local",
  ".env.store-api.local",
  ".release-secrets",
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

const audit = run("pnpm", ["audit", "--prod", "--audit-level", "moderate"]);
if (audit.error) {
  fail("production dependency audit", audit.error.message);
} else if (audit.status === 0) {
  pass("production dependency audit", "pnpm audit --prod --audit-level moderate reported no known vulnerabilities");
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
