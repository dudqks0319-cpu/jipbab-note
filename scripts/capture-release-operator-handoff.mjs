import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const iosProjectPath = path.join(cwd, "ios/App/App.xcodeproj/project.pbxproj");
const iosBuild = readIosProjectBuildNumber() ?? "2026052001";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(cwd, "output", "release-evidence", `${stamp}-operator-handoff`);

function readIosProjectBuildNumber() {
  if (!existsSync(iosProjectPath)) {
    return null;
  }

  const source = readFileSync(iosProjectPath, "utf8");
  const match = source.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/);
  return match?.[1]?.trim().replace(/^"|"$/g, "") ?? null;
}

const commands = [
  {
    name: "external-evidence",
    label: "External status evidence",
    successStatus: "captured",
    args: ["scripts/capture-external-release-evidence.mjs"],
  },
  {
    name: "real-device-qa-packet",
    label: "Real-device QA packet",
    successStatus: "captured",
    args: ["scripts/capture-real-device-qa-packet.mjs"],
  },
  {
    name: "store-console-packet",
    label: "Store console packet",
    successStatus: "captured",
    args: ["scripts/capture-store-console-confirmation-packet.mjs"],
  },
  {
    name: "store-api-credential-status",
    label: "Store API credential status",
    successStatus: "checked",
    args: ["scripts/check-store-api-credential-status.mjs"],
  },
  {
    name: "store-submission-packet",
    label: "Store submission metadata and image packet",
    successStatus: "captured",
    args: ["scripts/capture-store-submission-packet.mjs"],
  },
  {
    name: "appstore-review-packet",
    label: "App Store review packet",
    successStatus: "captured",
    args: ["scripts/capture-appstore-review-packet.mjs"],
  },
  {
    name: "release-security",
    label: "Release security gate",
    successStatus: "pass",
    args: ["scripts/check-release-security.mjs"],
  },
  {
    name: "appstore-submit-gate",
    label: "App Store submission readiness gate",
    successStatus: "pass",
    args: ["scripts/check-appstore-submit-readiness.mjs"],
  },
  {
    name: "playstore-submit-gate",
    label: "Play Store submission readiness gate",
    successStatus: "pass",
    args: ["scripts/check-playstore-submit-readiness.mjs"],
  },
  {
    name: "goal-check",
    label: "Goal completion status",
    successStatus: "pass",
    args: ["scripts/verify-goal-completion.mjs"],
  },
];

function redact(value) {
  return value
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[redacted-private-key]")
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[redacted-jwt]")
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[redacted-api-key]")
    .replace(/\b(AIza[0-9A-Za-z_-]{20,})\b/g, "[redacted-google-api-key]")
    .replace(/"private_key"\s*:\s*"[^"]+"/g, '"private_key":"[redacted]"')
    .replace(/"client_email"\s*:\s*"[^"]+"/g, '"client_email":"[redacted]"')
    .replace(/((?:SUPABASE_SERVICE_ROLE_KEY|ADMIN_EMAILS|APP_STORE_CONNECT_API_PRIVATE_KEY|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS)\s*=\s*)\S+/g, "$1[redacted]");
}

function runCommand(command) {
  const result = spawnSync(process.execPath, command.args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_LIVE_WRITE_TEST: "1",
    },
  });
  const rawOutput = [
    `$ ${process.execPath} ${command.args.join(" ")}`,
    "",
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? `ERROR: ${result.error.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const output = redact(rawOutput);
  const outputMatch = output.match(/^Output:\s*(.+)$/m);

  return {
    ...command,
    status: result.status === 0 ? command.successStatus : "blocked",
    exitCode: result.status ?? 1,
    output,
    nestedOutputDir: outputMatch?.[1]?.trim() ?? "",
  };
}

mkdirSync(outDir, { recursive: true });

const results = commands.map(runCommand);
for (const result of results) {
  writeFileSync(path.join(outDir, `${result.name}.txt`), `${result.output.trim()}\n`);
}

const passed = results.filter((result) => result.status === "pass");
const captured = results.filter((result) => result.status === "captured");
const checked = results.filter((result) => result.status === "checked");
const blocked = results.filter((result) => result.status === "blocked");
const summary = [
  "# Release Operator Handoff",
  "",
  `- Captured at: ${new Date().toISOString()}`,
  `- Output directory: ${outDir}`,
  `- Captured packets: ${captured.length}`,
  `- Checked commands: ${checked.length}`,
  `- Passed gates: ${passed.length}`,
  `- Blocked commands: ${blocked.length}`,
  "- Note: this handoff does not approve store release by itself; it gathers current blocker evidence and the exact next operator actions.",
  "",
  "## Command Outputs",
  "",
  ...results.map((result) => `- ${result.status}: ${result.label} (${result.name}.txt)${result.nestedOutputDir ? ` -> ${result.nestedOutputDir}` : ""}`),
  "",
  "## Remaining External Actions",
  "",
  "- Real-device QA: use the latest real-device packet's `device-unblock-checklist.md`, then run the physical-device flows in `operator-checklist.md` before updating `docs/real-device-qa.md`.",
  "- Store API credentials: review `store-api-credential-status.txt`; if it still reports `Ready: 0`, configure `.env.store-api.local` from `store-api-env-template.txt` before relying on official store API verification.",
  `- App Store Connect/TestFlight: reauthenticate in App Store Connect or configure \`.env.store-api.local\` from \`store-api-env-template.txt\`, then verify build \`${iosBuild}\` processing and internal tester availability.`,
  "- Play Console internal testing: complete developer account verification, create/open package `com.jipbab.note`, upload the signed AAB to internal testing, or configure Google Play Developer API credentials after app setup.",
  "- Platform submit gates: run `pnpm release:appstore-submit-gate` and `pnpm release:playstore-submit-gate` to confirm each store lane before running the combined `pnpm release:submit-gate`.",
  "- Store metadata and images: use the latest store submission packet for App Store screenshots, Play screenshots, feature graphic, icon, and Korean metadata. If iOS is ready before Play, use the latest App Store review packet for the App Store-only upload set.",
  "",
  "## Final Verification After Unblock",
  "",
  "```bash",
  "pnpm release:security-check",
  "pnpm check:real-device-availability",
  "pnpm check:real-device-qa-evidence",
  "pnpm release:store-api-credential-status",
  "pnpm check:store-console-confirmation",
  "pnpm release:capture-store-submission-packet",
  "pnpm release:capture-appstore-review-packet",
  "pnpm release:appstore-submit-gate",
  "pnpm release:playstore-submit-gate",
  "pnpm release:external-status",
  "pnpm release:goal-check",
  "pnpm release:submit-gate",
  "```",
  "",
  "Keep this directory local unless it has been reviewed for screenshots, account names, device identifiers, and other sensitive details.",
  "",
].join("\n");

writeFileSync(path.join(outDir, "operator-handoff.md"), summary);

console.log("Release operator handoff captured");
console.log(`Output: ${outDir}`);
console.log(`Captured packets: ${captured.length}`);
console.log(`Checked commands: ${checked.length}`);
console.log(`Passed gates: ${passed.length}`);
console.log(`Blocked commands: ${blocked.length}`);
if (blocked.length > 0) {
  console.log("Blocked commands:");
  for (const result of blocked) {
    console.log(`- ${result.name}: exit ${result.exitCode}`);
  }
}
