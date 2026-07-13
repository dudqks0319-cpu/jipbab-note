import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";
import {
  PHASE5_COOKING_TEMPLATE_COLUMNS,
  PHASE5_COOKING_TEMPLATE_PATH,
  PHASE5_CORE_20_SELECTIONS,
  PHASE5_HUMAN_TEST_PACKETS_PATH,
  PHASE5_HUMAN_REVIEW_TEMPLATE_PATH,
  buildPhase5Artifacts,
  checkPhase5Artifacts,
  contentVersionForRecipe,
  parseCsvRows,
  writePhase5Artifacts,
} from "../scripts/generate-phase-5-core-recipe-audit.mjs";

const cwd = process.cwd();

function recipeText(title: string): string {
  const recipe = CURATED_JIPBAB_RECIPES.find((candidate) => candidate.name === title);
  assert.ok(recipe, `missing curated recipe: ${title}`);
  return JSON.stringify(recipe);
}

test("Phase 5 핵심 목록은 20개의 고유 후보와 4개의 명시적 대체만 사용한다", () => {
  assert.equal(PHASE5_CORE_20_SELECTIONS.length, 20);
  assert.equal(new Set(PHASE5_CORE_20_SELECTIONS.map((selection) => selection.selectedTitle)).size, 20);
  assert.equal(PHASE5_CORE_20_SELECTIONS.filter((selection) => selection.replacementReason).length, 4);
});

test("Phase 5 후보는 현재 카탈로그에서 정확히 한 번씩 해석된다", () => {
  const { audits } = buildPhase5Artifacts(cwd);
  assert.equal(audits.length, 20);
  for (const audit of audits) {
    assert.equal(
      CURATED_JIPBAB_RECIPES.filter((recipe) => recipe.name === audit.selectedTitle).length,
      1,
      audit.selectedTitle,
    );
    assert.ok(audit.score.total >= 0 && audit.score.total <= 100, audit.selectedTitle);
  }
});

test("사람 검수 패킷과 CSV는 현재 조리 콘텐츠의 결정적 버전에 고정된다", () => {
  const { audits, files } = buildPhase5Artifacts(cwd);
  const versions = new Set(audits.map((audit) => audit.recipeVersion));
  assert.equal(versions.size, 20);
  for (const audit of audits) {
    assert.match(audit.recipeVersion, /^phase5-sha256-[0-9a-f]{24}$/u);
  }

  const cookingRows = parseCsvRows(files[PHASE5_COOKING_TEMPLATE_PATH]);
  const reviewRows = parseCsvRows(files[PHASE5_HUMAN_REVIEW_TEMPLATE_PATH]);
  assert.ok(cookingRows);
  assert.ok(reviewRows);
  const cookingVersionIndex = cookingRows[0].indexOf("recipe_version");
  const reviewVersionIndex = reviewRows[0].indexOf("recipe_version");
  assert.deepEqual(
    cookingRows.slice(1).filter((row) => row.some(Boolean)).map((row) => row[cookingVersionIndex]),
    audits.map((audit) => audit.recipeVersion),
  );
  assert.deepEqual(
    reviewRows.slice(1).filter((row) => row.some(Boolean)).map((row) => row[reviewVersionIndex]),
    audits.flatMap((audit) => Array(4).fill(audit.recipeVersion)),
  );

  const packets = files[PHASE5_HUMAN_TEST_PACKETS_PATH];
  assert.equal((packets.match(/^## \d{2}\. /gmu) ?? []).length, 20);
  for (const audit of audits) {
    assert.ok(packets.includes(`레시피 ID: \`${audit.recipe.id}\``));
    assert.ok(packets.includes(`콘텐츠 버전: \`${audit.recipeVersion}\``));
  }
  assert.match(packets, /실제 사람이 앱 화면만 보고 조리한 결과만 기록/u);
  assert.match(packets, /자동 승인하거나 DB에 반영하지 않는다/u);
  assert.doesNotMatch(packets, /테스트 금지/u);
});

test("조리 안내가 바뀌면 사람 증거용 콘텐츠 버전도 바뀐다", () => {
  const recipe = CURATED_JIPBAB_RECIPES.find((candidate) => candidate.name === "간장계란밥");
  assert.ok(recipe);
  const changedRecipe = {
    ...recipe,
    steps: recipe.steps.map((step, index) =>
      index === 0 ? { ...step, description: `${step.description} 변경` } : step,
    ),
  };
  assert.notEqual(contentVersionForRecipe(recipe), contentVersionForRecipe(changedRecipe));
});

test("자동 점수와 코드 플래그는 인간 검수나 실제 조리 증거로 승격되지 않는다", () => {
  const { audits } = buildPhase5Artifacts(cwd);
  for (const audit of audits) {
    assert.equal(audit.hardGateStatus, "blocked");
    assert.equal(audit.publishDecision, "blocked_missing_human_evidence");
    assert.ok(audit.blockingGates.includes("actual_cooking_test"));
    assert.ok(audit.blockingGates.includes("beginner_human_review"));
    assert.ok(audit.blockingGates.includes("legal_source_human_review"));
  }
});

test("계획서 지정 6개 레시피는 계량, 도구, 시간, 복구 기준을 포함한다", () => {
  const eggRoll = recipeText("프라이팬 계란말이");
  for (const term of ["20~24cm", "3~5mm", "30초", "1/2작은술", "70%", "2~3번"]) {
    assert.ok(eggRoll.includes(term), `프라이팬 계란말이: ${term}`);
  }

  const porkStew = recipeText("돼지고기 김치찌개");
  for (const term of ["200g", "2~3cm", "550ml", "2분", "3분", "10분", "7분", "1분", "분홍색"]) {
    assert.ok(porkStew.includes(term), `돼지고기 김치찌개: ${term}`);
  }

  const doenjangStew = recipeText("된장찌개");
  for (const term of ["500ml", "18~20cm", "1.5cm", "1.5큰술"]) {
    assert.ok(doenjangStew.includes(term), `된장찌개: ${term}`);
  }

  const potatoes = recipeText("감자조림");
  for (const term of ["350g", "2cm", "24cm", "200ml", "10~12분", "2~3분"]) {
    assert.ok(potatoes.includes(term), `감자조림: ${term}`);
  }

  const tofu = recipeText("두부조림");
  for (const term of ["300g", "1.5cm", "5분", "1큰술", "24cm", "2~3분", "100ml", "5~7분"]) {
    assert.ok(tofu.includes(term), `두부조림: ${term}`);
  }

  const tunaRice = recipeText("참치김치볶음밥");
  for (const term of ["200g", "150g", "50~70g", "24~26cm", "1분", "3분", "3~4분"]) {
    assert.ok(tunaRice.includes(term), `참치김치볶음밥: ${term}`);
  }
});

test("커밋된 Phase 5 감사 산출물은 현재 소스와 일치한다", () => {
  assert.deepEqual(checkPhase5Artifacts(cwd).stale, []);
});

test("감사 재생성은 입력된 실제 조리 증거를 덮어쓰지 않는다", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "jipbab-phase5-"));
  const templatePath = path.join(tempRoot, PHASE5_COOKING_TEMPLATE_PATH);
  mkdirSync(path.dirname(templatePath), { recursive: true });

  const artifacts = buildPhase5Artifacts(cwd);
  const emptyTemplate = artifacts.files["docs/phase-5-actual-cooking-template.csv"];
  const firstVersion = artifacts.audits[0].recipeVersion;
  const firstAttempt = emptyTemplate.replace(
    `beginner-recipe-001,${firstVersion},,`,
    `beginner-recipe-001,${firstVersion},attempt-first,`,
  );
  const parsed = parseCsvRows(firstAttempt);
  assert.ok(parsed);
  const [header, firstRow] = parsed;
  const appendedRow = [...firstRow];
  appendedRow[header.indexOf("attempt_id")] = "attempt-retest";
  const populatedTemplate = `${firstAttempt.trimEnd()}\n${appendedRow.join(",")}\n`;
  assert.notEqual(populatedTemplate, emptyTemplate);
  writeFileSync(templatePath, populatedTemplate, "utf8");

  try {
    writePhase5Artifacts(tempRoot);
    assert.equal(readFileSync(templatePath, "utf8"), populatedTemplate);
    assert.deepEqual(checkPhase5Artifacts(tempRoot).stale, []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("감사 재생성은 입력된 사람 검수 기록도 덮어쓰지 않는다", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "jipbab-phase5-"));
  const templatePath = path.join(tempRoot, PHASE5_HUMAN_REVIEW_TEMPLATE_PATH);
  mkdirSync(path.dirname(templatePath), { recursive: true });

  const artifacts = buildPhase5Artifacts(cwd);
  const emptyTemplate = artifacts.files[PHASE5_HUMAN_REVIEW_TEMPLATE_PATH];
  const parsed = parseCsvRows(emptyTemplate);
  assert.ok(parsed);
  const [header, ...rows] = parsed;
  rows[0][header.indexOf("reviewer_code")] = "reviewer-a01";
  const populatedTemplate = `${[header, ...rows].map((row) => row.join(",")).join("\n")}\n`;
  assert.notEqual(populatedTemplate, emptyTemplate);
  writeFileSync(templatePath, populatedTemplate, "utf8");

  try {
    writePhase5Artifacts(tempRoot);
    assert.equal(readFileSync(templatePath, "utf8"), populatedTemplate);
    assert.deepEqual(checkPhase5Artifacts(tempRoot).stale, []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("증거가 없는 이전 조리 템플릿은 새 계약으로만 안전하게 갱신한다", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "jipbab-phase5-"));
  const templatePath = path.join(tempRoot, "docs/phase-5-actual-cooking-template.csv");
  mkdirSync(path.dirname(templatePath), { recursive: true });

  const currentTemplate = buildPhase5Artifacts(cwd).files[PHASE5_COOKING_TEMPLATE_PATH];
  const parsed = parseCsvRows(currentTemplate);
  assert.ok(parsed);
  const removedColumns = new Set(["attempt_id", "app_build_sha", "test_surface", "test_device"]);
  const keptIndexes = PHASE5_COOKING_TEMPLATE_COLUMNS.map((column, index) => ({ column, index }))
    .filter(({ column }) => !removedColumns.has(column))
    .map(({ index }) => index);
  const legacyTemplate = `${parsed
    .map((values) => keptIndexes.map((index) => values[index] ?? "").join(","))
    .join("\n")}\n`;
  writeFileSync(templatePath, legacyTemplate, "utf8");

  try {
    writePhase5Artifacts(tempRoot);
    assert.equal(
      readFileSync(templatePath, "utf8"),
      buildPhase5Artifacts(tempRoot).files["docs/phase-5-actual-cooking-template.csv"],
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("현재 선택과 맞지 않는 실제 조리 기록은 덮어쓰지 않고 감사를 중단한다", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "jipbab-phase5-"));
  const templatePath = path.join(tempRoot, "docs/phase-5-actual-cooking-template.csv");
  mkdirSync(path.dirname(templatePath), { recursive: true });

  const incompatibleTemplate = buildPhase5Artifacts(cwd).files[
    "docs/phase-5-actual-cooking-template.csv"
  ].replace("beginner-recipe-001", "retired-recipe-001");
  writeFileSync(templatePath, incompatibleTemplate, "utf8");

  try {
    assert.throws(
      () => writePhase5Artifacts(tempRoot),
      /human evidence is incompatible/u,
    );
    assert.equal(readFileSync(templatePath, "utf8"), incompatibleTemplate);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
