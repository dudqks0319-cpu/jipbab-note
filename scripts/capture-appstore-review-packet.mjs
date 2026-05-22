// This file gathers App Store-only review materials without uploading anything.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(cwd, "output", "release-evidence", `${stamp}-appstore-review-packet`);
const appStoreScreenshotDir = "docs/app-store-screenshots/2026-05-19-iphone69";
const screenshotNames = [
  "01-home",
  "02-fridge",
  "03-recipe",
  "04-recipe-detail",
  "05-shopping",
];

const files = [
  {
    label: "Korean App Store metadata",
    source: "docs/app-store-connect-metadata-ko.md",
    target: "metadata-ko.md",
  },
  ...screenshotNames.map((name) => ({
    label: `${name}.png`,
    source: `${appStoreScreenshotDir}/${name}.png`,
    target: `screenshots/${name}.png`,
  })),
  {
    label: "app-icon-512.png",
    source: "public/icons/app-icon-512.png",
    target: "app-icon-512.png",
  },
  {
    label: "store console confirmation ledger",
    source: "docs/store-console-confirmation.md",
    target: "store-console-confirmation.md",
  },
];

function redact(value) {
  return value
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[redacted-private-key]")
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[redacted-jwt]")
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[redacted-api-key]")
    .replace(/\b(AIza[0-9A-Za-z_-]{20,})\b/g, "[redacted-google-api-key]")
    .replace(/((?:SUPABASE_SERVICE_ROLE_KEY|APP_STORE_CONNECT_API_PRIVATE_KEY|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)\s*=\s*)\S+/g, "$1[redacted]");
}

function runNodeScript(args) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_LIVE_WRITE_TEST: "1",
    },
  });
  const output = redact(`${result.stdout ?? ""}${result.stderr ?? ""}`).trim();
  return {
    status: result.status === 0 ? "pass" : "blocked",
    exitCode: result.status ?? 1,
    output,
  };
}

function readPngInfo(relativePath) {
  const filePath = path.join(cwd, relativePath);
  const buffer = readFileSync(filePath);
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${relativePath} is not a PNG file`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

function checkAppStoreAssets() {
  const passes = [];
  const failures = [];

  for (const name of screenshotNames) {
    const relativePath = `${appStoreScreenshotDir}/${name}.png`;
    if (!existsSync(path.join(cwd, relativePath))) {
      failures.push(`${relativePath}: missing`);
      continue;
    }

    try {
      const info = readPngInfo(relativePath);
      if (info.width === 1290 && info.height === 2796) {
        passes.push(`${relativePath}: ${info.width}x${info.height}`);
      } else {
        failures.push(`${relativePath}: expected 1290x2796, got ${info.width}x${info.height}`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `${relativePath}: unreadable image`);
    }
  }

  for (const relativePath of ["app/icon.png", "public/icons/app-icon-512.png"]) {
    if (!existsSync(path.join(cwd, relativePath))) {
      failures.push(`${relativePath}: missing`);
      continue;
    }

    try {
      const info = readPngInfo(relativePath);
      if (info.width === 512 && info.height === 512 && info.colorType === 2) {
        passes.push(`${relativePath}: ${info.width}x${info.height} RGB`);
      } else {
        failures.push(`${relativePath}: expected 512x512 RGB, got ${info.width}x${info.height}`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `${relativePath}: unreadable image`);
    }
  }

  const lines = [
    "App Store asset subset check",
    `Passes: ${passes.length}`,
    `Failures: ${failures.length}`,
    "",
  ];
  if (passes.length > 0) {
    lines.push("PASS", ...passes.map((item) => `- ${item}`), "");
  }
  if (failures.length > 0) {
    lines.push("FAIL", ...failures.map((item) => `- ${item}`), "");
  }

  return {
    status: failures.length === 0 ? "pass" : "blocked",
    output: lines.join("\n").trim(),
  };
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function copyPacketFile(item) {
  const sourcePath = path.join(cwd, item.source);
  const targetPath = path.join(outDir, item.target);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
  const stats = statSync(targetPath);
  return {
    ...item,
    bytes: stats.size,
    sha256: sha256(targetPath),
  };
}

function manifestFor({ assetCheck, iosArtifact, submitGate, copiedFiles }) {
  const lines = [
    "# App Store Review Packet",
    "",
    `- Captured at: ${new Date().toISOString()}`,
    `- Output directory: ${outDir}`,
    "- Upload behavior: this command does not upload to App Store Connect and does not submit for review.",
    "- Target bundle ID: `com.jipbab.note`.",
    "- Target build: `2026052001`.",
    `- App Store asset subset check: ${assetCheck.status}`,
    `- iOS release artifact check: ${iosArtifact.status}`,
    `- App Store submission readiness gate: ${submitGate.status}`,
    "",
    "## App Store Asset Subset Check",
    "",
    "```txt",
    assetCheck.output,
    "```",
    "",
    "## iOS Release Artifact Check",
    "",
    "```txt",
    iosArtifact.output,
    "```",
    "",
    "## App Store Submission Readiness Gate",
    "",
    "```txt",
    submitGate.output,
    "```",
    "",
    "## Files",
    "",
  ];

  for (const item of copiedFiles) {
    lines.push(
      `- ${item.label}: \`${item.target}\` from \`${item.source}\` (${item.bytes} bytes, sha256:${item.sha256})`,
    );
  }

  lines.push(
    "",
    "## Operator Notes",
    "",
    "- Upload the screenshots in numbered filename order.",
    "- Use `metadata-ko.md` for App Store Connect Korean listing text and review notes.",
    "- Use `store-console-confirmation.md` only as the latest evidence ledger; do not change it to `confirmed` without actual App Store Connect/TestFlight evidence.",
    "- Do not submit for review until `pnpm release:appstore-submit-gate` passes.",
    "- Keep this output directory local until screenshots, account names, and device identifiers have been reviewed.",
    "",
  );

  return lines.join("\n");
}

const assetCheck = checkAppStoreAssets();
if (assetCheck.status !== "pass") {
  console.log("App Store review packet blocked because App Store assets are not ready.");
  console.log(assetCheck.output);
  process.exit(1);
}

const iosArtifact = runNodeScript(["scripts/check-ios-release-artifact.mjs"]);
if (iosArtifact.status !== "pass") {
  console.log("App Store review packet blocked because the iOS release artifact is not ready.");
  console.log(iosArtifact.output);
  process.exit(iosArtifact.exitCode);
}

const submitGate = runNodeScript(["scripts/check-appstore-submit-readiness.mjs"]);
mkdirSync(outDir, { recursive: true });
const copiedFiles = files.map(copyPacketFile);
writeFileSync(path.join(outDir, "appstore-assets-check.txt"), `${assetCheck.output}\n`);
writeFileSync(path.join(outDir, "ios-release-artifact.txt"), `${iosArtifact.output}\n`);
writeFileSync(path.join(outDir, "appstore-submit-gate.txt"), `${submitGate.output}\n`);
writeFileSync(path.join(outDir, "appstore-review-packet.md"), manifestFor({ assetCheck, iosArtifact, submitGate, copiedFiles }));

console.log("App Store review packet captured");
console.log("This command does not upload to App Store Connect and does not submit for review.");
console.log(`Output: ${outDir}`);
console.log(`Files: ${copiedFiles.length}`);
console.log(`App Store submission readiness gate: ${submitGate.status}`);
if (submitGate.status !== "pass") {
  console.log("App Store review submission is still blocked. Resolve appstore-submit-gate before submitting.");
}
