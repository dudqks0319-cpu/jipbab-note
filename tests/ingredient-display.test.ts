import assert from "node:assert/strict";
import test from "node:test";

import { getIngredientDisplayName } from "../lib/ingredient-display.ts";

test("normalizes common English ingredient names for fridge labels", () => {
  assert.equal(getIngredientDisplayName("egg"), "계란");
  assert.equal(getIngredientDisplayName("green onion"), "대파");
  assert.equal(getIngredientDisplayName("rice"), "밥");
  assert.equal(getIngredientDisplayName("strawberry"), "딸기");
});
