import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { evaluatePhase5HumanEvidence } from "../scripts/check-phase-5-human-evidence.mjs";
import {
  PHASE5_COOKING_TEMPLATE_COLUMNS,
  PHASE5_COOKING_TEMPLATE_PATH,
  PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS,
  PHASE5_HUMAN_REVIEW_TEMPLATE_PATH,
  buildPhase5Artifacts,
  parseCsvRows,
} from "../scripts/generate-phase-5-core-recipe-audit.mjs";

const cwd = process.cwd();
const releaseGateSource = readFileSync("scripts/run-release-gates.mjs", "utf8");
const humanTestingRunbook = readFileSync("docs/phase-5-human-testing-runbook.md", "utf8");

function rewriteCsv(
  text: string,
  expectedColumns: string[],
  update: (record: Record<string, string>, index: number) => Record<string, string>,
): string {
  const parsed = parseCsvRows(text);
  assert.ok(parsed);
  const [header, ...rows] = parsed;
  assert.deepEqual(header, expectedColumns);
  const updatedRows = rows
    .filter((values) => values.some(Boolean))
    .map((values, index) => {
      const record = Object.fromEntries(header.map((column, columnIndex) => [column, values[columnIndex] ?? ""]));
      const updated = { ...record, ...update(record, index) };
      return header.map((column) => updated[column] ?? "").join(",");
    });
  return `${header.join(",")}\n${updatedRows.join("\n")}\n`;
}

function evidencePath(recipeId: string, suffix: string): string {
  return `output/phase5-human-evidence/${recipeId}/v1/${suffix}`;
}

function appendCsvRecord(
  text: string,
  expectedColumns: string[],
  sourceIndex: number,
  update: Record<string, string>,
): string {
  const parsed = parseCsvRows(text);
  assert.ok(parsed);
  const [header, ...rows] = parsed;
  assert.deepEqual(header, expectedColumns);
  const sourceValues = rows.filter((values) => values.some(Boolean))[sourceIndex];
  assert.ok(sourceValues);
  const source = Object.fromEntries(header.map((column, index) => [column, sourceValues[index] ?? ""]));
  const appended = { ...source, ...update };
  return `${text.trimEnd()}\n${header.map((column) => appended[column] ?? "").join(",")}\n`;
}

function uuidFor(order: number, prefix = "0"): string {
  return `${prefix}0000000-0000-4000-8000-${String(order).padStart(12, "0")}`;
}

function completedEvidence() {
  const artifacts = buildPhase5Artifacts(cwd);
  const cookingCsv = rewriteCsv(
    artifacts.files[PHASE5_COOKING_TEMPLATE_PATH],
    PHASE5_COOKING_TEMPLATE_COLUMNS,
    (record, index) => ({
      recipe_version: "v1",
      attempt_id: `attempt-${String(index + 1).padStart(2, "0")}`,
      app_build_sha: "b588e31",
      test_surface: "web",
      test_device: "iPhone 17",
      test_date: "2026-07-11",
      tester_code: `tester-${String(index + 1).padStart(2, "0")}`,
      heat_source: "induction",
      cookware: "24cm-pan",
      started_at: "2026-07-11T01:00:00Z",
      completed_at: "2026-07-11T01:20:00Z",
      actual_minutes: "20",
      completed: "true",
      failed_step: "",
      failure_code: "",
      safety_issue: "none",
      copy_change: "none",
      image_change: "none",
      evidence_path: evidencePath(record.recipe_id, `cook-${index + 1}`),
      status: "approved",
    }),
  );
  const reviewCsv = rewriteCsv(
    artifacts.files[PHASE5_HUMAN_REVIEW_TEMPLATE_PATH],
    PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS,
    (record) => {
      const order = Number(record.order);
      const isLegalSource = record.review_type === "legal_source";
      return {
        recipe_version: "v1",
        reviewer_code: `reviewer-${record.review_type}-${record.order}`,
        reviewed_at: "2026-07-11T02:00:00Z",
        score: "95",
        result: "approved",
        notes: "review-complete",
        evidence_path: evidencePath(record.recipe_id, record.review_type),
        db_recipe_id: isLegalSource ? uuidFor(order) : "",
        source_record_id: isLegalSource ? uuidFor(order, "1") : "",
      };
    },
  );
  return { cookingCsv, reviewCsv };
}

test("현재 Phase 5 사람 증거는 오류 없이 0/20 대기 상태로 차단된다", () => {
  const result = evaluatePhase5HumanEvidence({
    cwd,
    cookingCsv: readFileSync(PHASE5_COOKING_TEMPLATE_PATH, "utf8"),
    reviewCsv: readFileSync(PHASE5_HUMAN_REVIEW_TEMPLATE_PATH, "utf8"),
    pathExists: () => false,
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.actualCookingApproved, 0);
  assert.equal(result.counts.beginner, 0);
  assert.equal(result.counts.food_safety, 0);
  assert.equal(result.counts.legal_source, 0);
  assert.equal(result.counts.image_rights, 0);
  assert.equal(result.counts.publicationEligible, 0);
});

test("Phase 5 사람 증거 검증기는 실제 로컬 출시 게이트에 연결된다", () => {
  assert.match(releaseGateSource, /phase5-human-evidence/u);
  assert.match(releaseGateSource, /scripts\/check-phase-5-human-evidence\.mjs/u);
  assert.match(releaseGateSource, /--experimental-strip-types/u);
});

test("image rights 로컬 검수는 현재 DB 허용 review_type과 올바르게 매핑된다", () => {
  assert.match(humanTestingRunbook, /recipe_reviews\.review_type/u);
  assert.match(humanTestingRunbook, /직접 넣지 않는다/u);
  assert.match(humanTestingRunbook, /recipes\.image_rights_status/u);
  assert.match(humanTestingRunbook, /image_rights_reviewed_at/u);
  assert.match(humanTestingRunbook, /legal_source/u);
});

test("같은 버전의 실제 조리와 사람 검수 4종이 모두 유효해야 20개가 후보가 된다", () => {
  const evidence = completedEvidence();
  const result = evaluatePhase5HumanEvidence({ cwd, ...evidence, pathExists: () => true });

  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.actualCookingApproved, 20);
  assert.equal(result.counts.beginner, 20);
  assert.equal(result.counts.food_safety, 20);
  assert.equal(result.counts.legal_source, 20);
  assert.equal(result.counts.image_rights, 20);
  assert.equal(result.counts.publicationEligible, 20);
  assert.equal(new Set(result.eligibleRecipeIds).size, 20);
});

test("미완성 또는 안전 문제가 있는 조리 기록은 approved여도 차단된다", () => {
  const evidence = completedEvidence();
  const unsafeCookingCsv = rewriteCsv(
    evidence.cookingCsv,
    PHASE5_COOKING_TEMPLATE_COLUMNS,
    (record, index) =>
      index === 0
        ? {
            completed: "false",
            failed_step: "",
            failure_code: "",
            safety_issue: "reported",
            status: "approved",
          }
        : record,
  );
  const result = evaluatePhase5HumanEvidence({
    cwd,
    cookingCsv: unsafeCookingCsv,
    reviewCsv: evidence.reviewCsv,
    pathExists: () => true,
  });

  assert.ok(result.errors.some((error) => error.includes("미완성 또는 안전 문제가 있는 테스트")));
  assert.equal(result.counts.actualCookingApproved, 19);
  assert.equal(result.counts.publicationEligible, 19);
});

test("실패 재시험을 추가하면 이전 성공을 지우지 않고 최신 판정으로 차단한다", () => {
  const evidence = completedEvidence();
  const cookingWithRetest = appendCsvRecord(
    evidence.cookingCsv,
    PHASE5_COOKING_TEMPLATE_COLUMNS,
    0,
    {
      attempt_id: "attempt-01-retest",
      started_at: "2026-07-11T01:05:00Z",
      completed_at: "2026-07-11T01:20:00Z",
      actual_minutes: "15",
      completed: "false",
      failed_step: "2",
      failure_code: "heat",
      safety_issue: "reported",
      copy_change: "clarify-heat",
      image_change: "none",
      evidence_path: evidencePath("beginner-recipe-001", "cook-retest"),
      status: "needs_revision",
    },
  );
  const result = evaluatePhase5HumanEvidence({
    cwd,
    cookingCsv: cookingWithRetest,
    reviewCsv: evidence.reviewCsv,
    pathExists: () => true,
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.actualCookingApproved, 19);
  assert.equal(result.counts.publicationEligible, 19);
});

test("증거 경로 탈출과 legal_source UUID 누락은 발행 후보를 차단한다", () => {
  const evidence = completedEvidence();
  const invalidReviewCsv = rewriteCsv(
    evidence.reviewCsv,
    PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS,
    (record, index) =>
      index === 2
        ? {
            evidence_path: "../outside-evidence",
            db_recipe_id: "",
            source_record_id: "",
          }
        : record,
  );
  const result = evaluatePhase5HumanEvidence({
    cwd,
    cookingCsv: evidence.cookingCsv,
    reviewCsv: invalidReviewCsv,
    pathExists: () => true,
  });

  assert.ok(result.errors.some((error) => error.includes("실제 경로")));
  assert.ok(result.errors.some((error) => error.includes("recipe_sources UUID")));
  assert.equal(result.counts.legal_source, 19);
  assert.equal(result.counts.publicationEligible, 19);
});

test("서로 다른 레시피가 같은 DB recipe 또는 source UUID를 재사용하면 둘 다 차단한다", () => {
  const evidence = completedEvidence();
  const duplicatedIds = rewriteCsv(
    evidence.reviewCsv,
    PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS,
    (record, index) =>
      index === 6
        ? {
            db_recipe_id: uuidFor(1),
            source_record_id: uuidFor(1, "1"),
          }
        : record,
  );
  const result = evaluatePhase5HumanEvidence({
    cwd,
    cookingCsv: evidence.cookingCsv,
    reviewCsv: duplicatedIds,
    pathExists: () => true,
  });

  assert.ok(result.errors.some((error) => error.includes("다른 핵심 레시피와 중복")));
  assert.equal(result.counts.legal_source, 18);
  assert.equal(result.counts.publicationEligible, 18);
});

test("사람 검수 메모에 이메일이나 전화번호 형태의 개인정보가 있으면 차단한다", () => {
  const evidence = completedEvidence();
  const reviewWithPii = rewriteCsv(
    evidence.reviewCsv,
    PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS,
    (record, index) => (index === 0 ? { notes: "contact tester@example.com" } : record),
  );
  const result = evaluatePhase5HumanEvidence({
    cwd,
    cookingCsv: evidence.cookingCsv,
    reviewCsv: reviewWithPii,
    pathExists: () => true,
  });

  assert.ok(result.errors.some((error) => error.includes("개인정보")));
  assert.equal(result.counts.beginner, 19);
  assert.equal(result.counts.publicationEligible, 19);
});
