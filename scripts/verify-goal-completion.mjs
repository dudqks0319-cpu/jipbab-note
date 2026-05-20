// 이 파일은 현재 릴리스 장부를 기준으로 목표 완료 여부를 보수적으로 판정합니다.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const ledgerPath = path.join(cwd, "docs/current-release-state.md");

function addResult(results, status, label, evidence, nextAction = "") {
  results.push({ status, label, evidence, nextAction });
}

function includesAll(source, terms) {
  return terms.every((term) => source.includes(term));
}

if (!existsSync(ledgerPath)) {
  console.error("Goal completion check failed: docs/current-release-state.md is missing");
  process.exit(1);
}

const ledger = readFileSync(ledgerPath, "utf8");
const results = [];

addResult(
  results,
  includesAll(ledger, [
    "fridge inventory",
    "recipe recommendation",
    "shopping list",
    "purchased-item-to-fridge conversion",
    "Shopping sync fallback: pass",
  ])
    ? "pass"
    : "missing",
  "핵심 루프",
  "fridge -> recipe -> shopping -> purchased item to fridge evidence in release ledger",
  "핵심 루프 증거를 docs/current-release-state.md에 갱신",
);

addResult(
  results,
  includesAll(ledger, [
    "`pnpm check:supabase-release`: pass",
    "68 Supabase contract checks passed",
    "Production Supabase migration application: local SQL contract verified",
  ])
    ? "pass"
    : "missing",
  "Supabase 로컬 RLS/스키마 계약",
  "local Supabase schema/RLS contract evidence in release ledger",
  "pnpm check:supabase-release 재실행",
);

addResult(
  results,
  ledger.includes("`pnpm check:supabase-live` / `pnpm release:external-check`: blocked") ||
    ledger.includes("Supabase live REST check failed")
    ? "blocked"
    : ledger.includes("SUPABASE_LIVE_WRITE_TEST=1") && ledger.includes("pass")
      ? "pass"
      : "missing",
  "운영 Supabase live/read/write/RLS",
  "production Supabase REST and write-isolation evidence",
  "Supabase 프로젝트 복구 후 pnpm release:external-check 및 SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live 실행",
);

addResult(
  results,
  includesAll(ledger, [
    "Auth migration visibility: pass",
    "OAuth provider dashboard callbacks: not verified",
  ])
    ? "blocked"
    : ledger.includes("OAuth provider dashboard callbacks: verified")
      ? "pass"
      : "missing",
  "OAuth/로그인/데이터 이전",
  "auth migration UI evidence plus provider dashboard callback verification",
  "Google/Kakao/Apple provider dashboard와 실기기 콜백 확인",
);

addResult(
  results,
  includesAll(ledger, [
    "iOS simulator",
    "Android emulator smoke",
    "iOS Capacitor HTTPS WebView config",
    "Android Capacitor HTTPS WebView config",
  ])
    ? "pass"
    : "missing",
  "모바일 시뮬레이터/에뮬레이터 QA",
  "iOS simulator, Android emulator, and Capacitor runtime gate evidence",
  "시뮬레이터/에뮬레이터 QA 재실행",
);

addResult(
  results,
  ledger.includes("Real-device QA: not done")
    ? "blocked"
    : ledger.includes("Real-device QA: pass")
      ? "pass"
      : "missing",
  "실기기 QA",
  "real iPhone/Android OAuth, local notification, and link-flow evidence",
  "실기기에서 OAuth/알림/장보기 링크/계정 삭제 요청 확인",
);

addResult(
  results,
  includesAll(ledger, [
    "privacy/terms/support/account-deletion policy content",
    "App Store/Play metadata content",
  ])
    ? "pass"
    : "missing",
  "정책/스토어 문서",
  "release gate verifies privacy, terms, support, deletion, and store metadata content",
  "pnpm release:check 재실행",
);

addResult(
  results,
  ledger.includes("App Store Connect/TestFlight") && ledger.includes("not dashboard-confirmed")
    ? "blocked"
    : ledger.includes("App Store Connect/TestFlight: confirmed")
      ? "pass"
      : "missing",
  "App Store Connect/TestFlight",
  "ASC/TestFlight build processing and availability evidence",
  "App Store Connect에서 build 2026050802 처리/내부 테스트 가능 여부 확인",
);

addResult(
  results,
  ledger.includes("Upload the signed Android AAB to Play Console internal testing")
    ? "blocked"
    : ledger.includes("Play Console internal testing: confirmed")
      ? "pass"
      : "missing",
  "Play Console 내부 테스트",
  "signed AAB upload and internal testing processing evidence",
  "Play Console 내부 테스트 트랙에 AAB 업로드 후 처리 상태 확인",
);

const passed = results.filter((item) => item.status === "pass");
const blocked = results.filter((item) => item.status === "blocked");
const missing = results.filter((item) => item.status === "missing");

console.log("Goal completion check");
console.log(`Passed: ${passed.length}`);
console.log(`Blocked: ${blocked.length}`);
console.log(`Missing: ${missing.length}`);

for (const [title, items] of [
  ["PASS", passed],
  ["BLOCKED", blocked],
  ["MISSING", missing],
]) {
  if (items.length === 0) {
    continue;
  }

  console.log(`\n${title}`);
  for (const item of items) {
    console.log(`- ${item.label}: ${item.evidence}`);
    if (item.status !== "pass" && item.nextAction) {
      console.log(`  next: ${item.nextAction}`);
    }
  }
}

if (blocked.length > 0 || missing.length > 0) {
  console.error("\nGoal is not complete. Do not mark the active goal complete yet.");
  process.exit(1);
}

console.log("\nGoal completion evidence is complete.");
