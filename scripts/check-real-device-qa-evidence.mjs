import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const evidencePath = path.join(process.cwd(), "docs/real-device-qa.md");
const iosProjectPath = path.join(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj");
const envFilePath = path.join(process.cwd(), ".env.local");
const allowedPlatforms = new Set(["all", "ios", "android"]);
const providerEnvKeys = {
  google: "NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED",
  apple: "NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED",
  kakao: "NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED",
};

function readIosProjectBuildNumber() {
  if (!existsSync(iosProjectPath)) {
    return null;
  }

  const source = readFileSync(iosProjectPath, "utf8");
  const match = source.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/);
  return match?.[1]?.trim().replace(/^"|"$/g, "") ?? null;
}

const expectedIosBuild = readIosProjectBuildNumber() ?? "2026052001";

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const pairs = {};
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    pairs[key] = value;
  }
  return pairs;
}

function parseBooleanFlag(value) {
  if (!value || !value.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return null;
}

function resolveEnabledProviders() {
  const env = {
    ...readEnvFile(envFilePath),
    ...process.env,
  };
  const explicitList = new Set(
    (env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  const hasExplicitList = explicitList.size > 0;

  return Object.entries(providerEnvKeys)
    .filter(([provider, envKey]) => {
      const flagValue = parseBooleanFlag(env[envKey]);
      if (flagValue !== null) {
        return flagValue;
      }
      return hasExplicitList ? explicitList.has(provider) : false;
    })
    .map(([provider]) => provider);
}

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

const enabledProviders = resolveEnabledProviders();

function providerTerms(platform) {
  const terms = [];
  if (enabledProviders.includes("google")) {
    terms.push(`${platform} Google login: confirmed`);
  }
  if (platform === "iOS" && enabledProviders.includes("apple")) {
    terms.push("iOS Apple login: confirmed");
  }
  if (platform === "Android" && enabledProviders.includes("apple")) {
    terms.push("Android Apple login/provider behavior: confirmed");
  }
  if (enabledProviders.includes("kakao")) {
    terms.push(`${platform} Kakao login: confirmed`);
  }
  return terms;
}

const requiredEvidence = [
  {
    platform: "ios",
    label: "iOS real-device QA",
    terms: [
      "iOS real-device QA: confirmed",
      "Device: iPhone",
      `iOS build: ${expectedIosBuild}`,
      "Bundle ID: com.jipbab.note",
      "iOS core loop: confirmed",
      ...providerTerms("iOS"),
      "iOS local notification permission and scheduling: confirmed",
      "iOS shopping external link: confirmed",
      "iOS account deletion: confirmed",
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
      ...providerTerms("Android"),
      "Android local notification permission and scheduling: confirmed",
      "Android shopping external link: confirmed",
      "Android account deletion: confirmed",
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasEvidenceTerm(source, term) {
  return new RegExp(`^\\s*-\\s*${escapeRegExp(term)}\\s*$`, "m").test(source);
}

function includesAll(source, terms) {
  return terms.every((term) => hasEvidenceTerm(source, term));
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
      const missing = item.terms.filter((term) => !hasEvidenceTerm(evidence, term));
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
