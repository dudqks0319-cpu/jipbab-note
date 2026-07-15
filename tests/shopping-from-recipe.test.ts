import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShoppingFromRecipeCandidates,
  buildShoppingFromRecipeUpserts,
  parseShoppingFromRecipeV1Input,
  ShoppingFromRecipeValidationError,
  type ShoppingFromRecipeDatabaseRow,
} from "../lib/shopping-from-recipe.ts";
import type { RecipeV1Detail } from "../lib/recipe-api-v1-repository.ts";

const RECIPE_ID = "a36e34ec-5f17-4e4a-8e07-246b8082447e";
const EGG_ID = "b36e34ec-5f17-4e4a-8e07-246b8082447e";
const ONION_ID = "c36e34ec-5f17-4e4a-8e07-246b8082447e";
const USER_ID = "d36e34ec-5f17-4e4a-8e07-246b8082447e";

function recipe(): RecipeV1Detail {
  return {
    id: RECIPE_ID,
    slug: "egg-soup",
    version: 3,
    schemaVersion: 2,
    title: "달걀국",
    summary: "부드러운 달걀국",
    category: { id: "soup", label: "국·찌개" },
    cuisineType: "korean",
    difficulty: 1,
    servings: 2,
    prepTimeMinutes: 2,
    cookTimeMinutes: 10,
    totalTimeMinutes: 12,
    thumbnailUrl: null,
    tools: ["냄비"],
    servingOptions: [
      {
        servings: 2,
        toolGuidance: "20cm 냄비를 사용한다.",
        timeGuidance: "완료 신호를 확인한다.",
        ingredientQuantities: [
          { recipeIngredientId: EGG_ID, quantity: { value: 2, text: "2개", unit: "piece" } },
          { recipeIngredientId: ONION_ID, quantity: { value: 0.25, text: "1/4개", unit: "piece" } },
        ],
      },
      {
        servings: 4,
        toolGuidance: "24cm 냄비를 사용한다.",
        timeGuidance: "완료 신호를 보고 더 익힌다.",
        ingredientQuantities: [
          { recipeIngredientId: EGG_ID, quantity: { value: 4, text: "4개", unit: "piece" } },
          { recipeIngredientId: ONION_ID, quantity: { value: 0.5, text: "1/2개", unit: "piece" } },
        ],
      },
    ],
    ingredients: [
      {
        id: EGG_ID,
        ingredientId: "dairy-egg",
        groupType: "main",
        displayName: "달걀",
        quantity: { value: 2, text: "2개", unit: "piece" },
        preparation: null,
        optional: false,
        pantryStaple: false,
        substitutions: [],
      },
      {
        id: ONION_ID,
        ingredientId: "veg-onion",
        groupType: "main",
        displayName: "양파",
        quantity: { value: 0.25, text: "1/4개", unit: "piece" },
        preparation: null,
        optional: false,
        pantryStaple: false,
        substitutions: [],
      },
    ],
    steps: [],
    safetyNotes: ["충분히 가열한다."],
    storageGuide: "냉장 보관한다.",
    reheatingGuide: "충분히 데운다.",
    source: {
      provider: "mfds",
      external_id: "egg-soup",
      title: "달걀국",
      source_url: null,
      license: "public",
      attribution: "식품의약품안전처",
    },
    publishedAt: "2026-07-10T05:00:00.000Z",
    publicationEvidence: {
      reviewStatus: "approved",
      reviewedForBeginner: true,
      beginnerReviewedAt: "2026-07-10T05:00:00.000Z",
      actualCookingTested: true,
      actualCookingTestedAt: "2026-07-10T05:00:00.000Z",
      foodSafetyReviewed: true,
      foodSafetyReviewedAt: "2026-07-10T05:00:00.000Z",
      imageRightsStatus: "approved",
      imageRightsReviewedAt: "2026-07-10T05:00:00.000Z",
      sourceRecorded: true,
      sourceReviewedAt: "2026-07-10T05:00:00.000Z",
      publishedAt: "2026-07-10T05:00:00.000Z",
      reviewer: "editor-1",
      requirementsVerified: true,
    },
  };
}

function existingEgg(overrides: Partial<ShoppingFromRecipeDatabaseRow> = {}): ShoppingFromRecipeDatabaseRow {
  return {
    id: "e36e34ec-5f17-4e4a-8e07-246b8082447e",
    device_id: "device-existing",
    user_id: USER_ID,
    family_group_id: null,
    name: "계란",
    quantity: "2개",
    category: "유제품",
    checked: true,
    source_recipe_id: "old-recipe",
    source_recipe_name: "옛 레시피",
    ...overrides,
  };
}

test("API-005 parser accepts only exact bounded recipe selections", () => {
  assert.deepEqual(
    parseShoppingFromRecipeV1Input({
      recipeId: RECIPE_ID,
      servings: 4,
      selectedIngredientIds: [EGG_ID, ONION_ID],
    }),
    {
      recipeId: RECIPE_ID,
      servings: 4,
      selectedIngredientIds: [EGG_ID, ONION_ID],
    },
  );

  for (const value of [
    { recipeId: RECIPE_ID, servings: 4, selectedIngredientIds: [] },
    { recipeId: RECIPE_ID, servings: 4, selectedIngredientIds: [EGG_ID, EGG_ID] },
    { recipeId: RECIPE_ID, servings: 0, selectedIngredientIds: [EGG_ID] },
    { recipeId: "not-a-uuid", servings: 4, selectedIngredientIds: [EGG_ID] },
    { recipeId: RECIPE_ID, servings: 4, selectedIngredientIds: [EGG_ID], name: "임의 재료" },
  ]) {
    assert.throws(
      () => parseShoppingFromRecipeV1Input(value),
      ShoppingFromRecipeValidationError,
    );
  }
});

test("API-005 derives names, categories, and reviewed serving quantities from the public recipe", () => {
  const input = parseShoppingFromRecipeV1Input({
    recipeId: RECIPE_ID,
    servings: 4,
    selectedIngredientIds: [ONION_ID, EGG_ID],
  });
  const candidates = buildShoppingFromRecipeCandidates(recipe(), input);

  assert.deepEqual(
    candidates.map((candidate) => ({
      recipeIngredientId: candidate.recipeIngredientId,
      name: candidate.name,
      quantity: candidate.quantity,
      category: candidate.category,
    })),
    [
      { recipeIngredientId: EGG_ID, name: "달걀", quantity: "4개", category: "유제품" },
      { recipeIngredientId: ONION_ID, name: "양파", quantity: "1/2개", category: "채소" },
    ],
  );

  assert.throws(
    () => buildShoppingFromRecipeCandidates(recipe(), { ...input, servings: 3 }),
    ShoppingFromRecipeValidationError,
  );
  assert.throws(
    () => buildShoppingFromRecipeCandidates(recipe(), {
      ...input,
      selectedIngredientIds: ["f36e34ec-5f17-4e4a-8e07-246b8082447e"],
    }),
    ShoppingFromRecipeValidationError,
  );
});

test("API-005 merges aliases and quantities without crossing user or family scopes", () => {
  const input = parseShoppingFromRecipeV1Input({
    recipeId: RECIPE_ID,
    servings: 4,
    selectedIngredientIds: [EGG_ID, ONION_ID],
  });
  const candidates = buildShoppingFromRecipeCandidates(recipe(), input);
  const result = buildShoppingFromRecipeUpserts(
    [existingEgg()],
    candidates,
    USER_ID,
  );

  assert.equal(result.addedCount, 1);
  assert.equal(result.mergedCount, 1);
  assert.equal(result.rows.length, 2);
  const egg = result.rows.find((row) => row.name === "계란");
  assert.ok(egg);
  assert.equal(egg.id, existingEgg().id);
  assert.equal(egg.device_id, "device-existing");
  assert.equal(egg.quantity, "6개");
  assert.equal(egg.checked, false);
  assert.equal(egg.source_recipe_id, `old-recipe · ${RECIPE_ID}`);
  assert.equal(egg.source_recipe_name, "옛 레시피 · 달걀국");

  const onion = result.rows.find((row) => row.name === "양파");
  assert.ok(onion);
  assert.equal(onion.user_id, USER_ID);
  assert.equal(onion.family_group_id, null);
  assert.equal(onion.device_id, `api:${USER_ID}`);

  assert.throws(
    () => buildShoppingFromRecipeUpserts(
      [existingEgg({ user_id: "f36e34ec-5f17-4e4a-8e07-246b8082447e" })],
      candidates,
      USER_ID,
    ),
    /shopping_scope_mismatch/,
  );
  assert.throws(
    () => buildShoppingFromRecipeUpserts(
      [existingEgg({ family_group_id: "f36e34ec-5f17-4e4a-8e07-246b8082447e" })],
      candidates,
      USER_ID,
    ),
    /shopping_scope_mismatch/,
  );
});

test("API-005 assigns stable per-user IDs so retries cannot create duplicate rows", () => {
  const input = parseShoppingFromRecipeV1Input({
    recipeId: RECIPE_ID,
    servings: 2,
    selectedIngredientIds: [ONION_ID],
  });
  const candidates = buildShoppingFromRecipeCandidates(recipe(), input);
  const first = buildShoppingFromRecipeUpserts([], candidates, USER_ID);
  const second = buildShoppingFromRecipeUpserts([], candidates, USER_ID);

  assert.equal(first.rows[0]?.id, second.rows[0]?.id);
  assert.match(first.rows[0]?.id ?? "", /^[0-9a-f-]{36}$/);
});
