import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  INFANT_TODDLER_RECIPE_CANDIDATES,
  INFANT_TODDLER_RESEARCH_RECIPES,
  INFANT_TODDLER_STAGE_COUNTS,
  canPublishInfantToddlerRecipe,
  validateInfantToddlerRecipeCandidate,
} from "../lib/infant-toddler-recipes.ts";

test("아동식 조사 후보 24개는 공통 recipe v2 연구 모델로 변환된다", () => {
  assert.equal(INFANT_TODDLER_RECIPE_CANDIDATES.length, 24);
  assert.equal(INFANT_TODDLER_RESEARCH_RECIPES.length, 24);
  assert.deepEqual(INFANT_TODDLER_STAGE_COUNTS, {
    "4~6개월": 8,
    "6~8개월": 6,
    "8~11개월": 4,
    "12개월 이상": 6,
  });
  assert.equal(new Set(INFANT_TODDLER_RESEARCH_RECIPES.map((recipe) => recipe.id)).size, 24);

  for (const recipe of INFANT_TODDLER_RESEARCH_RECIPES) {
    assert.equal(recipe.schemaVersion, 2, recipe.id);
    assert.equal(recipe.category, "child_meal_research", recipe.id);
    assert.equal(recipe.publicationStatus, "research_only", recipe.id);
    assert.equal(recipe.featureFlag, "off", recipe.id);
    assert.equal(recipe.childGuidance.ageGuidanceStatus, "research", recipe.id);
    assert.equal(recipe.childGuidance.medicalReviewStatus, "not_reviewed", recipe.id);
    assert.equal(recipe.childGuidance.sodiumPolicy, null, recipe.id);
    assert.equal(recipe.childGuidance.portionGuidance, null, recipe.id);
  }
});

test("조사 후보는 실제 조리·전문가·권리 검수 전 항상 공개 차단된다", () => {
  for (const recipe of INFANT_TODDLER_RECIPE_CANDIDATES) {
    assert.equal(recipe.publicationStatus, "research_only", recipe.id);
    assert.equal(recipe.sourceUsage, "summary_only", recipe.id);
    assert.equal(recipe.imageUrl, null, recipe.id);
    assert.equal(canPublishInfantToddlerRecipe(recipe), false, recipe.id);
    assert.deepEqual(validateInfantToddlerRecipeCandidate(recipe), [], recipe.id);
  }
});

test("아동식 화면은 공개 경로 없이 비운영 서버 플래그로만 열린다", () => {
  const adminPagePath = new URL("../app/admin/content-research/infant-toddler/page.tsx", import.meta.url);
  const publicPagePath = new URL("../app/recipe/infant-toddler/page.tsx", import.meta.url);
  const adminPage = readFileSync(adminPagePath, "utf8");
  const recipePage = readFileSync(new URL("../app/recipe/page.tsx", import.meta.url), "utf8");

  assert.equal(existsSync(publicPagePath), false);
  assert.doesNotMatch(recipePage, /\/recipe\/infant-toddler/);
  assert.match(adminPage, /CHILD_MEAL_RESEARCH_ADMIN_ENABLED/);
  assert.match(adminPage, /process\.env\.NODE_ENV === "production"/);
  assert.match(adminPage, /notFound\(\)/);
  assert.match(adminPage, /공개 금지/);
});
