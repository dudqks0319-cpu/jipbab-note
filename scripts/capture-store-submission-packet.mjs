// 이 파일은 스토어 콘솔에 올릴 메타데이터와 이미지 파일을 한 제출 패킷으로 묶습니다.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const iosProjectPath = path.join(cwd, "ios/App/App.xcodeproj/project.pbxproj");
const iosBuild = readIosProjectBuildNumber() ?? "2026052001";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(cwd, "output", "release-evidence", `${stamp}-store-submission-packet`);
const screenshotNames = [
  "01-home",
  "02-fridge",
  "03-recipe",
  "04-recipe-detail",
  "05-shopping",
];

const files = [
  {
    section: "App Store Connect",
    label: "Korean metadata",
    source: "docs/app-store-connect-metadata-ko.md",
    target: "app-store-connect/metadata-ko.md",
  },
  ...screenshotNames.map((name) => ({
    section: "App Store Connect",
    label: `${name}.png`,
    source: `docs/app-store-screenshots/2026-05-19-iphone69/${name}.png`,
    target: `app-store-connect/screenshots/${name}.png`,
  })),
  {
    section: "Google Play",
    label: "Korean metadata",
    source: "docs/play-store-metadata-ko.md",
    target: "google-play/metadata-ko.md",
  },
  ...screenshotNames.map((name) => ({
    section: "Google Play",
    label: `${name}.jpg`,
    source: `docs/play-store-assets/phone/${name}.jpg`,
    target: `google-play/phone-screenshots/${name}.jpg`,
  })),
  {
    section: "Google Play",
    label: "feature-graphic.png",
    source: "docs/play-store-assets/feature-graphic.png",
    target: "google-play/feature-graphic.png",
  },
  {
    section: "Shared",
    label: "app-icon-512.png",
    source: "public/icons/app-icon-512.png",
    target: "shared/app-icon-512.png",
  },
];

function readIosProjectBuildNumber() {
  const source = readFileSync(iosProjectPath, "utf8");
  const match = source.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/);
  return match?.[1]?.trim().replace(/^"|"$/g, "") ?? null;
}

function runStoreAssetCheck() {
  const result = spawnSync(process.execPath, ["scripts/check-store-assets.mjs"], {
    cwd,
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    console.log("Store submission packet blocked because store assets are not ready.");
    if (output) {
      console.log(output);
    }
    process.exit(result.status ?? 1);
  }
  return output;
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

function manifestFor(copiedFiles, assetCheckOutput) {
  const sections = [...new Set(copiedFiles.map((item) => item.section))];
  const lines = [
    "# Store Submission Packet",
    "",
    `- Captured at: ${new Date().toISOString()}`,
    `- Output directory: ${outDir}`,
    "- Upload behavior: this command does not upload to App Store Connect or Google Play.",
    "- Source asset gate: `node scripts/check-store-assets.mjs` passed before copying files.",
    "- App Store target: bundle ID `com.jipbab.note`, build `" + iosBuild + "`.",
    "- Google Play target: package `com.jipbab.note`, internal testing track before production.",
    "",
    "## Store Asset Check",
    "",
    "```txt",
    assetCheckOutput,
    "```",
    "",
    "## Files",
    "",
  ];

  for (const section of sections) {
    lines.push(`### ${section}`, "");
    for (const item of copiedFiles.filter((file) => file.section === section)) {
      lines.push(
        `- ${item.label}: \`${item.target}\` from \`${item.source}\` (${item.bytes} bytes, sha256:${item.sha256})`,
      );
    }
    lines.push("");
  }

  lines.push("## Operator Notes", "");
  lines.push("- Upload the App Store screenshots in the numbered filename order.");
  lines.push("- Upload Google Play phone screenshots in the same numbered order, then `feature-graphic.png`.");
  lines.push("- Do not submit for review until `pnpm release:submit-gate` passes.");
  lines.push("- Keep this output directory local until screenshots and account identifiers have been reviewed.");
  lines.push("");

  return lines.join("\n");
}

const assetCheckOutput = runStoreAssetCheck();
mkdirSync(outDir, { recursive: true });
const copiedFiles = files.map(copyPacketFile);
writeFileSync(path.join(outDir, "store-submission-packet.md"), manifestFor(copiedFiles, assetCheckOutput));

console.log("Store submission packet captured");
console.log("This command does not upload to App Store Connect or Google Play.");
console.log(`Output: ${outDir}`);
console.log(`Files: ${copiedFiles.length}`);
