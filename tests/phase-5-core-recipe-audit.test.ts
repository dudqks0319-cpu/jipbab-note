import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";
import {
  PHASE5_CORE_20_SELECTIONS,
  buildPhase5Artifacts,
  checkPhase5Artifacts,
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
  const templatePath = path.join(tempRoot, "docs/phase-5-actual-cooking-template.csv");
  mkdirSync(path.dirname(templatePath), { recursive: true });

  const emptyTemplate = buildPhase5Artifacts(cwd).files["docs/phase-5-actual-cooking-template.csv"];
  const populatedTemplate = emptyTemplate.replace("beginner-recipe-001,,", "beginner-recipe-001,v1,");
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
      /actual cooking evidence is incompatible/u,
    );
    assert.equal(readFileSync(templatePath, "utf8"), incompatibleTemplate);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
