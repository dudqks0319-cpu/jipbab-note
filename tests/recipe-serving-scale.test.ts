import assert from "node:assert/strict";
import test from "node:test";

import { scaleIngredientDisplay } from "../lib/recipe-serving-scale.ts";

test("linear ingredients scale with requested servings", () => {
  assert.equal(scaleIngredientDisplay("200g", 2, 4, "linear"), "400g");
});

test("fixed and to-taste ingredients keep their reviewed display", () => {
  assert.equal(scaleIngredientDisplay("1큰술", 2, 4, "fixed"), "1큰술");
  assert.equal(scaleIngredientDisplay("약간", 2, 4, "to_taste"), "약간");
});
