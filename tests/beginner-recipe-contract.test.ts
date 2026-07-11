import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BEGINNER_HOME_CONTRACT,
  BEGINNER_HOME_QA_EXCLUDED_RECIPE_NAMES,
  filterBeginnerHomeRecipes,
  isBeginnerHomeRecommendation,
  validateBeginnerRecipeContract,
} from "../lib/beginner-recipe-contract.ts";
import {
  CORE_RECIPE_50_NAMES,
  CURATED_JIPBAB_RECIPES,
  CURATED_RECIPE_RECORDS,
  ONBOARDING_RECIPE_10_NAMES,
  RELEASE_RECIPE_30_NAMES,
} from "../lib/curated-recipes.ts";
import { BEGINNER_RECIPE_LIBRARY, canPublishRecipe } from "../lib/beginner-recipes.ts";

test("beginner contract encodes the v2 launch gate", () => {
  assert.equal(BEGINNER_HOME_CONTRACT.minBeginnerScore, 80);
  assert.equal(BEGINNER_HOME_CONTRACT.maxDifficultyLevel, 2);
  assert.equal(BEGINNER_HOME_CONTRACT.maxRequiredIngredients, 7);
  assert.equal(BEGINNER_HOME_CONTRACT.maxRequiredTools, 3);
  assert.equal(BEGINNER_HOME_CONTRACT.maxTotalMinutes, 20);
  assert.equal(BEGINNER_HOME_CONTRACT.maxSteps, 6);
  assert.deepEqual(BEGINNER_HOME_CONTRACT.allowedSafetyLevels, ["A", "B"]);
});

test("curated recipes carry source, safety, and beginner metadata", () => {
  assert.ok(CURATED_JIPBAB_RECIPES.length >= 100);

  for (const recipe of CURATED_JIPBAB_RECIPES) {
    assert.ok(
      recipe.source?.sourceType === "original-general-principle" || recipe.source?.sourceType === "original",
      recipe.id,
    );
    assert.equal(recipe.safety?.safetyLevel, "B", recipe.id);
    assert.equal(recipe.source?.adaptedByJipbabNote ?? recipe.safety?.adaptedByJipbabNote, true, recipe.id);
    assert.equal(recipe.source?.imageUsageAllowed ?? recipe.safety?.imageUsageAllowed, true, recipe.id);
    assert.ok(typeof recipe.beginnerScore === "number" && recipe.beginnerScore >= 80, recipe.id);
    assert.ok(recipe.difficultyLevel === 1 || recipe.difficultyLevel === 2, recipe.id);
    assert.ok(recipe.requiredTools && recipe.requiredTools.length <= 3, recipe.id);
    assert.ok(Array.isArray(recipe.substituteIngredients), recipe.id);
    assert.ok(recipe.fallbackMeal, recipe.id);
    assert.ok(recipe.storageTip, recipe.id);
    assert.ok(recipe.reheatTip, recipe.id);
    assert.ok(
      recipe.steps.every((step) => step.heat && typeof step.minutes === "number" && step.visualCue && step.commonMistake && step.rescueTip),
      recipe.id,
    );
  }
});

test("onboarding 10 recipes are present and stronger than the home gate", () => {
  const byName = new Map(CURATED_JIPBAB_RECIPES.map((recipe) => [recipe.name, recipe]));

  assert.equal(ONBOARDING_RECIPE_10_NAMES.length, 10);
  for (const recipeName of ONBOARDING_RECIPE_10_NAMES) {
    const recipe = byName.get(recipeName);
    assert.ok(recipe, recipeName);
    assert.ok(recipe.beginnerScore && recipe.beginnerScore >= 89, recipeName);
    assert.equal(isBeginnerHomeRecommendation(recipe), true, recipeName);
    assert.ok(recipe.homeCardCopy, recipeName);
    assert.ok(recipe.steps.every((step) => step.heat && typeof step.minutes === "number" && step.visualCue), recipeName);
  }
});

test("beginner recipe library has 100+ candidates and core 50", () => {
  assert.ok(BEGINNER_RECIPE_LIBRARY.length >= 100);
  assert.equal(CORE_RECIPE_50_NAMES.length, 50);

  const byTitle = new Map(BEGINNER_RECIPE_LIBRARY.map((recipe) => [recipe.title, recipe]));
  for (const recipeName of CORE_RECIPE_50_NAMES) {
    const recipe = byTitle.get(recipeName);
    assert.ok(recipe, recipeName);
    assert.ok(recipe.beginnerScore >= 80, recipeName);
    assert.ok(recipe.difficultyLevel <= 2, recipeName);
  }

  const published = BEGINNER_RECIPE_LIBRARY.filter((recipe) => recipe.publishStatus === "published");
  assert.ok(published.length >= 100);
  assert.ok(published.every(canPublishRecipe));
});

test("release 1 target 30 recipes are present and app-safe", () => {
  const byName = new Map(CURATED_JIPBAB_RECIPES.map((recipe) => [recipe.name, recipe]));

  assert.equal(RELEASE_RECIPE_30_NAMES.length, 30);
  for (const recipeName of RELEASE_RECIPE_30_NAMES) {
    const recipe = byName.get(recipeName);
    assert.ok(recipe, recipeName);
    assert.equal(isBeginnerHomeRecommendation(recipe), true, recipeName);
    assert.ok(recipe.beginnerScore && recipe.beginnerScore >= 80, recipeName);
    assert.ok(recipe.safety?.safetyLevel === "A" || recipe.safety?.safetyLevel === "B", recipeName);
    assert.ok(recipe.fallbackMeal, recipeName);
    assert.ok(recipe.storageTip, recipeName);
    assert.ok(recipe.reheatTip, recipeName);
    assert.notEqual(recipe.source?.sourceType, "reference-link", recipeName);
  }
});

test("home recommendation candidates are beginner-safe and rights-safe", () => {
  const safeHomeRecipes = filterBeginnerHomeRecipes(CURATED_RECIPE_RECORDS);

  assert.ok(safeHomeRecipes.length >= 10);
  for (const recipe of safeHomeRecipes) {
    assert.equal(isBeginnerHomeRecommendation(recipe), true, recipe.id);
    assert.ok(recipe.beginnerScore && recipe.beginnerScore >= 80, recipe.id);
    assert.ok(recipe.difficultyLevel && recipe.difficultyLevel <= 2, recipe.id);
    assert.ok(recipe.totalMinutes && recipe.totalMinutes <= 20, recipe.id);
    assert.ok(recipe.requiredTools && recipe.requiredTools.length <= 3, recipe.id);
    assert.ok(recipe.source?.sourceType !== "reference-link", recipe.id);
    assert.ok(recipe.safety?.safetyLevel === "A" || recipe.safety?.safetyLevel === "B", recipe.id);
  }
});

test("QA high-risk generated recipes stay out of home recommendations until menu review", () => {
  const byName = new Map(CURATED_RECIPE_RECORDS.map((recipe) => [recipe.name, recipe]));

  assert.ok(BEGINNER_HOME_QA_EXCLUDED_RECIPE_NAMES.size >= 10);
  for (const recipeName of BEGINNER_HOME_QA_EXCLUDED_RECIPE_NAMES) {
    const recipe = byName.get(recipeName);
    assert.ok(recipe, recipeName);
    assert.equal(isBeginnerHomeRecommendation(recipe), false, recipeName);
    assert.ok(
      validateBeginnerRecipeContract(recipe).some((issue) => issue.field === "qaReview"),
      recipeName,
    );
  }
});

test("unsafe reference content is rejected from home recommendations", () => {
  const unsafeRecipe = {
    ...CURATED_RECIPE_RECORDS[0],
    source: {
      sourceType: "reference-link" as const,
      sourceName: "외부 블로그",
      sourceUrl: "https://example.com/recipe",
      licenseOrUsageNote: "참고만 가능",
      rightsNote: "원문 사용 금지",
      imageUsageAllowed: false,
      adaptedByJipbabNote: false,
    },
    safety: {
      safetyLevel: "C" as const,
      copyrightRisk: "medium" as const,
      privacyRisk: "low" as const,
      commercialUseRisk: "medium" as const,
      imageUsageAllowed: false,
      adaptedByJipbabNote: false,
      notes: "reference only",
    },
  };

  assert.equal(isBeginnerHomeRecommendation(unsafeRecipe), false);
  assert.match(
    validateBeginnerRecipeContract(unsafeRecipe).map((issue) => issue.field).join(","),
    /source\/safety/,
  );
});

test("home page uses publication-gated API v1 recommendations without curated fallback", () => {
  const homeSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(homeSource, /useRecipeCatalog\(12, \{ ingredientIds: recipeIngredientIds/);
  assert.match(homeSource, /resolveIngredientCatalogIds/);
  assert.match(homeSource, /beginnerHomeRecipeCatalog/);
  assert.doesNotMatch(homeSource, /CURATED_RECIPE_RECORDS|ONBOARDING_RECIPE_10_NAMES/);
});
