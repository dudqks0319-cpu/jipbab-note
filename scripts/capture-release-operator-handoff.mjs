import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(cwd, "output", "release-evidence", `${stamp}-operator-handoff`);

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
    name: "release-security",
    label: "Release security gate",
    successStatus: "pass",
    args: ["scripts/check-release-security.mjs"],
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
const blocked = results.filter((result) => result.status === "blocked");
const summary = [
  "# Release Operator Handoff",
  "",
  `- Captured at: ${new Date().toISOString()}`,
  `- Output directory: ${outDir}`,
  `- Captured packets: ${captured.length}`,
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
  "- App Store Connect/TestFlight: reauthenticate in App Store Connect or configure `.env.store-api.local` from `store-api-env-template.txt`, then verify build `2026052001` processing and internal tester availability.",
  "- Play Console internal testing: complete developer account verification, create/open package `com.jipbab.note`, upload the signed AAB to internal testing, or configure Google Play Developer API credentials after app setup.",
  "",
  "## Final Verification After Unblock",
  "",
  "```bash",
  "pnpm release:security-check",
  "pnpm check:real-device-availability",
  "pnpm check:real-device-qa-evidence",
  "pnpm check:store-console-confirmation",
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
console.log(`Passed gates: ${passed.length}`);
console.log(`Blocked commands: ${blocked.length}`);
if (blocked.length > 0) {
  console.log("Blocked commands:");
  for (const result of blocked) {
    console.log(`- ${result.name}: exit ${result.exitCode}`);
  }
}
