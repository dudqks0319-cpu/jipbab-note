import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const evidencePath = path.join(process.cwd(), "docs/real-device-qa.md");

const requiredEvidence = [
  {
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
  },
  {
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
  },
];

function includesAll(source, terms) {
  return terms.every((term) => source.includes(term));
}

function run() {
  if (!existsSync(evidencePath)) {
    console.error("Real-device QA evidence check failed: docs/real-device-qa.md is missing");
    process.exit(1);
  }

  const evidence = readFileSync(evidencePath, "utf8");
  const failures = [];
  const passes = [];

  for (const item of requiredEvidence) {
    if (includesAll(evidence, item.terms)) {
      passes.push(item.label);
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
