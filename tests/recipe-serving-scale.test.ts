import assert from "node:assert/strict";
import test from "node:test";

import { scaleIngredientDisplay } from "../lib/recipe-serving-scale.ts";

test("ingredient quantities scale with servings while units remain readable", () => {
  assert.equal(scaleIngredientDisplay("2개", 2, 4), "4개");
  assert.equal(scaleIngredientDisplay("1.5큰술", 2, 4), "3큰술");
  assert.equal(scaleIngredientDisplay("1/2작은술", 2, 4), "1작은술");
});

test("non-numeric quantities remain unchanged", () => {
  assert.equal(scaleIngredientDisplay("약간", 2, 4), "약간");
  assert.equal(scaleIngredientDisplay("기호에 따라", 2, 1), "기호에 따라");
});

test("invalid serving counts fail safely without changing the quantity", () => {
  assert.equal(scaleIngredientDisplay("2개", 0, 4), "2개");
  assert.equal(scaleIngredientDisplay("2개", 2, 0), "2개");
});
