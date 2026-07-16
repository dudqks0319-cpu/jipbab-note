import assert from "node:assert/strict";
import test from "node:test";

import {
  STARTER_INGREDIENT_NAMES,
  STARTER_INGREDIENT_TEMPLATES,
  buildStarterIngredientPayloads,
} from "../lib/starter-ingredients.ts";
import { APPSTORE_DEMO_INGREDIENTS } from "../lib/demo-state.ts";

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

test("starter and demo ingredients use trustworthy food categories", () => {
  const starterCategories = new Map(
    STARTER_INGREDIENT_TEMPLATES.map((item) => [item.name, item.category]),
  );
  const demoCategories = new Map(
    APPSTORE_DEMO_INGREDIENTS.map((item) => [item.name, item.category]),
  );

  assert.equal(starterCategories.get("계란"), "육류");
  assert.equal(starterCategories.get("두부"), "통조림/가공식품");
  assert.equal(demoCategories.get("계란"), "육류");
  assert.equal(demoCategories.get("두부"), "통조림/가공식품");
});
