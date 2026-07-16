import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PHASE5_COOKING_TEMPLATE_COLUMNS,
  PHASE5_COOKING_TEMPLATE_PATH,
  PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS,
  PHASE5_HUMAN_REVIEW_TEMPLATE_PATH,
  PHASE5_HUMAN_REVIEW_TYPES,
  buildPhase5Artifacts,
  parseCsvRows,
} from "./generate-phase-5-core-recipe-audit.mjs";

const ALLOWED_RESULTS = new Set(["pending", "approved", "needs_revision", "rejected"]);
const REVIEWER_CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/u;
const VERSION_PATTERN = /^[A-Za-z0-9._-]{1,64}$/u;
const ATTEMPT_ID_PATTERN = /^[A-Za-z0-9_-]{3,64}$/u;
const APP_SHA_PATTERN = /^[0-9a-f]{7,40}$/iu;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/u;
const DIRECT_PII_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b01[016789][ -]?\d{3,4}[ -]?\d{4}\b)/iu;
const EVIDENCE_ROOT = "output/phase5-human-evidence";

function nonBlank(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function csvRecords(text, expectedColumns, label) {
  const parsed = parseCsvRows(text);
  if (!parsed || parsed.length === 0) {
    return { records: [], errors: [`${label}: CSV를 읽을 수 없습니다.`] };
  }
  const [header, ...rows] = parsed;
  if (
    header.length !== expectedColumns.length ||
    !header.every((column, index) => column === expectedColumns[index])
  ) {
    return { records: [], errors: [`${label}: 헤더가 현재 계약과 일치하지 않습니다.`] };
  }
  const dataRows = rows.filter((values) => values.some(Boolean));
  if (dataRows.some((values) => values.length !== expectedColumns.length)) {
    return { records: [], errors: [`${label}: 열 개수가 현재 계약과 일치하지 않는 행이 있습니다.`] };
  }
  return {
    records: dataRows.map((values) =>
      Object.fromEntries(expectedColumns.map((column, index) => [column, values[index] ?? ""])),
    ),
    errors: [],
  };
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

function validEvidencePath(value, cwd, pathExists) {
  if (!nonBlank(value) || path.isAbsolute(value)) return false;
  const normalized = value.replaceAll("\\", "/");
  if (!normalized.startsWith(`${EVIDENCE_ROOT}/`) || normalized.split("/").includes("..")) return false;
  const evidenceRoot = `${path.resolve(cwd, EVIDENCE_ROOT)}${path.sep}`;
  const absolutePath = path.resolve(cwd, normalized);
  return absolutePath.startsWith(evidenceRoot) && pathExists(absolutePath);
}

function expectedReviewRows(audits) {
  return audits.flatMap((audit) =>
    PHASE5_HUMAN_REVIEW_TYPES.map((reviewType) => ({
      order: String(audit.order),
      requested_title: audit.requestedTitle,
      selected_title: audit.selectedTitle,
      recipe_id: audit.recipe.id,
      review_type: reviewType,
    })),
  );
}

function identityMatches(record, expected, includeReviewType = false) {
  return (
    record.order === expected.order &&
    record.requested_title === expected.requested_title &&
    record.selected_title === expected.selected_title &&
    record.recipe_id === expected.recipe_id &&
    (!includeReviewType || record.review_type === expected.review_type)
  );
}

export function evaluatePhase5HumanEvidence({
  cwd = process.cwd(),
  cookingCsv,
  reviewCsv,
  pathExists = existsSync,
}) {
  const audits = buildPhase5Artifacts(cwd).audits;
  const cooking = csvRecords(cookingCsv, PHASE5_COOKING_TEMPLATE_COLUMNS, "actual_cooking");
  const reviews = csvRecords(reviewCsv, PHASE5_HUMAN_REVIEW_TEMPLATE_COLUMNS, "human_review");
  const errors = [...cooking.errors, ...reviews.errors];
  const invalidContexts = new Set();
  const invalidRecipeIds = new Set();
  const auditsByRecipeId = new Map(audits.map((audit) => [audit.recipe.id, audit]));
  const fail = (context, message, recipeId) => {
    invalidContexts.add(context);
    if (recipeId) invalidRecipeIds.add(recipeId);
    errors.push(`${context}: ${message}`);
  };

  if (cooking.records.length < audits.length) {
    errors.push(`actual_cooking: 최소 ${audits.length}개 행이 필요하지만 ${cooking.records.length}개입니다.`);
  }
  const presentCookingRecipeIds = new Set();
  const attemptIdsByRecipe = new Map();
  cooking.records.forEach((record, index) => {
    const audit = auditsByRecipeId.get(record.recipe_id);
    const expected = audit
      ? {
          order: String(audit.order),
          requested_title: audit.requestedTitle,
          selected_title: audit.selectedTitle,
          recipe_id: audit.recipe.id,
        }
      : null;
    const context = expected
      ? `${expected.recipe_id}:actual_cooking:row-${index + 1}`
      : `row-${index + 1}:actual_cooking`;
    if (!expected || !identityMatches(record, expected)) {
      fail(context, "핵심 20개 선택과 식별자가 일치하지 않습니다.", expected?.recipe_id);
      return;
    }
    presentCookingRecipeIds.add(expected.recipe_id);
    if (!ALLOWED_RESULTS.has(record.status)) {
      fail(context, "status는 pending, approved, needs_revision, rejected 중 하나여야 합니다.", expected.recipe_id);
      return;
    }
    if (record.status === "pending") return;

    if (!VERSION_PATTERN.test(record.recipe_version)) fail(context, "recipe_version이 필요합니다.", expected.recipe_id);
    if (!ATTEMPT_ID_PATTERN.test(record.attempt_id)) {
      fail(context, "attempt_id는 레시피 안에서 고유한 익명 시도 코드여야 합니다.", expected.recipe_id);
    } else {
      const attemptIds = attemptIdsByRecipe.get(expected.recipe_id) ?? new Set();
      if (attemptIds.has(record.attempt_id)) {
        fail(context, "attempt_id가 같은 레시피 안에서 중복됩니다.", expected.recipe_id);
      }
      attemptIds.add(record.attempt_id);
      attemptIdsByRecipe.set(expected.recipe_id, attemptIds);
    }
    if (!APP_SHA_PATTERN.test(record.app_build_sha)) {
      fail(context, "app_build_sha는 7~40자리 Git SHA여야 합니다.", expected.recipe_id);
    }
    if (!new Set(["web", "ios", "android"]).has(record.test_surface)) {
      fail(context, "test_surface는 web, ios, android 중 하나여야 합니다.", expected.recipe_id);
    }
    if (!nonBlank(record.test_device)) fail(context, "test_device가 필요합니다.", expected.recipe_id);
    if (!validDate(record.test_date)) {
      fail(context, "test_date는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.", expected.recipe_id);
    }
    if (!REVIEWER_CODE_PATTERN.test(record.tester_code)) {
      fail(context, "tester_code는 익명 코드 형식이어야 합니다.", expected.recipe_id);
    }
    if (!nonBlank(record.heat_source)) fail(context, "heat_source가 필요합니다.", expected.recipe_id);
    if (!nonBlank(record.cookware)) fail(context, "cookware가 필요합니다.", expected.recipe_id);
    if (!validTimestamp(record.started_at) || !validTimestamp(record.completed_at)) {
      fail(context, "started_at과 completed_at은 유효한 시각이어야 합니다.", expected.recipe_id);
    } else if (Date.parse(record.completed_at) <= Date.parse(record.started_at)) {
      fail(context, "completed_at은 started_at보다 늦어야 합니다.", expected.recipe_id);
    }
    const actualMinutes = Number(record.actual_minutes);
    if (!Number.isFinite(actualMinutes) || actualMinutes <= 0 || actualMinutes > 240) {
      fail(context, "actual_minutes는 0보다 크고 240 이하여야 합니다.", expected.recipe_id);
    }
    if (!new Set(["true", "false"]).has(record.completed)) {
      fail(context, "completed는 true 또는 false여야 합니다.", expected.recipe_id);
    }
    if (!new Set(["none", "reported"]).has(record.safety_issue)) {
      fail(context, "safety_issue는 none 또는 reported여야 합니다.", expected.recipe_id);
    }
    if (!nonBlank(record.copy_change) || !nonBlank(record.image_change)) {
      fail(context, "copy_change와 image_change는 변경 없음도 none으로 기록해야 합니다.", expected.recipe_id);
    }
    if (
      [record.test_device, record.copy_change, record.image_change, record.evidence_path].some((value) =>
        DIRECT_PII_PATTERN.test(value),
      )
    ) {
      fail(context, "이메일 또는 전화번호 형태의 개인정보를 기록할 수 없습니다.", expected.recipe_id);
    }
    if (!validEvidencePath(record.evidence_path, cwd, pathExists)) {
      fail(context, `evidence_path는 ${EVIDENCE_ROOT}/ 아래의 실제 경로여야 합니다.`, expected.recipe_id);
    }
    if (record.completed === "false" && (!nonBlank(record.failed_step) || !nonBlank(record.failure_code))) {
      fail(context, "미완성 테스트는 failed_step과 failure_code가 필요합니다.", expected.recipe_id);
    }
    if (record.status === "approved" && (record.completed !== "true" || record.safety_issue !== "none")) {
      fail(context, "미완성 또는 안전 문제가 있는 테스트는 approved일 수 없습니다.", expected.recipe_id);
    }
  });
  for (const audit of audits) {
    if (!presentCookingRecipeIds.has(audit.recipe.id)) {
      invalidRecipeIds.add(audit.recipe.id);
      errors.push(`${audit.recipe.id}:actual_cooking: 조리 기록 행이 없습니다.`);
    }
  }

  const expectedReviews = expectedReviewRows(audits);
  if (reviews.records.length !== expectedReviews.length) {
    errors.push(`human_review: ${expectedReviews.length}개 행이 필요하지만 ${reviews.records.length}개입니다.`);
  }
  reviews.records.forEach((record, index) => {
    const expected = expectedReviews[index];
    const context = expected ? `${expected.recipe_id}:${expected.review_type}` : `row-${index + 1}:human_review`;
    if (!expected || !identityMatches(record, expected, true)) {
      fail(context, "핵심 20개 검수 순서, 식별자 또는 review_type이 일치하지 않습니다.");
      return;
    }
    if (!ALLOWED_RESULTS.has(record.result)) {
      fail(context, "result는 pending, approved, needs_revision, rejected 중 하나여야 합니다.");
      return;
    }
    if (record.result === "pending") return;

    if (!VERSION_PATTERN.test(record.recipe_version)) fail(context, "recipe_version이 필요합니다.");
    if (!REVIEWER_CODE_PATTERN.test(record.reviewer_code)) fail(context, "reviewer_code는 익명 코드 형식이어야 합니다.");
    if (!validTimestamp(record.reviewed_at)) fail(context, "reviewed_at이 유효한 시각이 아닙니다.");
    const score = Number(record.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) fail(context, "score는 0~100이어야 합니다.");
    if (!nonBlank(record.notes)) fail(context, "notes가 필요합니다.");
    if ([record.notes, record.evidence_path].some((value) => DIRECT_PII_PATTERN.test(value))) {
      fail(context, "이메일 또는 전화번호 형태의 개인정보를 기록할 수 없습니다.", expected.recipe_id);
    }
    if (!validEvidencePath(record.evidence_path, cwd, pathExists)) {
      fail(context, `evidence_path는 ${EVIDENCE_ROOT}/ 아래의 실제 경로여야 합니다.`);
    }
    if (
      record.review_type === "legal_source" &&
      record.result === "approved" &&
      (!UUID_PATTERN.test(record.db_recipe_id) || !UUID_PATTERN.test(record.source_record_id))
    ) {
      fail(context, "legal_source 승인은 DB recipe UUID와 recipe_sources UUID가 필요합니다.");
    }
  });

  for (const field of ["db_recipe_id", "source_record_id"]) {
    const seen = new Map();
    for (const record of reviews.records.filter(
      (candidate) => candidate.review_type === "legal_source" && candidate.result === "approved",
    )) {
      if (!UUID_PATTERN.test(record[field])) continue;
      const previousRecipeId = seen.get(record[field]);
      if (previousRecipeId && previousRecipeId !== record.recipe_id) {
        fail(
          `${record.recipe_id}:legal_source`,
          `${field}가 다른 핵심 레시피와 중복됩니다.`,
          record.recipe_id,
        );
        invalidContexts.add(`${previousRecipeId}:legal_source`);
        invalidRecipeIds.add(previousRecipeId);
        errors.push(`${previousRecipeId}:legal_source: ${field}가 다른 핵심 레시피와 중복됩니다.`);
      } else {
        seen.set(record[field], record.recipe_id);
      }
    }
  }

  const cookingByRecipe = new Map();
  for (const record of cooking.records) {
    const records = cookingByRecipe.get(record.recipe_id) ?? [];
    records.push(record);
    cookingByRecipe.set(record.recipe_id, records);
  }
  const reviewsByRecipe = new Map();
  for (const record of reviews.records) {
    const byType = reviewsByRecipe.get(record.recipe_id) ?? new Map();
    byType.set(record.review_type, record);
    reviewsByRecipe.set(record.recipe_id, byType);
  }

  const eligibleRecipeIds = [];
  const currentCookingByRecipe = new Map();
  for (const audit of audits) {
    const recipeId = audit.recipe.id;
    const cookingRecord = (cookingByRecipe.get(recipeId) ?? [])
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => record.status !== "pending")
      .sort(
        (left, right) =>
          Date.parse(right.record.completed_at) - Date.parse(left.record.completed_at) || right.index - left.index,
      )[0]?.record;
    if (cookingRecord) currentCookingByRecipe.set(recipeId, cookingRecord);
    const reviewRecords = reviewsByRecipe.get(recipeId);
    const contexts = [
      ...PHASE5_HUMAN_REVIEW_TYPES.map((reviewType) => `${recipeId}:${reviewType}`),
    ];
    const version = cookingRecord?.recipe_version;
    const reviewsApproved = PHASE5_HUMAN_REVIEW_TYPES.every(
      (reviewType) => reviewRecords?.get(reviewType)?.result === "approved",
    );
    const versionsMatch =
      VERSION_PATTERN.test(version ?? "") &&
      PHASE5_HUMAN_REVIEW_TYPES.every(
        (reviewType) => reviewRecords?.get(reviewType)?.recipe_version === version,
      );
    if (cookingRecord?.status === "approved" && reviewsApproved && !versionsMatch) {
      invalidContexts.add(`${recipeId}:version`);
      invalidRecipeIds.add(recipeId);
      errors.push(`${recipeId}:version: 실제 조리와 사람 검수 4종의 recipe_version이 같아야 합니다.`);
    }
    if (
      audit.score.total >= 90 &&
      audit.score.bitmapState === "local_bitmap_present" &&
      cookingRecord?.status === "approved" &&
      reviewsApproved &&
      versionsMatch &&
      !invalidRecipeIds.has(recipeId) &&
      contexts.every((context) => !invalidContexts.has(context))
    ) {
      eligibleRecipeIds.push(recipeId);
    }
  }

  const approvedReviewCount = (reviewType) =>
    reviews.records.filter(
      (record) =>
        record.review_type === reviewType &&
        record.result === "approved" &&
        !invalidContexts.has(`${record.recipe_id}:${reviewType}`),
    ).length;

  return {
    errors,
    eligibleRecipeIds,
    counts: {
      selected: audits.length,
      actualCookingApproved: audits.filter(
        (audit) =>
          currentCookingByRecipe.get(audit.recipe.id)?.status === "approved" &&
          !invalidRecipeIds.has(audit.recipe.id),
      ).length,
      beginner: approvedReviewCount("beginner"),
      food_safety: approvedReviewCount("food_safety"),
      legal_source: approvedReviewCount("legal_source"),
      image_rights: approvedReviewCount("image_rights"),
      publicationEligible: eligibleRecipeIds.length,
      invalidRecords: invalidContexts.size,
    },
  };
}

function run(cwd) {
  const cookingPath = path.join(cwd, PHASE5_COOKING_TEMPLATE_PATH);
  const reviewPath = path.join(cwd, PHASE5_HUMAN_REVIEW_TEMPLATE_PATH);
  if (!existsSync(cookingPath) || !existsSync(reviewPath)) {
    console.error("Phase 5 human evidence templates are missing. Run pnpm phase5:audit first.");
    process.exitCode = 1;
    return;
  }
  const result = evaluatePhase5HumanEvidence({
    cwd,
    cookingCsv: readFileSync(cookingPath, "utf8"),
    reviewCsv: readFileSync(reviewPath, "utf8"),
  });
  console.log("Phase 5 human evidence status");
  console.log(`Actual cooking approved: ${result.counts.actualCookingApproved}/${result.counts.selected}`);
  for (const reviewType of PHASE5_HUMAN_REVIEW_TYPES) {
    console.log(`${reviewType} approved: ${result.counts[reviewType]}/${result.counts.selected}`);
  }
  console.log(`Publication eligible: ${result.counts.publicationEligible}/${result.counts.selected}`);
  console.log(`Invalid records: ${result.counts.invalidRecords}`);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`- ${error}`);
  }
  if (result.counts.publicationEligible !== result.counts.selected || result.errors.length > 0) {
    console.error("BLOCKED - Phase 5 human evidence is incomplete or invalid.");
    process.exitCode = 1;
  } else {
    console.log("PASS - all Phase 5 human evidence gates are complete for this version.");
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) run(process.cwd());
