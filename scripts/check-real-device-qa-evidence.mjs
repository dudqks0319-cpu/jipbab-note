import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const evidencePath = path.join(process.cwd(), "docs/real-device-qa.md");
const allowedPlatforms = new Set(["all", "ios", "android"]);

function targetPlatform() {
  const arg = process.argv.find((item) => item.startsWith("--platform="));
  const rawValue = (arg?.split("=")[1] || process.env.REAL_DEVICE_PLATFORM || "all").toLowerCase();
  if (!allowedPlatforms.has(rawValue)) {
    console.error(`Unknown real-device QA platform: ${rawValue}`);
    console.error("Use --platform=ios, --platform=android, or --platform=all.");
    process.exit(2);
  }
  return rawValue;
}

const requiredEvidence = [
  {
    platform: "ios",
    label: "iOS real-device QA",
    terms: [
      "iOS real-device QA: confirmed",
      "Device: iPhone",
      "iOS build: 2026052001",
      "Bundle ID: com.jipbab.note",
      "iOS core loop: confirmed",
      "iOS Google login: confirmed",
      "iOS Apple login: confirmed",
      "iOS Kakao login: confirmed",
      "iOS local notification permission and scheduling: confirmed",
      "iOS shopping external link: confirmed",
      "iOS account deletion request: confirmed",
      "iOS raw error disclosure: not observed",
    ],
    patterns: [
      {
        label: "iOS evidence date: YYYY-MM-DD",
        pattern: /iOS evidence date: 20\d{2}-\d{2}-\d{2}/,
      },
    ],
    artifactLabels: ["iOS evidence artifacts"],
  },
  {
    platform: "android",
    label: "Android real-device QA",
    terms: [
      "Android real-device QA: confirmed",
      "Device: Android",
      "Android package: com.jipbab.note",
      "Android core loop: confirmed",
      "Android Google login: confirmed",
      "Android Kakao login: confirmed",
      "Android Apple login/provider behavior: confirmed",
      "Android local notification permission and scheduling: confirmed",
      "Android shopping external link: confirmed",
      "Android account deletion request: confirmed",
      "Android back navigation: confirmed",
      "Android raw error disclosure: not observed",
    ],
    patterns: [
      {
        label: "Android evidence date: YYYY-MM-DD",
        pattern: /Android evidence date: 20\d{2}-\d{2}-\d{2}/,
      },
    ],
    artifactLabels: ["Android evidence artifacts"],
  },
];

function includesAll(source, terms) {
  return terms.every((term) => source.includes(term));
}

function lineValue(source, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^\\s*-\\s*${escapedLabel}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function artifactExists(value) {
  const normalized = value.replace(/^`|`$/g, "").trim();
  if (!normalized || normalized === "pending") {
    return false;
  }
  if (/^https?:\/\//.test(normalized)) {
    return true;
  }
  const artifactPath = path.isAbsolute(normalized) ? normalized : path.join(process.cwd(), normalized);
  return existsSync(artifactPath);
}

function missingExtraEvidence(source, item) {
  const missingPatterns = (item.patterns ?? [])
    .filter((requirement) => !requirement.pattern.test(source))
    .map((requirement) => requirement.label);
  const missingArtifacts = (item.artifactLabels ?? [])
    .filter((label) => !artifactExists(lineValue(source, label)))
    .map((label) => `${label}: existing local path or URL`);
  return [...missingPatterns, ...missingArtifacts];
}

function run() {
  if (!existsSync(evidencePath)) {
    console.error("Real-device QA evidence check failed: docs/real-device-qa.md is missing");
    process.exit(1);
  }

  const evidence = readFileSync(evidencePath, "utf8");
  const platform = targetPlatform();
  const evidenceItems = requiredEvidence.filter((item) => platform === "all" || item.platform === platform);
  const failures = [];
  const passes = [];

  for (const item of evidenceItems) {
    if (includesAll(evidence, item.terms)) {
      const missingExtra = missingExtraEvidence(evidence, item);
      if (missingExtra.length === 0) {
        passes.push(item.label);
      } else {
        failures.push({ label: item.label, missing: missingExtra });
      }
    } else {
      const missing = item.terms.filter((term) => !evidence.includes(term));
      failures.push({ label: item.label, missing });
    }
  }

  console.log("Real-device QA evidence check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Failures: ${failures.length}`);

  if (passes.length > 0) {
    console.log("\nPASS");
    for (const pass of passes) {
      console.log(`- ${pass}: evidence present`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFAIL");
    for (const failure of failures) {
      console.log(`- ${failure.label}: missing real-device QA evidence`);
      for (const term of failure.missing) {
        console.log(`  - ${term}`);
      }
    }
    process.exit(1);
  }
}

run();
