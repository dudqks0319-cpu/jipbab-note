import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCsvRows } from "./generate-phase-5-core-recipe-audit.mjs";

export const PHASE7_BETA_TEMPLATE_PATH = "docs/phase-7-private-beta-sessions.csv";
export const PHASE7_APPROVAL_PATH = "docs/phase-7-public-beta-approval.md";
export const PHASE7_EVIDENCE_ROOT = "output/phase7-private-beta-evidence";
export const PHASE7_BETA_COLUMNS = [
  "session_id",
  "tester_code",
  "session_type",
  "app_build_sha",
  "app_build",
  "platform",
  "recipe_id",
  "recipe_version",
  "started_at",
  "ended_at",
  "outcome",
  "beginner_success",
  "confusing_step_count",
  "failed_step",
  "failure_code",
  "error_code",
  "safety_issue",
  "issue_severity",
  "issue_status",
  "resolution_ref",
  "copy_change_id",
  "recommendation_change_id",
  "evidence_path",
  "consent_status",
];

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/u;
const SHA_PATTERN = /^[0-9a-f]{7,40}$/iu;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const DIRECT_PII_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b)/iu;
const SESSION_TYPES = new Set(["product_flow", "representative_recipe"]);
const PLATFORMS = new Set(["web", "ios", "android"]);
const OUTCOMES = new Set(["completed", "abandoned", "error"]);
const SAFETY_RESULTS = new Set(["none", "reported"]);
const ISSUE_SEVERITIES = new Set(["none", "p0", "p1", "p2", "p3"]);
const ISSUE_STATUSES = new Set(["none", "open", "fixed"]);

function nonBlank(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function validTimestamp(value) {
  return TIMESTAMP_PATTERN.test(value) && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
}

function csvRecords(text) {
  const parsed = parseCsvRows(text);
  if (!parsed || parsed.length === 0) {
    return { records: [], errors: ["sessions: CSV를 읽을 수 없습니다."] };
  }
  const [header, ...rows] = parsed;
  if (
    header.length !== PHASE7_BETA_COLUMNS.length ||
    !header.every((column, index) => column === PHASE7_BETA_COLUMNS[index])
  ) {
    return { records: [], errors: ["sessions: 헤더가 Phase 7 계약과 일치하지 않습니다."] };
  }
  const dataRows = rows.filter((values) => values.some(Boolean));
  if (dataRows.some((values) => values.length !== PHASE7_BETA_COLUMNS.length)) {
    return { records: [], errors: ["sessions: 열 개수가 Phase 7 계약과 일치하지 않는 행이 있습니다."] };
  }
  return {
    records: dataRows.map((values) =>
      Object.fromEntries(PHASE7_BETA_COLUMNS.map((column, index) => [column, values[index] ?? ""])),
    ),
    errors: [],
  };
}

function validEvidencePath(value, cwd, pathExists) {
  if (!nonBlank(value) || path.isAbsolute(value)) return false;
  const normalized = value.replaceAll("\\", "/");
  if (!normalized.startsWith(`${PHASE7_EVIDENCE_ROOT}/`) || normalized.split("/").includes("..")) return false;
  const evidenceRoot = `${path.resolve(cwd, PHASE7_EVIDENCE_ROOT)}${path.sep}`;
  const absolutePath = path.resolve(cwd, normalized);
  return absolutePath.startsWith(evidenceRoot) && pathExists(absolutePath);
}

function lineValue(source, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`^\\s*-\\s*${escaped}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
}

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function formatPercent(value) {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

export function evaluatePhase7PrivateBetaEvidence({
  cwd = process.cwd(),
  sessionCsv,
  approvalText,
  pathExists = existsSync,
}) {
  const parsed = csvRecords(sessionCsv);
  const errors = [...parsed.errors];
  const records = parsed.records;
  const seenSessionIds = new Set();

  records.forEach((record, index) => {
    const context = record.session_id || `row-${index + 1}`;
    const fail = (message) => errors.push(`${context}: ${message}`);

    if (!CODE_PATTERN.test(record.session_id)) fail("session_id는 고유한 익명 코드여야 합니다.");
    if (seenSessionIds.has(record.session_id)) fail("session_id가 중복됩니다.");
    seenSessionIds.add(record.session_id);
    if (!CODE_PATTERN.test(record.tester_code)) fail("tester_code는 이름이나 연락처가 아닌 익명 코드여야 합니다.");
    if (!SESSION_TYPES.has(record.session_type)) fail("session_type은 product_flow 또는 representative_recipe여야 합니다.");
    if (!SHA_PATTERN.test(record.app_build_sha)) fail("app_build_sha는 7~40자리 Git SHA여야 합니다.");
    if (!CODE_PATTERN.test(record.app_build)) fail("app_build가 필요합니다.");
    if (!PLATFORMS.has(record.platform)) fail("platform은 web, ios, android 중 하나여야 합니다.");
    if (!CODE_PATTERN.test(record.recipe_id)) fail("recipe_id가 필요합니다.");
    if (!CODE_PATTERN.test(record.recipe_version)) fail("recipe_version이 필요합니다.");
    if (!validTimestamp(record.started_at) || !validTimestamp(record.ended_at)) {
      fail("started_at과 ended_at은 유효한 ISO 시각이어야 합니다.");
    } else if (Date.parse(record.ended_at) <= Date.parse(record.started_at)) {
      fail("ended_at은 started_at보다 늦어야 합니다.");
    }
    if (!OUTCOMES.has(record.outcome)) fail("outcome은 completed, abandoned, error 중 하나여야 합니다.");
    if (!new Set(["true", "false"]).has(record.beginner_success)) {
      fail("beginner_success는 true 또는 false여야 합니다.");
    }
    if (record.outcome !== "completed" && record.beginner_success === "true") {
      fail("미완료 세션은 beginner_success=true일 수 없습니다.");
    }
    const confusingSteps = Number(record.confusing_step_count);
    if (!Number.isInteger(confusingSteps) || confusingSteps < 0 || confusingSteps > 20) {
      fail("confusing_step_count는 0~20 정수여야 합니다.");
    }
    if (record.outcome !== "completed" && (!CODE_PATTERN.test(record.failed_step) || !CODE_PATTERN.test(record.failure_code))) {
      fail("중단 또는 오류 세션은 failed_step과 failure_code가 필요합니다.");
    }
    if (record.outcome === "error" && !CODE_PATTERN.test(record.error_code)) {
      fail("오류 세션은 error_code가 필요합니다.");
    }
    if (!SAFETY_RESULTS.has(record.safety_issue)) fail("safety_issue는 none 또는 reported여야 합니다.");
    if (!ISSUE_SEVERITIES.has(record.issue_severity)) fail("issue_severity는 none, p0, p1, p2, p3 중 하나여야 합니다.");
    if (!ISSUE_STATUSES.has(record.issue_status)) fail("issue_status는 none, open, fixed 중 하나여야 합니다.");
    if (record.issue_severity === "none" && record.issue_status !== "none") {
      fail("issue_severity=none이면 issue_status도 none이어야 합니다.");
    }
    if (record.issue_severity !== "none" && !new Set(["open", "fixed"]).has(record.issue_status)) {
      fail("이슈가 있으면 issue_status는 open 또는 fixed여야 합니다.");
    }
    for (const field of ["resolution_ref", "copy_change_id", "recommendation_change_id"]) {
      if (record[field] !== "none" && !CODE_PATTERN.test(record[field])) {
        fail(`${field}는 none 또는 추적 가능한 변경 코드여야 합니다.`);
      }
    }
    if (!validEvidencePath(record.evidence_path, cwd, pathExists)) {
      fail(`evidence_path는 ${PHASE7_EVIDENCE_ROOT}/ 아래의 실제 경로여야 합니다.`);
    }
    if (record.consent_status !== "confirmed") fail("consent_status는 confirmed여야 합니다.");
    if (Object.values(record).some((value) => DIRECT_PII_PATTERN.test(value))) {
      fail("이메일 또는 전화번호 형태의 개인정보를 기록할 수 없습니다.");
    }
  });

  const testerCodes = new Set(records.map((record) => record.tester_code).filter(Boolean));
  const productFlowRecords = records.filter((record) => record.session_type === "product_flow");
  const representativeRecords = records.filter((record) => record.session_type === "representative_recipe");
  const productFlowTesterCount = new Set(productFlowRecords.map((record) => record.tester_code)).size;
  const representativeTesterCount = new Set(representativeRecords.map((record) => record.tester_code)).size;
  const productFlowCompletionRate = rate(
    productFlowRecords.filter((record) => record.outcome === "completed").length,
    productFlowRecords.length,
  );
  const representativeSuccessRate = rate(
    representativeRecords.filter((record) => record.beginner_success === "true").length,
    representativeRecords.length,
  );
  const confusingStepAverage = records.length
    ? records.reduce((sum, record) => sum + Number(record.confusing_step_count || 0), 0) / records.length
    : null;
  const safetyIssueCount = records.filter((record) => record.safety_issue === "reported").length;
  const unresolvedCriticalCount = records.filter(
    (record) => new Set(["p0", "p1"]).has(record.issue_severity) && record.issue_status !== "fixed",
  ).length;

  const abandonmentGroups = new Map();
  for (const record of records.filter((item) => item.outcome !== "completed")) {
    const key = `${record.recipe_id}:${record.failed_step}`;
    const group = abandonmentGroups.get(key) ?? [];
    group.push(record);
    abandonmentGroups.set(key, group);
  }
  const unresolvedHighAbandonmentGroups = [...abandonmentGroups.entries()]
    .filter(([, group]) => group.length >= 2)
    .filter(([, group]) =>
      group.some((record) => record.issue_status !== "fixed" || record.resolution_ref === "none"),
    )
    .map(([key]) => key);

  const approvalStatus = lineValue(approvalText, "Public beta approval");
  const approvalDate = lineValue(approvalText, "Approval date");
  const approverCode = lineValue(approvalText, "Approver code");
  const approvalEvidence = lineValue(approvalText, "Evidence artifacts");
  const approvalComplete =
    approvalStatus === "confirmed" &&
    validDate(approvalDate) &&
    CODE_PATTERN.test(approverCode) &&
    validEvidencePath(approvalEvidence, cwd, pathExists) &&
    !DIRECT_PII_PATTERN.test(approverCode);

  const blockers = [];
  if (testerCodes.size < 5 || testerCodes.size > 20) blockers.push("익명 베타 참여자는 5~20명이어야 합니다.");
  if (productFlowTesterCount < 5) blockers.push("product_flow에 참여한 고유 테스터가 5명 미만입니다.");
  if (representativeTesterCount < 5) blockers.push("representative_recipe에 참여한 고유 테스터가 5명 미만입니다.");
  if (productFlowCompletionRate === null || productFlowCompletionRate < 0.6) {
    blockers.push("조리 시작 대비 완료율이 60% 미만입니다.");
  }
  if (representativeSuccessRate === null || representativeSuccessRate < 0.8) {
    blockers.push("대표 레시피 초보자 조리 성공률이 80% 미만입니다.");
  }
  if (confusingStepAverage === null || confusingStepAverage >= 1) {
    blockers.push("한 세션당 이해하지 못한 단계 평균이 1개 이상입니다.");
  }
  if (safetyIssueCount > 0) blockers.push("안전 문제가 1건 이상 보고되었습니다.");
  if (unresolvedCriticalCount > 0) blockers.push("미해결 P0/P1 이슈가 있습니다.");
  if (unresolvedHighAbandonmentGroups.length > 0) {
    blockers.push(`반복 중단 단계가 수정되지 않았습니다: ${unresolvedHighAbandonmentGroups.join(", ")}`);
  }
  if (!approvalComplete) blockers.push("공개 베타 승인과 로컬 증거가 확인되지 않았습니다.");

  return {
    errors,
    blockers,
    isComplete: errors.length === 0 && blockers.length === 0,
    counts: {
      sessions: records.length,
      testers: testerCodes.size,
      productFlowTesters: productFlowTesterCount,
      representativeTesters: representativeTesterCount,
      safetyIssues: safetyIssueCount,
      unresolvedCritical: unresolvedCriticalCount,
      unresolvedHighAbandonment: unresolvedHighAbandonmentGroups.length,
    },
    metrics: {
      productFlowCompletionRate,
      representativeSuccessRate,
      confusingStepAverage,
    },
    approvalComplete,
  };
}

function runCli() {
  if (process.argv.includes("--help")) {
    console.log("Usage: pnpm check:phase7-private-beta");
    console.log("Validates the tracked Phase 7 session CSV and public-beta approval evidence.");
    return;
  }
  const cwd = process.cwd();
  if (!existsSync(PHASE7_BETA_TEMPLATE_PATH) || !existsSync(PHASE7_APPROVAL_PATH)) {
    console.error("Phase 7 private beta templates are missing.");
    process.exit(1);
  }
  const result = evaluatePhase7PrivateBetaEvidence({
    cwd,
    sessionCsv: readFileSync(PHASE7_BETA_TEMPLATE_PATH, "utf8"),
    approvalText: readFileSync(PHASE7_APPROVAL_PATH, "utf8"),
  });

  console.log("Phase 7 private beta evidence status");
  console.log(`Sessions: ${result.counts.sessions}`);
  console.log(`Unique testers: ${result.counts.testers}/5 minimum (20 maximum)`);
  console.log(`Product-flow testers: ${result.counts.productFlowTesters}/5 minimum`);
  console.log(`Representative-recipe testers: ${result.counts.representativeTesters}/5 minimum`);
  console.log(`Product-flow completion: ${formatPercent(result.metrics.productFlowCompletionRate)} (target >= 60%)`);
  console.log(`Representative beginner success: ${formatPercent(result.metrics.representativeSuccessRate)} (target >= 80%)`);
  console.log(
    `Average confusing steps: ${result.metrics.confusingStepAverage === null ? "n/a" : result.metrics.confusingStepAverage.toFixed(2)} (target < 1)`,
  );
  console.log(`Safety issues: ${result.counts.safetyIssues} (target 0)`);
  console.log(`Unresolved P0/P1: ${result.counts.unresolvedCritical} (target 0)`);
  console.log(`Unresolved repeated-abandonment groups: ${result.counts.unresolvedHighAbandonment} (target 0)`);
  console.log(`Public beta approval: ${result.approvalComplete ? "confirmed" : "not confirmed"}`);

  for (const error of result.errors) console.error(`ERROR - ${error}`);
  for (const blocker of result.blockers) console.error(`BLOCKED - ${blocker}`);
  if (!result.isComplete) process.exit(1);
  console.log("PASS - Phase 7 private beta evidence meets every threshold.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
