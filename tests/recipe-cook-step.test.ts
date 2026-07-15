import assert from "node:assert/strict";
import test from "node:test";

import { resolveRecipeCookStepIngredients } from "../lib/recipe-cook-step.ts";

test("FE-011 resolves only exact step ingredient ids with selected serving quantities", () => {
  const result = resolveRecipeCookStepIngredients(
    {
      ingredientUsages: [
        { recipeIngredientId: "ingredient-egg", usageText: "  풀어서 넣어요.  " },
        { recipeIngredientId: "missing", usageText: "무시해야 해요." },
        { recipeIngredientId: "ingredient-egg", usageText: "중복이에요." },
        { recipeIngredientId: "ingredient-onion", usageText: null },
      ],
    },
    [
      { id: "ingredient-egg", name: "달걀", display: "4개" },
      { id: "ingredient-onion", name: "양파", display: "1/2개" },
    ],
  );

  assert.deepEqual(result, [
    { id: "ingredient-egg", name: "달걀", display: "4개", usageText: "풀어서 넣어요." },
    { id: "ingredient-onion", name: "양파", display: "1/2개", usageText: null },
  ]);
});

test("FE-011 does not infer step ingredients from names when ids are absent", () => {
  assert.deepEqual(
    resolveRecipeCookStepIngredients(
      { ingredientUsages: [{ recipeIngredientId: "달걀", usageText: null }] },
      [{ name: "달걀", display: "2개" }],
    ),
    [],
  );
});
