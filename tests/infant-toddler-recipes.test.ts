import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  INFANT_TODDLER_RECIPE_CANDIDATES,
  INFANT_TODDLER_STAGE_COUNTS,
  canPublishInfantToddlerRecipe,
  validateInfantToddlerRecipeCandidate,
} from "../lib/infant-toddler-recipes.ts";

test("research intake contains 24 unique infant and toddler recipe candidates", () => {
  assert.equal(INFANT_TODDLER_RECIPE_CANDIDATES.length, 24);
  assert.deepEqual(INFANT_TODDLER_STAGE_COUNTS, {
    "4~6개월": 8,
    "6~8개월": 6,
    "8~11개월": 4,
    "12개월 이상": 6,
  });

  assert.equal(new Set(INFANT_TODDLER_RECIPE_CANDIDATES.map((recipe) => recipe.id)).size, 24);
  assert.equal(new Set(INFANT_TODDLER_RECIPE_CANDIDATES.map((recipe) => recipe.name)).size, 24);
});

test("all candidates remain research-only until cooking, medical, rights, and image reviews exist", () => {
  for (const recipe of INFANT_TODDLER_RECIPE_CANDIDATES) {
    assert.equal(recipe.publicationStatus, "research_only", recipe.id);
    assert.equal(recipe.sourceUsage, "summary_only", recipe.id);
    assert.equal(recipe.imageUrl, null, recipe.id);
    assert.equal(canPublishInfantToddlerRecipe(recipe), false, recipe.id);
    assert.deepEqual(validateInfantToddlerRecipeCandidate(recipe), [], recipe.id);
  }
});

test("infant candidates encode food safety and allergen boundaries", () => {
  for (const recipe of INFANT_TODDLER_RECIPE_CANDIDATES) {
    assert.ok(recipe.ingredients.length >= 2, recipe.id);
    assert.ok(recipe.preparationSummary.length >= 2, recipe.id);
    assert.ok(recipe.safetyNotes.some((note) => note.includes("새 재료")), recipe.id);
    assert.ok(recipe.safetyNotes.some((note) => note.includes("보호자")), recipe.id);

    if (recipe.minimumAgeMonths < 12) {
      assert.equal(recipe.ingredients.some((ingredient) => ingredient.includes("꿀")), false, recipe.id);
      assert.ok(recipe.safetyNotes.some((note) => note.includes("꿀")), recipe.id);
    }

    if (recipe.allergens.length > 0) {
      assert.ok(recipe.safetyNotes.some((note) => note.includes("알레르기")), recipe.id);
    }
  }
});

test("recipe UI links to a dedicated research-only age filter screen", () => {
  const recipePage = readFileSync(new URL("../app/recipe/page.tsx", import.meta.url), "utf8");
  const kidsPage = readFileSync(new URL("../app/recipe/infant-toddler/page.tsx", import.meta.url), "utf8");

  assert.match(recipePage, /href="\/recipe\/infant-toddler"/);
  assert.match(kidsPage, /data-testid="infant-toddler-stage-filter"/);
  assert.match(kidsPage, /검수 전 참고용/);
  assert.match(kidsPage, /의료 진단이나 개인별 영양 처방을 대신하지 않아요/);
  assert.doesNotMatch(kidsPage, /요리 시작|조리 시작/);
});
