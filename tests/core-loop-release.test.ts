import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";
import {
  calculateRecipeIngredientMatch,
  getEssentialMissingIngredients,
  rankRecipeRecommendations,
} from "../lib/matching.ts";
import { buildIngredientPayloadFromShoppingItem } from "../lib/shopping-to-fridge.ts";
import type { ShoppingItem } from "../types/index.ts";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const releaseGateSource = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGateSource = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");

test("core loop release check is wired into package and release gates", () => {
  assert.equal(packageJson.scripts["check:core-loop-release"], "node scripts/check-core-loop-release.mjs");
  assert.match(releaseGateSource, /scripts\/check-core-loop-release\.mjs/);
  assert.match(ciGateSource, /scripts\/check-core-loop-release\.mjs/);
  assert.match(releaseGateSource, /scripts\/check-beginner-goal-readiness\.mjs/);
  assert.match(ciGateSource, /scripts\/check-beginner-goal-readiness\.mjs/);
});

test("fridge ingredients drive a recipe, missing item shopping, and purchased item fridge refill", () => {
  const today = new Date("2026-05-22T09:00:00.000Z");
  const fridgeInventory = [
    { name: "된장", expiryDate: "2026-05-28" },
    { name: "두부", expiryDate: "2026-05-23" },
    { name: "양파", expiryDate: "2026-05-29" },
    { name: "대파", expiryDate: "2026-05-24" },
  ];

  const ranked = rankRecipeRecommendations(
    CURATED_JIPBAB_RECIPES.filter((recipe) => recipe.name === "된장찌개"),
    fridgeInventory,
    today,
  );
  const recommendation = ranked[0];

  assert.equal(recommendation.recipe.id, "beginner-recipe-067");
  assert.equal(recommendation.recipe.name, "된장찌개");
  assert.equal(recommendation.match.matchedIngredients.length, 4);
  assert.deepEqual(getEssentialMissingIngredients(recommendation.match.missingIngredients), ["애호박"]);

  const missingItem: ShoppingItem = {
    id: "shopping-core-loop-1",
    deviceId: "release-device",
    userId: null,
    name: "애호박",
    quantity: "1/3개",
    category: "채소",
    checked: true,
    sourceRecipeId: recommendation.recipe.id,
    sourceRecipeName: recommendation.recipe.name,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  };
  const fridgePayload = buildIngredientPayloadFromShoppingItem(missingItem, { now: today });

  assert.equal(fridgePayload.name, "애호박");
  assert.equal(fridgePayload.category, "채소");
  assert.equal(fridgePayload.storageType, "냉장");
  assert.equal(fridgePayload.purchaseDate, "2026-05-22");
  assert.equal(fridgePayload.memo, "된장찌개 장보기에서 냉장고 반영");

  const refilledInventory = [...fridgeInventory, { name: fridgePayload.name }];
  const completedMatch = calculateRecipeIngredientMatch(
    refilledInventory.map((item) => item.name),
    recommendation.recipe.ingredients,
  );

  assert.equal(completedMatch.matchRate, 100);
  assert.deepEqual(getEssentialMissingIngredients(completedMatch.missingIngredients), []);
});
