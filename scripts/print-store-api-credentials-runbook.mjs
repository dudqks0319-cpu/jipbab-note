import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// 스토어 콘솔 확인을 브라우저 세션 대신 공식 API로 재현하기 위한 credential runbook을 검증합니다.
const cwd = process.cwd();
const runbookPath = path.join(cwd, "docs/store-api-credentials-runbook.md");

const requiredTerms = [
  "APP_STORE_CONNECT_API_KEY_ID",
  "APP_STORE_CONNECT_API_ISSUER_ID",
  "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH",
  "APP_STORE_CONNECT_BUNDLE_ID=com.jipbab.note",
  "APP_STORE_CONNECT_BUILD_VERSION=2026052001",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_PLAY_PACKAGE_NAME=com.jipbab.note",
  "GOOGLE_PLAY_VERSION_CODE=1",
  "GOOGLE_PLAY_TRACK=internal",
  ".release-secrets/",
  "chmod 600",
  "커밋하지 않습니다",
  "pnpm check:store-console-confirmation",
  "pnpm release:external-status",
  "pnpm release:goal-check",
  "git check-ignore -v",
];

if (!existsSync(runbookPath)) {
  console.error("Store API credentials runbook check");
  console.error("Status: fail");
  console.error(`- missing ${path.relative(cwd, runbookPath)}`);
  process.exit(1);
}

const runbook = readFileSync(runbookPath, "utf8");
const missing = requiredTerms.filter((term) => !runbook.includes(term));

console.log(runbook.trim());

if (missing.length > 0) {
  console.error("");
  console.error("Store API credentials runbook check");
  console.error("Status: fail");
  for (const term of missing) {
    console.error(`- missing required term: ${term}`);
  }
  process.exit(1);
}

console.log("");
console.log("Store API credentials runbook check");
console.log("Status: pass");
console.log(`Required terms: ${requiredTerms.length}`);
