import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const adbPath = process.env.ADB_PATH || "/Users/jyb-m3max/Library/Android/sdk/platform-tools/adb";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(cwd, "output", "release-evidence", stamp);

const captures = [
  {
    name: "external-status",
    command: process.execPath,
    args: ["scripts/check-external-release-status.mjs"],
  },
  {
    name: "real-device-availability",
    command: process.execPath,
    args: ["scripts/check-real-device-availability.mjs"],
  },
  {
    name: "real-device-qa-evidence",
    command: process.execPath,
    args: ["scripts/check-real-device-qa-evidence.mjs"],
  },
  {
    name: "store-console-confirmation",
    command: process.execPath,
    args: ["scripts/check-store-console-confirmation.mjs"],
  },
  {
    name: "ios-devicectl-devices",
    command: "xcrun",
    args: ["devicectl", "list", "devices"],
  },
  {
    name: "ios-xctrace-devices",
    command: "xcrun",
    args: ["xctrace", "list", "devices"],
  },
  {
    name: "android-adb-devices",
    command: adbPath,
    args: ["devices", "-l"],
    skipWhenMissing: true,
  },
];

function redact(value) {
  return value
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[redacted-private-key]")
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[redacted-jwt]")
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[redacted-api-key]")
    .replace(/\b(AIza[0-9A-Za-z_-]{20,})\b/g, "[redacted-google-api-key]")
    .replace(/((?:SUPABASE_SERVICE_ROLE_KEY|ADMIN_EMAILS|APP_STORE_CONNECT_API_PRIVATE_KEY|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)\s*=\s*)\S+/g, "$1[redacted]");
}

function runCapture(capture) {
  if (capture.skipWhenMissing && !existsSync(capture.command)) {
    return {
      ...capture,
      status: "skipped",
      exitCode: null,
      output: `${capture.command} not found`,
    };
  }

  const result = spawnSync(capture.command, capture.args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_LIVE_WRITE_TEST: "1",
    },
  });

  const output = [
    `$ ${[capture.command, ...capture.args].join(" ")}`,
    "",
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? `ERROR: ${result.error.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ...capture,
    status: result.status === 0 ? "pass" : "blocked",
    exitCode: result.status ?? 1,
    output: redact(output),
  };
}

mkdirSync(outDir, { recursive: true });

const results = captures.map(runCapture);
for (const result of results) {
  const filePath = path.join(outDir, `${result.name}.txt`);
  writeFileSync(filePath, `${result.output.trim()}\n`);
}

const passed = results.filter((result) => result.status === "pass");
const blocked = results.filter((result) => result.status === "blocked");
const skipped = results.filter((result) => result.status === "skipped");
const summary = [
  "# External Release Evidence Capture",
  "",
  `- Captured at: ${new Date().toISOString()}`,
  `- Output directory: ${outDir}`,
  `- Passed: ${passed.length}`,
  `- Blocked: ${blocked.length}`,
  `- Skipped: ${skipped.length}`,
  "- Note: pass/blocked below is each capture command's exit status, not store-release approval.",
  "",
  "## Files",
  "",
  ...results.map((result) => `- ${result.status}: ${result.name}.txt`),
  "",
  "## Use In Release Ledger",
  "",
  `- Real-device evidence artifacts: ${outDir}`,
  `- Store console evidence artifacts: ${outDir}`,
  "",
  "Keep this directory local unless it has been reviewed for screenshots, account names, device identifiers, and other sensitive details.",
  "",
].join("\n");

writeFileSync(path.join(outDir, "summary.md"), summary);

console.log("External release evidence captured");
console.log(`Output: ${outDir}`);
console.log(`Passed: ${passed.length}`);
console.log(`Blocked: ${blocked.length}`);
console.log(`Skipped: ${skipped.length}`);
if (blocked.length > 0) {
  console.log("Blocked captures:");
  for (const result of blocked) {
    console.log(`- ${result.name}: exit ${result.exitCode}`);
  }
}
