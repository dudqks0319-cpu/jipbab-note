import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// 외부 출시 차단을 푼 직후 운영자가 실행할 절차를 한 곳에서 출력합니다.
const cwd = process.cwd();
const runbookPath = path.join(cwd, "docs/external-release-unblock-runbook.md");

const requiredTerms = [
  "pnpm check:real-device-availability",
  "pnpm release:capture-real-device-qa",
  "pnpm release:capture-operator-handoff",
  "pnpm release:security-check",
  "pnpm check:real-device-qa-evidence",
  "pnpm release:store-api-credential-status",
  "pnpm check:store-console-confirmation",
  "pnpm release:capture-store-submission-packet",
  "pnpm release:appstore-submit-gate",
  "pnpm release:playstore-submit-gate",
  "pnpm release:external-status",
  "pnpm release:goal-check",
  "pnpm release:submit-gate",
  "iPhone `영빈`",
  "App Store Connect/TestFlight: confirmed",
  "Play Console internal testing: confirmed",
  "com.jipbab.note",
  "Blocked: 0",
  "Missing: 0",
];

if (!existsSync(runbookPath)) {
  console.error("Release unblock runbook check");
  console.error("Status: fail");
  console.error(`- missing ${path.relative(cwd, runbookPath)}`);
  process.exit(1);
}

const runbook = readFileSync(runbookPath, "utf8");
const missing = requiredTerms.filter((term) => !runbook.includes(term));

console.log(runbook.trim());

if (missing.length > 0) {
  console.error("");
  console.error("Release unblock runbook check");
  console.error("Status: fail");
  for (const term of missing) {
    console.error(`- missing required term: ${term}`);
  }
  process.exit(1);
}

console.log("");
console.log("Release unblock runbook check");
console.log("Status: pass");
console.log(`Required terms: ${requiredTerms.length}`);
