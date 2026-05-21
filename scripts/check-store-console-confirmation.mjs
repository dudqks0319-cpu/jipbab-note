import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const evidencePath = path.join(process.cwd(), "docs/store-console-confirmation.md");
const envPaths = [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env.android-signing.local")];

const apiCredentialGroups = [
  {
    label: "App Store Connect API",
    envNames: [
      "APP_STORE_CONNECT_API_KEY_ID",
      "APP_STORE_CONNECT_API_ISSUER_ID",
      "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH",
    ],
  },
  {
    label: "Google Play Developer API",
    envNames: ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "GOOGLE_APPLICATION_CREDENTIALS"],
    anyOf: true,
  },
];

const requiredEvidence = [
  {
    label: "App Store Connect/TestFlight",
    terms: [
      "App Store Connect/TestFlight: confirmed",
      "Bundle ID: com.jipbab.note",
      "iOS build: 2026052001",
      "TestFlight processing: confirmed",
      "Internal tester availability: confirmed",
    ],
    patterns: [
      {
        label: "App Store Connect evidence date: YYYY-MM-DD",
        pattern: /App Store Connect evidence date: 20\d{2}-\d{2}-\d{2}/,
      },
      {
        label: "App Store Connect evidence artifacts: non-pending path or URL",
        pattern: /App Store Connect evidence artifacts: (?!pending\b).+/,
      },
    ],
  },
  {
    label: "Google Play Console internal testing",
    terms: [
      "Play Console internal testing: confirmed",
      "Android package: com.jipbab.note",
      "AAB upload: confirmed",
      "Internal testing track: confirmed",
    ],
    patterns: [
      {
        label: "Play Console evidence date: YYYY-MM-DD",
        pattern: /Play Console evidence date: 20\d{2}-\d{2}-\d{2}/,
      },
      {
        label: "Play Console evidence artifacts: non-pending path or URL",
        pattern: /Play Console evidence artifacts: (?!pending\b).+/,
      },
    ],
  },
];

function includesAll(source, terms) {
  return terms.every((term) => source.includes(term));
}

function readConfiguredEnvNames() {
  const names = new Set(Object.keys(process.env));
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      continue;
    }

    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/);
      if (match) {
        names.add(match[1]);
      }
    }
  }
  return names;
}

function missingApiCredentialGroups(configuredEnvNames) {
  return apiCredentialGroups.flatMap((group) => {
    const present = group.envNames.filter((name) => configuredEnvNames.has(name));
    const complete = group.anyOf ? present.length > 0 : present.length === group.envNames.length;
    if (complete) {
      return [];
    }

    return [
      {
        label: group.label,
        missing: group.anyOf ? [`one of ${group.envNames.join(", ")}`] : group.envNames.filter((name) => !present.includes(name)),
      },
    ];
  });
}

function run() {
  if (!existsSync(evidencePath)) {
    console.error("Store console confirmation check failed: docs/store-console-confirmation.md is missing");
    process.exit(1);
  }

  const evidence = readFileSync(evidencePath, "utf8");
  const configuredEnvNames = readConfiguredEnvNames();
  const missingApiCredentials = missingApiCredentialGroups(configuredEnvNames);
  const failures = [];
  const passes = [];

  for (const item of requiredEvidence) {
    if (includesAll(evidence, item.terms)) {
      const missingPatterns = (item.patterns ?? [])
        .filter((requirement) => !requirement.pattern.test(evidence))
        .map((requirement) => requirement.label);
      if (missingPatterns.length === 0) {
        passes.push(item.label);
      } else {
        failures.push({ label: item.label, missing: missingPatterns });
      }
    } else {
      const missing = item.terms.filter((term) => !evidence.includes(term));
      failures.push({ label: item.label, missing });
    }
  }

  console.log("Store console confirmation check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Failures: ${failures.length}`);

  if (passes.length > 0) {
    console.log("\nPASS");
    for (const pass of passes) {
      console.log(`- ${pass}: confirmation evidence present`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFAIL");
    for (const failure of failures) {
      console.log(`- ${failure.label}: missing confirmation evidence`);
      for (const term of failure.missing) {
        console.log(`  - ${term}`);
      }
    }

    if (missingApiCredentials.length > 0) {
      console.log("\nHINT");
      console.log("- Browser confirmation is still required unless store API credentials are configured.");
      for (const item of missingApiCredentials) {
        console.log(`- ${item.label}: missing ${item.missing.join(", ")}`);
      }
    }

    process.exit(1);
  }
}

run();
