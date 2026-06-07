import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIngredientPayloadFromShoppingItem,
  buildMergedIngredientPayloadFromShoppingItem,
  getStorageTypeForShoppingCategory,
  normalizeShoppingIngredientName,
} from "../lib/shopping-to-fridge.ts";
import type { IngredientRecord, ShoppingItem } from "../types/index.ts";

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "shopping-1",
    deviceId: "device-1",
    userId: null,
    name: "두부",
    quantity: "1모",
    category: "유제품",
    checked: true,
    sourceRecipeId: "recipe-1",
    sourceRecipeName: "두부조림",
    createdAt: "2026-05-19T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}

function ingredient(overrides: Partial<IngredientRecord> = {}): IngredientRecord {
  return {
    id: "ingredient-1",
    deviceId: "device-1",
    userId: null,
    name: "두부",
    category: "유제품",
    storageType: "냉장",
    quantity: "1모",
    expiryDate: "2026-05-25",
    purchaseDate: null,
    openedAt: null,
    storageLocation: null,
    unitPrice: null,
    purchasePlace: null,
    consumedAt: null,
    discardedAt: null,
    repeatPurchase: false,
    barcode: null,
    imageUrl: null,
    memo: "기존 메모",
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides,
  };
}

test("maps shopping categories to release-safe fridge storage types", () => {
  assert.equal(getStorageTypeForShoppingCategory("냉동식품"), "냉동");
  assert.equal(getStorageTypeForShoppingCategory("조미료"), "실온");
  assert.equal(getStorageTypeForShoppingCategory("곡물/면/빵"), "실온");
  assert.equal(getStorageTypeForShoppingCategory("채소"), "냉장");
});

test("builds a fridge payload from a purchased shopping item", () => {
  const payload = buildIngredientPayloadFromShoppingItem(shoppingItem(), {
    now: new Date("2026-05-19T08:00:00.000Z"),
  });

  assert.deepEqual(payload, {
    name: "두부",
    category: "유제품",
    storageType: "냉장",
    quantity: "1모",
    expiryDate: null,
    purchaseDate: "2026-05-19",
    memo: "두부조림 장보기에서 냉장고 반영",
  });
});

test("merges purchased shopping items into existing fridge ingredients", () => {
  const payload = buildMergedIngredientPayloadFromShoppingItem(
    ingredient(),
    shoppingItem({ quantity: "2모" }),
    { now: new Date("2026-05-19T08:00:00.000Z") },
  );

  assert.equal(payload.quantity, "1모 + 2모");
  assert.equal(payload.purchaseDate, "2026-05-19");
  assert.equal(payload.expiryDate, "2026-05-25");
  assert.match(payload.memo ?? "", /기존 메모/);
  assert.match(payload.memo ?? "", /두부조림 장보기에서 구매 후 합침/);
});

test("normalizes ingredient names before duplicate checks", () => {
  assert.equal(normalizeShoppingIngredientName(" 대 파 "), normalizeShoppingIngredientName("대파"));
  assert.equal(normalizeShoppingIngredientName("달걀"), normalizeShoppingIngredientName("계란"));
  assert.equal(normalizeShoppingIngredientName("고추가루"), normalizeShoppingIngredientName("고춧가루"));
});
