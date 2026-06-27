import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(cwd, "output", "release-evidence", `${stamp}-store-console`);
const bundleId = "com.jipbab.note";
const iosProjectPath = path.join(cwd, "ios/App/App.xcodeproj/project.pbxproj");
const iosBuild = readIosProjectBuildNumber() ?? "2026052001";
const androidPackage = "com.jipbab.note";
const androidVersionCode = "1";
const nativeArtifacts = [
  ["iOS App Store IPA", `ios/build/export-${iosBuild}/App.ipa`],
  ["Android signed AAB", "android/app/build/outputs/bundle/release/app-release.aab"],
];

function readIosProjectBuildNumber() {
  if (!existsSync(iosProjectPath)) {
    return null;
  }

  const source = readFileSync(iosProjectPath, "utf8");
  const match = source.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/);
  return match?.[1]?.trim().replace(/^"|"$/g, "") ?? null;
}

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

function runStoreApiCredentialStatus() {
  const result = spawnSync(process.execPath, ["scripts/check-store-api-credential-status.mjs"], {
    cwd,
    encoding: "utf8",
  });
  const output = [
    `$ ${process.execPath} scripts/check-store-api-credential-status.mjs`,
    "",
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? `ERROR: ${result.error.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    status: result.status === 0 ? "checked" : "failed",
    exitCode: result.status ?? 1,
    output: redact(output),
  };
}

function runAndroidReleaseArtifactCheck() {
  const result = spawnSync(process.execPath, ["scripts/check-android-release-artifact.mjs"], {
    cwd,
    encoding: "utf8",
  });
  const output = [
    `$ ${process.execPath} scripts/check-android-release-artifact.mjs`,
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

function fileDigest(filePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
}

function nativeArtifactLine([label, relativePath]) {
  const absolutePath = path.join(cwd, relativePath);
  if (!existsSync(absolutePath)) {
    return `- ${label}: missing (${relativePath})`;
  }

  const stats = statSync(absolutePath);
  if (stats.isDirectory()) {
    return `- ${label}: present (${relativePath})`;
  }

  return `- ${label}: present (${relativePath}), ${Math.round(stats.size / 1024 / 1024)}MB, sha256 ${fileDigest(absolutePath)}`;
}

function writeUploadArtifactInventory() {
  const inventory = [
    "# Store Upload Artifact Inventory",
    "",
    "Use these exact local artifacts for final store dashboard/API confirmation. This file is not proof of store processing; it only identifies the upload candidates and their digests.",
    "",
    ...nativeArtifacts.map(nativeArtifactLine),
    "",
    "## Required Store Follow-up",
    "",
    `- App Store Connect/TestFlight: confirm uploaded iOS build \`${iosBuild}\` for bundle \`${bundleId}\` is processed and available to internal testers.`,
    `- Google Play Console: upload or confirm the signed AAB for package \`${androidPackage}\`, versionCode \`${androidVersionCode}\`, on the internal testing track.`,
    "- After each dashboard/API state is confirmed, update `docs/store-console-confirmation.md` with the real evidence date and reviewed artifact path.",
    "",
  ].join("\n");

  writeFileSync(path.join(outDir, "upload-artifacts.md"), inventory);
}

function writeOperatorChecklist() {
  const checklist = [
    "# Store Console Operator Checklist",
    "",
    "Use this checklist while confirming App Store Connect/TestFlight and Google Play internal testing. This file is not proof by itself; only mark `docs/store-console-confirmation.md` as confirmed after the matching dashboard or API state has been observed.",
    "",
    "## App Store Connect / TestFlight",
    "",
    "- [ ] Open `upload-artifacts.md` and confirm the expected iOS upload artifact/build identity before dashboard confirmation.",
    `- [ ] Open the JipbabNote app record for bundle \`${bundleId}\`.`,
    `- [ ] Confirm iOS build \`${iosBuild}\` is present in TestFlight.`,
    "- [ ] Confirm the build has finished processing and is usable for testing.",
    "- [ ] Confirm an internal tester group exists and can receive/install the build.",
    "- [ ] Capture a reviewed screenshot, API output packet, or dashboard evidence path.",
    "- [ ] Confirm no account token, API key, private key, or personal document is included in the artifact.",
    "- [ ] If browser access is blocked, use `store-api-env-template.txt` to fill `.env.store-api.local` with placeholders replaced by real IDs and ignored local file paths.",
    "",
    "## Google Play Console / Internal Testing",
    "",
    "- [ ] Open `upload-artifacts.md` and use the listed signed AAB as the upload candidate.",
    `- [ ] Open or create the app record for package \`${androidPackage}\`.`,
    `- [ ] Confirm the signed AAB with versionCode \`${androidVersionCode}\` is uploaded.`,
    "- [ ] Confirm the `internal` testing track exists and includes the target release.",
    "- [ ] Confirm the internal testing release is not only a draft.",
    "- [ ] Capture a reviewed screenshot, API output packet, or dashboard evidence path.",
    "- [ ] Confirm no service-account JSON, OAuth token, or personal document is included in the artifact.",
    "- [ ] If browser access is blocked, use `store-api-env-template.txt` to fill `.env.store-api.local` with placeholders replaced by real IDs and ignored local file paths.",
    "",
    "## After Confirmation",
    "",
    "- [ ] Copy the matching lines from `manual-store-console-template.md` into `docs/store-console-confirmation.md` only for stores that were actually confirmed.",
    "- [ ] Replace `YYYY-MM-DD` with the real confirmation date.",
    "- [ ] Keep evidence artifact fields pointed at reviewed local paths or HTTPS URLs.",
    "- [ ] Rerun `pnpm check:store-console-confirmation`.",
    "- [ ] Rerun `pnpm release:store-api-credential-status`.",
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

function writeStoreApiEnvTemplate() {
  const template = [
    "# Copy the non-comment lines into .env.store-api.local only after creating the matching store API credentials.",
    "# Keep credential files under .release-secrets/ and run chmod 600 on each file.",
    "# This template intentionally contains placeholders only. Do not paste private keys, service-account JSON, JWTs, or access tokens into evidence files.",
    "",
    "# App Store Connect API",
    "APP_STORE_CONNECT_API_KEY_ID=<KEY_ID>",
    "APP_STORE_CONNECT_API_ISSUER_ID=<ISSUER_ID>",
    "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH=.release-secrets/AuthKey_<KEY_ID>.p8",
    `APP_STORE_CONNECT_BUNDLE_ID=${bundleId}`,
    `APP_STORE_CONNECT_BUILD_VERSION=${iosBuild}`,
    "",
    "# Google Play Developer API",
    "GOOGLE_APPLICATION_CREDENTIALS=.release-secrets/google-play-service-account.json",
    `GOOGLE_PLAY_PACKAGE_NAME=${androidPackage}`,
    `GOOGLE_PLAY_VERSION_CODE=${androidVersionCode}`,
    "GOOGLE_PLAY_TRACK=internal",
    "",
    "# Verification",
    "pnpm release:store-api-credential-status",
    "pnpm check:store-console-confirmation",
    "pnpm release:external-status",
    "pnpm release:goal-check",
    "",
  ].join("\n");

  writeFileSync(path.join(outDir, "store-api-env-template.txt"), template);
}

mkdirSync(outDir, { recursive: true });

const check = runStoreConsoleCheck();
const credentialStatus = runStoreApiCredentialStatus();
const androidArtifactCheck = runAndroidReleaseArtifactCheck();
writeFileSync(path.join(outDir, "store-console-confirmation.txt"), `${check.output.trim()}\n`);
writeFileSync(path.join(outDir, "store-api-credential-status.txt"), `${credentialStatus.output.trim()}\n`);
writeFileSync(path.join(outDir, "android-release-artifact.txt"), `${androidArtifactCheck.output.trim()}\n`);
writeUploadArtifactInventory();
writeOperatorChecklist();
writeManualTemplate();
writeStoreApiEnvTemplate();

const summary = [
  "# Store Console Confirmation Packet",
  "",
  `- Captured at: ${new Date().toISOString()}`,
  `- Output directory: ${outDir}`,
  `- Store console check status: ${check.status}`,
  `- Store console check exit code: ${check.exitCode}`,
  `- Store API credential status command: ${credentialStatus.status}`,
  `- Store API credential status exit code: ${credentialStatus.exitCode}`,
  `- Android release artifact check status: ${androidArtifactCheck.status}`,
  `- Android release artifact check exit code: ${androidArtifactCheck.exitCode}`,
  `- Bundle ID: ${bundleId}`,
  `- iOS build: ${iosBuild}`,
  `- Android package: ${androidPackage}`,
  `- Android versionCode: ${androidVersionCode}`,
  "- Note: this packet does not confirm store readiness by itself; it captures the checker output plus a manual confirmation template.",
  "",
  "## Files",
  "",
  "- result: store-console-confirmation.txt",
  "- result: store-api-credential-status.txt",
  "- result: android-release-artifact.txt",
  "- info: upload-artifacts.md",
  "- info: operator-checklist.md",
  "- info: manual-store-console-template.md",
  "- info: store-api-env-template.txt",
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
