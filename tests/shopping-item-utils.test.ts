import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMergedShoppingItemFields,
  getShoppingIngredientIdentity,
  mergeShoppingQuantityDisplay,
} from "../lib/shopping-item-utils.ts";
import type { ShoppingItem, ShoppingItemDraft } from "../types/index.ts";

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "shopping-1",
    deviceId: "device-1",
    userId: null,
    name: "계란",
    quantity: "10개",
    category: "유제품",
    checked: true,
    sourceRecipeId: "recipe-old",
    sourceRecipeName: "이전 레시피",
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

test("FE-010 treats exact catalog aliases as one shopping ingredient", () => {
  assert.equal(getShoppingIngredientIdentity("계란"), getShoppingIngredientIdentity("달걀"));
  assert.equal(getShoppingIngredientIdentity("대파"), getShoppingIngredientIdentity("파"));
});

test("FE-010 does not merge different catalog ingredients or substring names", () => {
  assert.notEqual(getShoppingIngredientIdentity("국간장"), getShoppingIngredientIdentity("진간장"));
  assert.notEqual(getShoppingIngredientIdentity("양파"), getShoppingIngredientIdentity("대파"));
  assert.notEqual(getShoppingIngredientIdentity("김"), getShoppingIngredientIdentity("김치"));
});

test("FE-010 falls back to an exact normalized identity for uncatalogued names", () => {
  assert.equal(getShoppingIngredientIdentity("  새 재료  "), getShoppingIngredientIdentity("새재료"));
  assert.notEqual(getShoppingIngredientIdentity("새 재료"), getShoppingIngredientIdentity("새 재료 가루"));
});

test("FE-010 sums compatible quantities and preserves incompatible displays", () => {
  assert.equal(mergeShoppingQuantityDisplay("10개", "2개"), "12개");
  assert.equal(mergeShoppingQuantityDisplay("0.5kg", "0.25kg"), "0.75kg");
  assert.equal(mergeShoppingQuantityDisplay("1/4작은술", "1/4작은술"), "0.5작은술");
  assert.equal(mergeShoppingQuantityDisplay("1팩", "200g"), "1팩 + 200g");
  assert.equal(mergeShoppingQuantityDisplay("12개 묶음", "2개"), "12개 묶음 + 2개");
  assert.equal(mergeShoppingQuantityDisplay(null, "2개"), "2개");
});

test("FE-010 reopens a purchased duplicate and keeps distinct recipe sources", () => {
  const draft: ShoppingItemDraft = {
    name: "달걀",
    quantity: "2개",
    category: "유제품",
    sourceRecipeId: "recipe-new",
    sourceRecipeName: "양파 달걀덮밥",
  };

  assert.deepEqual(buildMergedShoppingItemFields(shoppingItem(), draft), {
    quantity: "12개",
    category: "유제품",
    checked: false,
    sourceRecipeId: "recipe-old · recipe-new",
    sourceRecipeName: "이전 레시피 · 양파 달걀덮밥",
  });
});
