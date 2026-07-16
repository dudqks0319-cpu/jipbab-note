import assert from "node:assert/strict";
import test from "node:test";

import { ApiV1ValidationError } from "../lib/api-v1-contract.ts";
import type { RecipeV1Card } from "../lib/recipe-api-v1-repository.ts";
import {
  parseRecipeRecommendationV1Input,
  rankRecipeRecommendationsV1,
} from "../lib/recipe-recommendation-v1.ts";

const REVIEWED_AT = "2026-07-10T05:00:00.000Z";

function card(overrides: Partial<RecipeV1Card> = {}): RecipeV1Card {
  return {
    id: "a36e34ec-5f17-4e4a-8e07-246b8082447e",
    slug: "egg-soup",
    title: "달걀국",
    summary: "부드러운 달걀국",
    category: { id: "soup", label: "국" },
    difficulty: 1,
    servings: 2,
    totalTimeMinutes: 12,
    thumbnailUrl: null,
    tools: ["냄비"],
    requiredIngredientCount: 2,
    ownedIngredientCount: 2,
    matchedIngredientIds: ["dairy-egg", "veg-green-onion"],
    missingIngredientIds: [],
    recommendationReason: "필수 재료가 모두 있어 바로 만들 수 있어요.",
    publishedAt: REVIEWED_AT,
    publicationEvidence: {
      reviewStatus: "approved",
      reviewedForBeginner: true,
      beginnerReviewedAt: REVIEWED_AT,
      actualCookingTested: true,
      actualCookingTestedAt: REVIEWED_AT,
      foodSafetyReviewed: true,
      foodSafetyReviewedAt: REVIEWED_AT,
      imageRightsStatus: "no_image_approved",
      imageRightsReviewedAt: REVIEWED_AT,
      sourceRecorded: true,
      sourceReviewedAt: REVIEWED_AT,
      publishedAt: REVIEWED_AT,
      reviewer: "editor-1",
      requirementsVerified: true,
    },
    ...overrides,
  };
}

test("recommendation input is bounded, normalized, and deduplicated", () => {
  const input = parseRecipeRecommendationV1Input({
    ingredientIds: ["DAIRY-EGG", "dairy-egg", "veg-green-onion"],
    expiringIngredientIds: ["dairy-egg"],
    excludedIngredients: ["meat-pork"],
    maxTime: 20,
    difficulty: 2,
    maxMissingIngredients: 1,
    servings: 3,
    limit: 5,
  });

  assert.deepEqual(input.ingredientIds, ["dairy-egg", "veg-green-onion"]);
  assert.deepEqual(input.expiringIngredientIds, ["dairy-egg"]);
  assert.deepEqual(input.excludedIngredientIds, ["meat-pork"]);
  assert.equal(input.maxTime, 20);
  assert.equal(input.servings, 3);
  assert.equal(input.limit, 5);
});

test("recommendation input rejects unknown shapes and unrelated expiring IDs", () => {
  for (const body of [
    { ingredientIds: [] },
    { ingredientIds: ["valid", "<script>"] },
    { ingredientIds: ["dairy-egg"], expiringIngredientIds: ["veg-onion"] },
    { ingredientIds: ["dairy-egg"], servings: 21 },
    { ingredientIds: ["dairy-egg"], maxMinutes: 20 },
    {
      ingredientIds: ["dairy-egg"],
      excludedIngredientIds: ["meat-pork"],
      excludedIngredients: ["meat-beef"],
    },
  ]) {
    assert.throws(
      () => parseRecipeRecommendationV1Input(body),
      (error: unknown) => error instanceof ApiV1ValidationError && error.code === "INVALID_BODY",
    );
  }
});

test("recommendations rank complete and expiring-ingredient matches first", () => {
  const ready = card();
  const missing = card({
    id: "b36e34ec-5f17-4e4a-8e07-246b8082447e",
    title: "양파 반찬",
    matchedIngredientIds: ["veg-onion"],
    missingIngredientIds: ["season-soy-dark"],
    ownedIngredientCount: 1,
    totalTimeMinutes: 10,
  });
  const unrelated = card({
    id: "c36e34ec-5f17-4e4a-8e07-246b8082447e",
    title: "두부 반찬",
    matchedIngredientIds: ["dairy-tofu"],
    missingIngredientIds: [],
  });
  const input = parseRecipeRecommendationV1Input({
    ingredientIds: ["dairy-egg", "veg-green-onion", "veg-onion", "dairy-tofu"],
    expiringIngredientIds: ["dairy-egg"],
    servings: 2,
  });

  const ranked = rankRecipeRecommendationsV1([missing, unrelated, ready], input);

  assert.equal(ranked[0].recipe.id, ready.id);
  assert.ok(ranked[0].reasons.includes("소비기한이 가까운 재료 1개를 사용할 수 있어요."));
  assert.ok(!ranked.find((item) => item.recipe.id === unrelated.id)?.reasons.some((reason) => reason.includes("소비기한")));
  assert.ok(ranked[0].score > ranked.find((item) => item.recipe.id === missing.id)!.score);
});
