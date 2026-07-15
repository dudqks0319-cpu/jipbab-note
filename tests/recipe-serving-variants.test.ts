import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { applyRecipeServingOption } from "../lib/recipe-servings.ts";
import type { RecipeIngredientDetail, RecipeServingOption } from "../types/index.ts";

const baseIngredients: RecipeIngredientDetail[] = [
  { id: "ingredient-1", name: "달걀", display: "2개", amount: "2", unit: "piece" },
  { id: "ingredient-2", name: "소금", display: "1작은술", amount: "1", unit: "tsp" },
];

const fourServings: RecipeServingOption = {
  servings: 4,
  toolGuidance: "24cm 냄비 1개를 사용한다.",
  timeGuidance: "완료 신호를 보고 1~2분 더 확인한다.",
  ingredientQuantities: [
    { recipeIngredientId: "ingredient-1", display: "4개", amount: "4", unit: "piece" },
    { recipeIngredientId: "ingredient-2", display: "1과 1/2작은술", amount: "1.5", unit: "tsp" },
  ],
};

test("FE-008 applies only reviewed per-serving quantities without arithmetic inference", () => {
  const result = applyRecipeServingOption(baseIngredients, fourServings);
  assert.deepEqual(result?.map((ingredient) => ingredient.display), ["4개", "1과 1/2작은술"]);
  assert.equal(result?.[1]?.amount, "1.5");
  assert.equal(result?.[1]?.unit, "tsp");
});

test("FE-008 fails closed when a serving option does not cover every ingredient", () => {
  assert.equal(
    applyRecipeServingOption(baseIngredients, {
      ...fourServings,
      ingredientQuantities: fourServings.ingredientQuantities.slice(0, 1),
    }),
    null,
  );
});

test("FE-008 migration keeps serving variants structured and rollback non-destructive", () => {
  const migration = readFileSync(
    "supabase/migrations/20260715100000_add_recipe_serving_variants.sql",
    "utf8",
  );
  const rollback = readFileSync(
    "supabase/rollbacks/20260715100000_add_recipe_serving_variants.sql",
    "utf8",
  );

  assert.match(migration, /add column if not exists serving_variants jsonb/);
  assert.match(migration, /recipe_serving_variants_shape/);
  assert.match(migration, /jsonb_array_length\(serving_variants\) between 0 and 20/);
  assert.match(migration, /revoke all on table public\.recipes from public, anon, authenticated/);
  assert.match(rollback, /revoke all on table public\.recipes from public, anon, authenticated, service_role/);
  assert.doesNotMatch(rollback, /drop table|drop column|truncate|delete from/i);
});

test("FE-008 detail UI owns one serving state for ingredients, shopping, and cooking", () => {
  const page = readFileSync("app/recipe/[id]/page.tsx", "utf8");
  const workspace = readFileSync("components/recipe/RecipeServingWorkspace.tsx", "utf8");
  const shoppingAssistant = readFileSync("components/recipe/RecipeShoppingAssistant.tsx", "utf8");

  assert.match(page, /RecipeServingWorkspace/);
  assert.match(workspace, /setSelectedServings/);
  assert.match(workspace, /applyRecipeServingOption/);
  assert.match(workspace, /RecipeShoppingAssistant/);
  assert.match(workspace, /RecipeCookMode/);
  assert.match(shoppingAssistant, /normalizeKoreanIngredient\(item\.name\)/);
  assert.match(shoppingAssistant, /detailByName\.get\(normalizeKoreanIngredient\(ingredient\)\)/);
  assert.doesNotMatch(workspace, /Math\.pow|\*\s*servings|includes\(["']소금/);
});
