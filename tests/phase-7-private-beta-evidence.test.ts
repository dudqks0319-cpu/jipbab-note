import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  PHASE7_APPROVAL_PATH,
  PHASE7_BETA_COLUMNS,
  PHASE7_BETA_TEMPLATE_PATH,
  evaluatePhase7PrivateBetaEvidence,
} from "../scripts/check-phase-7-private-beta-evidence.mjs";

type SessionRecord = Record<(typeof PHASE7_BETA_COLUMNS)[number], string>;

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    session_id: "session-01-product",
    tester_code: "tester-01",
    session_type: "product_flow",
    app_build_sha: "169e013",
    app_build: "2026062602",
    platform: "ios",
    recipe_id: "beginner-recipe-001",
    recipe_version: "phase5-v1",
    started_at: "2026-07-14T01:00:00Z",
    ended_at: "2026-07-14T01:20:00Z",
    outcome: "completed",
    beginner_success: "true",
    confusing_step_count: "0",
    failed_step: "none",
    failure_code: "none",
    error_code: "none",
    safety_issue: "none",
    issue_severity: "none",
    issue_status: "none",
    resolution_ref: "none",
    copy_change_id: "none",
    recommendation_change_id: "none",
    evidence_path: "output/phase7-private-beta-evidence/tester-01/session-01-product",
    consent_status: "confirmed",
    ...overrides,
  };
}

function csv(records: SessionRecord[]): string {
  return `${PHASE7_BETA_COLUMNS.join(",")}\n${records
    .map((item) => PHASE7_BETA_COLUMNS.map((column) => item[column]).join(","))
    .join("\n")}\n`;
}

function completeRecords(): SessionRecord[] {
  return Array.from({ length: 5 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const testerCode = `tester-${number}`;
    return [
      record({
        session_id: `session-${number}-product`,
        tester_code: testerCode,
        evidence_path: `output/phase7-private-beta-evidence/${testerCode}/session-${number}-product`,
      }),
      record({
        session_id: `session-${number}-recipe`,
        tester_code: testerCode,
        session_type: "representative_recipe",
        evidence_path: `output/phase7-private-beta-evidence/${testerCode}/session-${number}-recipe`,
      }),
    ];
  }).flat();
}

function approval(confirmed = true): string {
  return `# Phase 7 공개 베타 승인

- Public beta approval: ${confirmed ? "confirmed" : "not confirmed"}
- Approval date: ${confirmed ? "2026-07-14" : "pending"}
- Approver code: ${confirmed ? "approver-01" : "pending"}
- Evidence artifacts: ${confirmed ? "output/phase7-private-beta-evidence/approval/decision" : "pending"}
`;
}

test("현재 Phase 7 템플릿은 오류 없이 0명 대기 상태로 차단된다", () => {
  const result = evaluatePhase7PrivateBetaEvidence({
    sessionCsv: readFileSync(PHASE7_BETA_TEMPLATE_PATH, "utf8"),
    approvalText: readFileSync(PHASE7_APPROVAL_PATH, "utf8"),
    pathExists: () => false,
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.sessions, 0);
  assert.equal(result.counts.testers, 0);
  assert.equal(result.isComplete, false);
  assert.ok(result.blockers.some((item) => item.includes("5~20명")));
  assert.ok(result.blockers.some((item) => item.includes("공개 베타 승인")));
});

test("익명 사용자 5명의 두 세션과 목표 지표 및 승인이 모두 맞으면 통과한다", () => {
  const result = evaluatePhase7PrivateBetaEvidence({
    sessionCsv: csv(completeRecords()),
    approvalText: approval(),
    pathExists: () => true,
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.counts.testers, 5);
  assert.equal(result.counts.productFlowTesters, 5);
  assert.equal(result.counts.representativeTesters, 5);
  assert.equal(result.metrics.productFlowCompletionRate, 1);
  assert.equal(result.metrics.representativeSuccessRate, 1);
  assert.equal(result.metrics.confusingStepAverage, 0);
  assert.equal(result.approvalComplete, true);
  assert.equal(result.isComplete, true);
});

test("개인정보와 증거 경로 탈출은 스키마 오류로 차단한다", () => {
  const records = completeRecords();
  records[0] = record({
    ...records[0],
    tester_code: "tester@example.com",
    evidence_path: "../outside",
  });
  const result = evaluatePhase7PrivateBetaEvidence({
    sessionCsv: csv(records),
    approvalText: approval(),
    pathExists: () => true,
  });

  assert.ok(result.errors.some((item) => item.includes("개인정보")));
  assert.ok(result.errors.some((item) => item.includes("실제 경로")));
  assert.equal(result.isComplete, false);
});

test("안전 문제와 미해결 P1은 완료율이 충분해도 공개 베타를 차단한다", () => {
  const records = completeRecords();
  records[0] = record({
    ...records[0],
    safety_issue: "reported",
    issue_severity: "p1",
    issue_status: "open",
  });
  const result = evaluatePhase7PrivateBetaEvidence({
    sessionCsv: csv(records),
    approvalText: approval(),
    pathExists: () => true,
  });

  assert.ok(result.blockers.some((item) => item.includes("안전 문제")));
  assert.ok(result.blockers.some((item) => item.includes("P0/P1")));
  assert.equal(result.isComplete, false);
});

test("두 번 반복된 중단 단계는 수정 증거가 있어야 통과한다", () => {
  const records = completeRecords();
  const productIndexes = [0, 2];
  for (const index of productIndexes) {
    records[index] = record({
      ...records[index],
      outcome: "abandoned",
      beginner_success: "false",
      failed_step: "step-03",
      failure_code: "unclear-copy",
      issue_severity: "p2",
      issue_status: "open",
      resolution_ref: "none",
    });
  }

  const blocked = evaluatePhase7PrivateBetaEvidence({
    sessionCsv: csv(records),
    approvalText: approval(),
    pathExists: () => true,
  });
  assert.equal(blocked.metrics.productFlowCompletionRate, 0.6);
  assert.ok(blocked.blockers.some((item) => item.includes("반복 중단 단계")));

  for (const index of productIndexes) {
    records[index] = record({
      ...records[index],
      issue_status: "fixed",
      resolution_ref: "fix-step-03",
    });
  }
  const fixed = evaluatePhase7PrivateBetaEvidence({
    sessionCsv: csv(records),
    approvalText: approval(),
    pathExists: () => true,
  });
  assert.deepEqual(fixed.errors, []);
  assert.deepEqual(fixed.blockers, []);
  assert.equal(fixed.isComplete, true);
});

test("Phase 7 검증기는 목표 게이트와 운영 문서에 연결된다", () => {
  const packageSource = readFileSync("package.json", "utf8");
  const goalSource = readFileSync("scripts/verify-goal-completion.mjs", "utf8");
  const runbook = readFileSync("docs/phase-7-private-beta-runbook.md", "utf8");

  assert.match(packageSource, /check:phase7-private-beta/u);
  assert.match(goalSource, /scripts\/check-phase-7-private-beta-evidence\.mjs/u);
  assert.match(goalSource, /Phase 7 비공개 베타/u);
  assert.match(runbook, /5~20명/u);
  assert.match(runbook, /60% 이상/u);
  assert.match(runbook, /80% 이상/u);
  assert.match(runbook, /consent_status=confirmed/u);
  assert.match(runbook, /안전 문제 또는 P0/u);
});
