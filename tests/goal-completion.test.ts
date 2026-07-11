import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync("scripts/verify-goal-completion.mjs", "utf8");

test("goal completion check reads direct real-device and store evidence files", () => {
  assert.match(source, /docs\/real-device-qa\.md/);
  assert.match(source, /docs\/store-console-confirmation\.md/);
  assert.match(source, /readOptional\(realDeviceQaPath\)/);
  assert.match(source, /readOptional\(storeConsolePath\)/);
});

test("goal completion check requires platform-specific real-device QA evidence", () => {
  assert.match(source, /iOS real-device QA: confirmed/);
  assert.match(source, /Android real-device QA: confirmed/);
  assert.match(source, /iOS core loop: confirmed/);
  assert.match(source, /Android core loop: confirmed/);
  assert.match(source, /iOS Apple login: confirmed/);
  assert.match(source, /Android Apple login\/provider behavior: confirmed/);
  assert.match(source, /iOS local notification permission and scheduling: confirmed/);
  assert.match(source, /Android local notification permission and scheduling: confirmed/);
  assert.match(source, /iOS raw error disclosure: not observed/);
  assert.match(source, /Android raw error disclosure: not observed/);
  assert.match(source, /iOS evidence date: YYYY-MM-DD/);
  assert.match(source, /Android evidence date: YYYY-MM-DD/);
  assert.match(source, /iOS evidence artifacts/);
  assert.match(source, /Android evidence artifacts/);
});

test("goal completion check requires store console confirmation evidence", () => {
  assert.match(source, /App Store Connect\/TestFlight: confirmed/);
  assert.match(source, /TestFlight processing: confirmed/);
  assert.match(source, /Internal tester availability: confirmed/);
  assert.match(source, /Play Console internal testing: confirmed/);
  assert.match(source, /AAB upload: confirmed/);
  assert.match(source, /Internal testing track: confirmed/);
  assert.match(source, /App Store Connect evidence date: YYYY-MM-DD/);
  assert.match(source, /App Store Connect evidence artifacts/);
  assert.match(source, /Play Console evidence date: YYYY-MM-DD/);
  assert.match(source, /Play Console evidence artifacts/);
  assert.match(source, /existing local path or URL/);
  assert.match(source, /existsSync\(artifactPath\)/);
});

test("goal completion check requires both production family and account-deletion smokes", () => {
  assert.match(source, /vercelProductionPass/);
  assert.match(source, /check:vercel-production-env`: pass/);
  assert.match(source, /Production family route smoke: pass/);
  assert.match(source, /check:production-account-deletion-route`: pass/);
  assert.match(source, /Production account-deletion smoke: blocked safely/);
});

test("goal completion check requires release security gate evidence", () => {
  assert.match(source, /보안 릴리즈 게이트/);
  assert.match(source, /`pnpm release:security-check`: pass/);
  assert.match(source, /production dependency audit/);
  assert.match(source, /secret file ignore rules/);
  assert.match(source, /tracked secret files/);
});

test("goal completion check runs the executable core loop release check", () => {
  assert.match(source, /scripts\/check-core-loop-release\.mjs/);
  assert.match(source, /runLocalCheck\("node scripts\/check-core-loop-release\.mjs"/);
  assert.match(source, /coreLoopReleaseCheck\.evidence/);
  assert.doesNotMatch(source, /fridge inventory/);
  assert.doesNotMatch(source, /purchased-item-to-fridge conversion/);
});

test("goal completion check runs the executable local mode release check", () => {
  assert.match(source, /로컬모드\/동기화 안정성/);
  assert.match(source, /scripts\/check-local-mode-release\.mjs/);
  assert.match(source, /runLocalCheck\("node scripts\/check-local-mode-release\.mjs"/);
  assert.match(source, /localModeReleaseCheck\.evidence/);
});

test("goal completion check runs the executable Supabase release check", () => {
  assert.match(source, /Supabase 로컬 RLS\/스키마 계약/);
  assert.match(source, /scripts\/check-supabase-release\.mjs/);
  assert.match(source, /runLocalCheck\("node scripts\/check-supabase-release\.mjs"/);
  assert.match(source, /supabaseReleaseCheck\.evidence/);
  assert.doesNotMatch(source, /Supabase contract checks passed/);
  assert.doesNotMatch(source, /local Supabase schema\/RLS contract evidence in release ledger/);
});

test("goal completion check treats live Supabase and Storage blockers as blockers", () => {
  assert.match(source, /운영 Supabase live\/read\/write\/RLS/);
  assert.match(source, /Supabase live current status: confirmed/);
  assert.match(source, /Supabase Storage current status: confirmed/);
  assert.match(source, /Latest Supabase live unblock check: confirmed/);
  assert.match(source, /Supabase live blocks/);
  assert.match(source, /family_group_id` missing from live/);
  assert.match(source, /Could not find the 'family_group_id' column/);
  assert.match(source, /운영 Supabase Storage 정책/);
  assert.match(source, /Storage still allows cross-prefix/);
  assert.match(source, /guest upload outside device prefix succeeded/);
  assert.match(source, /release:supabase-live-unblock-check/);
  assert.match(source, /check:supabase-storage-live/);
});

test("goal completion check runs the beginner recipe expansion gates", () => {
  assert.match(source, /초보자 레시피 데이터 계약\/검증/);
  assert.match(source, /초보자 레시피 제품 목표/);
  assert.match(source, /scripts\/validate-recipes\.mjs/);
  assert.match(source, /scripts\/check-curated-beginner-guidance\.mjs/);
  assert.match(source, /scripts\/check-beginner-goal-readiness\.mjs/);
  assert.match(source, /scripts\/check-beginner-mobile-evidence\.mjs/);
  assert.match(source, /recipeValidationCheck\.evidence/);
  assert.match(source, /curatedBeginnerGuidanceCheck\.evidence/);
  assert.match(source, /beginnerGoalReadinessCheck\.evidence/);
  assert.match(source, /beginnerMobileEvidenceCheck\.evidence/);
  assert.match(source, /초보자 모바일 화면 증거/);
});

test("goal completion check requires Phase 5 actual cooking and human review evidence", () => {
  assert.match(source, /scripts\/check-phase-5-human-evidence\.mjs/);
  assert.match(source, /phase5HumanEvidenceCheck\.evidence/);
  assert.match(source, /핵심 20개 실제 조리·사람 검수 증거/);
  assert.match(source, /phase-5-human-testing-runbook\.md/);
});
