import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const evidencePath = path.join(process.cwd(), "docs/store-console-confirmation.md");

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
  },
  {
    label: "Google Play Console internal testing",
    terms: [
      "Play Console internal testing: confirmed",
      "Android package: com.jipbab.note",
      "AAB upload: confirmed",
      "Internal testing track: confirmed",
    ],
  },
];

function includesAll(source, terms) {
  return terms.every((term) => source.includes(term));
}

function run() {
  if (!existsSync(evidencePath)) {
    console.error("Store console confirmation check failed: docs/store-console-confirmation.md is missing");
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
    process.exit(1);
  }
}

run();
