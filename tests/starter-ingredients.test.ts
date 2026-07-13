import assert from "node:assert/strict";
import test from "node:test";

import {
  STARTER_INGREDIENT_NAMES,
  buildStarterIngredientPayloads,
} from "../lib/starter-ingredients.ts";

test("starter ingredient names include natural empty-fridge choices", () => {
  assert.deepEqual(STARTER_INGREDIENT_NAMES, [
    "계란",
    "두부",
    "대파",
    "김치",
    "양파",
    "밥",
    "감자",
    "참치캔",
  ]);
});

test("starter payload builder keeps existing all-ingredient behavior", () => {
  const payloads = buildStarterIngredientPayloads(["계란", "두부"]);

  assert.equal(payloads.length, 6);
  assert.deepEqual(
    payloads.map((payload) => payload.name),
    ["대파", "김치", "양파", "밥", "감자", "참치캔"],
  );
});

test("starter payload builder can add only user-selected ingredients", () => {
  const payloads = buildStarterIngredientPayloads(["계란"], ["계란", "두부", "참치캔"]);

  assert.deepEqual(
    payloads.map((payload) => payload.name),
    ["두부", "참치캔"],
  );
});

test("starter egg and tofu use accurate non-dairy categories", () => {
  const payloads = buildStarterIngredientPayloads([], ["계란", "두부"]);

  assert.deepEqual(
    payloads.map(({ name, category }) => ({ name, category })),
    [
      { name: "계란", category: "계란·난류" },
      { name: "두부", category: "콩·두부" },
    ],
  );
});
