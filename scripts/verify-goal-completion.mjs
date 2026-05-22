// 이 파일은 현재 릴리스 장부를 기준으로 목표 완료 여부를 보수적으로 판정합니다.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const ledgerPath = path.join(cwd, "docs/current-release-state.md");
const realDeviceQaPath = path.join(cwd, "docs/real-device-qa.md");
const storeConsolePath = path.join(cwd, "docs/store-console-confirmation.md");

const requiredRealDeviceQaTerms = [
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
];

const realDeviceQaExtraEvidence = {
  patterns: [
    {
      label: "iOS evidence date: YYYY-MM-DD",
      pattern: /iOS evidence date: 20\d{2}-\d{2}-\d{2}/,
    },
    {
      label: "Android evidence date: YYYY-MM-DD",
      pattern: /Android evidence date: 20\d{2}-\d{2}-\d{2}/,
    },
  ],
  artifactLabels: ["iOS evidence artifacts", "Android evidence artifacts"],
};

const requiredAppStoreTerms = [
  "App Store Connect/TestFlight: confirmed",
  "Bundle ID: com.jipbab.note",
  "iOS build: 2026052001",
  "TestFlight processing: confirmed",
  "Internal tester availability: confirmed",
];

const appStoreExtraEvidence = {
  patterns: [
    {
      label: "App Store Connect evidence date: YYYY-MM-DD",
      pattern: /App Store Connect evidence date: 20\d{2}-\d{2}-\d{2}/,
    },
  ],
  artifactLabels: ["App Store Connect evidence artifacts"],
};

const requiredPlayConsoleTerms = [
  "Play Console internal testing: confirmed",
  "Android package: com.jipbab.note",
  "AAB upload: confirmed",
  "Internal testing track: confirmed",
];

const playConsoleExtraEvidence = {
  patterns: [
    {
      label: "Play Console evidence date: YYYY-MM-DD",
      pattern: /Play Console evidence date: 20\d{2}-\d{2}-\d{2}/,
    },
  ],
  artifactLabels: ["Play Console evidence artifacts"],
};

function addResult(results, status, label, evidence, nextAction = "") {
  results.push({ status, label, evidence, nextAction });
}

function includesAll(source, terms) {
  return terms.every((term) => source.includes(term));
}

function readOptional(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
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
  const artifactPath = path.isAbsolute(normalized) ? normalized : path.join(cwd, normalized);
  return existsSync(artifactPath);
}

function missingExtraEvidence(source, extraEvidence) {
  const missingPatterns = (extraEvidence.patterns ?? [])
    .filter((requirement) => !requirement.pattern.test(source))
    .map((requirement) => requirement.label);
  const missingArtifacts = (extraEvidence.artifactLabels ?? [])
    .filter((label) => !artifactExists(lineValue(source, label)))
    .map((label) => `${label}: existing local path or URL`);
  return [...missingPatterns, ...missingArtifacts];
}

function evidenceStatus(source, requiredTerms, blockedMarkers, extraEvidence = {}) {
  if (!source) {
    return "missing";
  }
  if (includesAll(source, requiredTerms)) {
    return missingExtraEvidence(source, extraEvidence).length === 0 ? "pass" : "missing";
  }
  if (blockedMarkers.some((marker) => source.includes(marker))) {
    return "blocked";
  }
  return "missing";
}

function runLocalCheck(label, args) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const firstUsefulLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("✔") && !line.startsWith("ℹ"));

  if (result.status === 0) {
    return {
      status: "pass",
      evidence: `${label} passed`,
    };
  }

  return {
    status: "missing",
    evidence: `${label} failed${firstUsefulLine ? `: ${firstUsefulLine}` : ""}`,
  };
}

if (!existsSync(ledgerPath)) {
  console.error("Goal completion check failed: docs/current-release-state.md is missing");
  process.exit(1);
}

const ledger = readFileSync(ledgerPath, "utf8");
const realDeviceQa = readOptional(realDeviceQaPath);
const storeConsole = readOptional(storeConsolePath);
const results = [];
const coreLoopReleaseCheck = runLocalCheck("node scripts/check-core-loop-release.mjs", [
  "scripts/check-core-loop-release.mjs",
]);
const vercelProductionPass = includesAll(ledger, [
  "`pnpm check:vercel-production-env`: pass",
  "Production family route smoke: pass",
  "`pnpm check:production-account-deletion-route`: pass",
]);

addResult(
  results,
  coreLoopReleaseCheck.status,
  "핵심 루프",
  coreLoopReleaseCheck.evidence,
  "pnpm check:core-loop-release 실패 원인 수정",
);

addResult(
  results,
  ledger.includes("`pnpm check:supabase-release`: pass") &&
    /(?:68|81) Supabase contract checks passed/.test(ledger) &&
    (ledger.includes("Production Supabase migration application: local SQL contract verified") ||
      ledger.includes("Production Supabase migration/application: local SQL contract verified"))
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
  vercelProductionPass
    ? "pass"
    : ledger.includes("Production family route smoke: blocked") ||
        ledger.includes("Production account-deletion smoke: blocked safely") ||
        ledger.includes("`pnpm check:production-account-deletion-route`: blocked safely") ||
        ledger.includes("Vercel Production is missing")
      ? "blocked"
      : "missing",
  "Vercel Production server env",
  "production server-only env plus family/account-deletion service-role API smoke evidence",
  "Vercel Production에 SUPABASE_SERVICE_ROLE_KEY/ADMIN_EMAILS 추가 후 재배포 및 production family/account-deletion smoke 재실행",
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
  evidenceStatus(realDeviceQa, requiredRealDeviceQaTerms, [
    "iOS real-device QA: not confirmed",
    "Android real-device QA: not confirmed",
    "not confirmed",
    "not checked",
  ], realDeviceQaExtraEvidence),
  "실기기 QA",
  "docs/real-device-qa.md evidence for real iPhone/Android OAuth, local notification, link-flow, account deletion, and raw-error checks",
  "실기기에서 OAuth/알림/장보기 링크/계정 삭제 요청 확인 후 docs/real-device-qa.md confirmed evidence 갱신",
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
  includesAll(ledger, [
    "`pnpm release:security-check`: pass",
    "production dependency audit",
    "secret file ignore rules",
    "tracked secret files",
  ])
    ? "pass"
    : "missing",
  "보안 릴리즈 게이트",
  "release security check evidence for dependency audit and secret-file tracking controls",
  "pnpm release:security-check 실행 후 docs/current-release-state.md에 pass evidence 갱신",
);

addResult(
  results,
  evidenceStatus(storeConsole, requiredAppStoreTerms, [
    "App Store Connect/TestFlight: not confirmed",
    "TestFlight processing: not confirmed",
    "Internal tester availability: not confirmed",
  ], appStoreExtraEvidence),
  "App Store Connect/TestFlight",
  "docs/store-console-confirmation.md evidence for ASC/TestFlight build processing and internal tester availability",
  "App Store Connect에서 최신 업로드 빌드 처리/내부 테스트 가능 여부 확인 후 docs/store-console-confirmation.md confirmed evidence 갱신",
);

addResult(
  results,
  evidenceStatus(storeConsole, requiredPlayConsoleTerms, [
    "Play Console internal testing: not confirmed",
    "AAB upload: not confirmed",
    "Internal testing track: not confirmed",
  ], playConsoleExtraEvidence),
  "Play Console 내부 테스트",
  "docs/store-console-confirmation.md evidence for signed AAB upload and internal testing processing",
  "Play Console 내부 테스트 트랙에 AAB 업로드 후 docs/store-console-confirmation.md confirmed evidence 갱신",
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
