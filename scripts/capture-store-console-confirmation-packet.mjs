import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(cwd, "output", "release-evidence", `${stamp}-store-console`);
const bundleId = "com.jipbab.note";
const iosBuild = "2026052001";
const androidPackage = "com.jipbab.note";
const androidVersionCode = "1";

function redact(value) {
  return value
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[redacted-private-key]")
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[redacted-jwt]")
    .replace(/\bya29\.[A-Za-z0-9_-]{20,}\b/g, "[redacted-google-access-token]")
    .replace(/"private_key"\s*:\s*"[^"]+"/g, '"private_key":"[redacted]"')
    .replace(/"client_email"\s*:\s*"[^"]+"/g, '"client_email":"[redacted]"')
    .replace(/((?:APP_STORE_CONNECT_API_PRIVATE_KEY|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS)\s*=\s*)\S+/g, "$1[redacted]");
}

function runStoreConsoleCheck() {
  const result = spawnSync(process.execPath, ["scripts/check-store-console-confirmation.mjs"], {
    cwd,
    encoding: "utf8",
  });
  const output = [
    `$ ${process.execPath} scripts/check-store-console-confirmation.mjs`,
    "",
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? `ERROR: ${result.error.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    status: result.status === 0 ? "pass" : "blocked",
    exitCode: result.status ?? 1,
    output: redact(output),
  };
}

function writeOperatorChecklist() {
  const checklist = [
    "# Store Console Operator Checklist",
    "",
    "Use this checklist while confirming App Store Connect/TestFlight and Google Play internal testing. This file is not proof by itself; only mark `docs/store-console-confirmation.md` as confirmed after the matching dashboard or API state has been observed.",
    "",
    "## App Store Connect / TestFlight",
    "",
    `- [ ] Open the JipbabNote app record for bundle \`${bundleId}\`.`,
    `- [ ] Confirm iOS build \`${iosBuild}\` is present in TestFlight.`,
    "- [ ] Confirm the build has finished processing and is usable for testing.",
    "- [ ] Confirm an internal tester group exists and can receive/install the build.",
    "- [ ] Capture a reviewed screenshot, API output packet, or dashboard evidence path.",
    "- [ ] Confirm no account token, API key, private key, or personal document is included in the artifact.",
    "",
    "## Google Play Console / Internal Testing",
    "",
    `- [ ] Open or create the app record for package \`${androidPackage}\`.`,
    `- [ ] Confirm the signed AAB with versionCode \`${androidVersionCode}\` is uploaded.`,
    "- [ ] Confirm the `internal` testing track exists and includes the target release.",
    "- [ ] Confirm the internal testing release is not only a draft.",
    "- [ ] Capture a reviewed screenshot, API output packet, or dashboard evidence path.",
    "- [ ] Confirm no service-account JSON, OAuth token, or personal document is included in the artifact.",
    "",
    "## After Confirmation",
    "",
    "- [ ] Copy the matching lines from `manual-store-console-template.md` into `docs/store-console-confirmation.md` only for stores that were actually confirmed.",
    "- [ ] Replace `YYYY-MM-DD` with the real confirmation date.",
    "- [ ] Keep evidence artifact fields pointed at reviewed local paths or HTTPS URLs.",
    "- [ ] Rerun `pnpm check:store-console-confirmation`.",
    "- [ ] Rerun `pnpm release:external-status`.",
    "- [ ] Rerun `pnpm release:goal-check`.",
    "",
  ].join("\n");

  writeFileSync(path.join(outDir, "operator-checklist.md"), checklist);
}

function writeManualTemplate() {
  const template = [
    "# Store Console Confirmation Template",
    "",
    "Copy these lines into `docs/store-console-confirmation.md` only after the matching store dashboard or official API check has confirmed the state.",
    "",
    "## App Store Connect / TestFlight",
    "",
    "- App Store Connect/TestFlight: confirmed",
    `- Bundle ID: ${bundleId}`,
    `- iOS build: ${iosBuild}`,
    "- TestFlight processing: confirmed",
    "- Internal tester availability: confirmed",
    "- Evidence owner: app operator",
    "- Evidence date: YYYY-MM-DD",
    "- App Store Connect evidence date: YYYY-MM-DD",
    `- App Store Connect evidence artifacts: ${outDir}`,
    "",
    "## Google Play Console / Internal Testing",
    "",
    "- Play Console internal testing: confirmed",
    `- Android package: ${androidPackage}`,
    "- AAB upload: confirmed",
    "- Internal testing track: confirmed",
    "- Evidence owner: app operator",
    "- Evidence date: YYYY-MM-DD",
    "- Play Console evidence date: YYYY-MM-DD",
    `- Play Console evidence artifacts: ${outDir}`,
    "",
  ].join("\n");

  writeFileSync(path.join(outDir, "manual-store-console-template.md"), template);
}

mkdirSync(outDir, { recursive: true });

const check = runStoreConsoleCheck();
writeFileSync(path.join(outDir, "store-console-confirmation.txt"), `${check.output.trim()}\n`);
writeOperatorChecklist();
writeManualTemplate();

const summary = [
  "# Store Console Confirmation Packet",
  "",
  `- Captured at: ${new Date().toISOString()}`,
  `- Output directory: ${outDir}`,
  `- Store console check status: ${check.status}`,
  `- Store console check exit code: ${check.exitCode}`,
  `- Bundle ID: ${bundleId}`,
  `- iOS build: ${iosBuild}`,
  `- Android package: ${androidPackage}`,
  `- Android versionCode: ${androidVersionCode}`,
  "- Note: this packet does not confirm store readiness by itself; it captures the checker output plus a manual confirmation template.",
  "",
  "## Files",
  "",
  "- result: store-console-confirmation.txt",
  "- info: operator-checklist.md",
  "- info: manual-store-console-template.md",
  "",
  "## Use In Store Ledger",
  "",
  `- App Store Connect evidence artifacts: ${outDir}`,
  `- Play Console evidence artifacts: ${outDir}`,
  "",
  "Keep this directory local unless it has been reviewed for account names, app records, screenshots, API output, and other sensitive details.",
  "",
].join("\n");

writeFileSync(path.join(outDir, "summary.md"), summary);

console.log("Store console confirmation packet captured");
console.log(`Output: ${outDir}`);
console.log(`Status: ${check.status}`);
console.log(`Exit code: ${check.exitCode}`);
if (check.status !== "pass") {
  console.log("Store console confirmation remains blocked; use operator-checklist.md after dashboard/API access is available.");
}
