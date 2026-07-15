import assert from "node:assert/strict";
import test from "node:test";

import { matchRecipeIngredientsToInventory } from "../lib/recipe-ingredient-match-status.ts";
import type { RecipeIngredientDetail } from "../types/index.ts";

function ingredient(
  overrides: Partial<RecipeIngredientDetail> = {},
): RecipeIngredientDetail {
  return {
    id: "recipe-ingredient-1",
    ingredientId: "veg-onion",
    name: "양파",
    display: "1/2개",
    required: true,
    substitutions: [],
    ...overrides,
  };
}

test("FE-009 distinguishes canonical exact names from catalog aliases", () => {
  const exact = matchRecipeIngredientsToInventory(
    [ingredient({ ingredientId: "dairy-egg", name: "계란" })],
    [{ name: "계란" }],
  );
  const alias = matchRecipeIngredientsToInventory(
    [ingredient({ ingredientId: "dairy-egg", name: "계란" })],
    [{ name: "달걀" }],
  );

  assert.equal(exact[0]?.status, "exact");
  assert.equal(exact[0]?.inventoryName, "계란");
  assert.equal(alias[0]?.status, "alias");
  assert.equal(alias[0]?.inventoryName, "달걀");
});

test("FE-009 marks only an editor-reviewed ingredient ID as a substitute", () => {
  const recipeIngredient = ingredient({
    substitutions: [
      {
        ingredientId: "veg-green-onion",
        name: "대파",
        ratio: "같은 부피",
        caution: "향이 더 강해요.",
      },
    ],
  });

  const [match] = matchRecipeIngredientsToInventory(
    [recipeIngredient],
    [{ name: "대파" }],
  );

  assert.equal(match?.status, "substitute");
  assert.equal(match?.inventoryName, "대파");
  assert.deepEqual(match?.substitution, recipeIngredient.substitutions?.[0]);
});

test("FE-009 prefers the required ingredient over a substitute when both exist", () => {
  const [match] = matchRecipeIngredientsToInventory(
    [
      ingredient({
        substitutions: [
          {
            ingredientId: "veg-green-onion",
            name: "대파",
            ratio: "같은 부피",
            caution: "향이 더 강해요.",
          },
        ],
      }),
    ],
    [{ name: "대파" }, { name: "양파" }],
  );

  assert.equal(match?.status, "exact");
  assert.equal(match?.inventoryName, "양파");
  assert.equal(match?.substitution, null);
});

test("FE-009 never promotes substring lookalikes without a reviewed relationship", () => {
  const cases = [
    [ingredient({ ingredientId: "veg-onion", name: "양파" }), "파"],
    [ingredient({ ingredientId: "veg-chili-pepper", name: "고추" }), "고추장"],
    [ingredient({ ingredientId: "dairy-milk", name: "우유" }), "두유"],
    [ingredient({ ingredientId: "meat-beef", name: "소고기" }), "돼지고기"],
  ] as const;

  for (const [recipeIngredient, inventoryName] of cases) {
    const [match] = matchRecipeIngredientsToInventory(
      [recipeIngredient],
      [{ name: inventoryName }],
    );
    assert.equal(match?.status, "missing", `${inventoryName} should not match ${recipeIngredient.name}`);
  }
});

test("FE-009 keeps an ingredient outside the local catalog in an unknown state", () => {
  const [match] = matchRecipeIngredientsToInventory(
    [ingredient({ ingredientId: "sea-laver", name: "김" })],
    [{ name: "김치" }],
  );

  assert.equal(match?.status, "unknown");
  assert.equal(match?.inventoryName, null);
});
