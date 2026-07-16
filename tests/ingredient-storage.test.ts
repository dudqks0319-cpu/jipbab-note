import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeIngredientStorageType,
  withNormalizedIngredientStorage,
} from "../lib/ingredient-storage.ts";
import type { IngredientRecord } from "../types/index.ts";

test("moves plain cooked rice out of freezer display", () => {
  assert.equal(normalizeIngredientStorageType("밥", "냉동"), "냉장");
  assert.equal(normalizeIngredientStorageType("rice", "냉동"), "냉장");
  assert.equal(normalizeIngredientStorageType("공기밥", "냉동"), "냉장");
});

test("keeps explicit frozen rice products in freezer", () => {
  assert.equal(normalizeIngredientStorageType("냉동볶음밥", "냉동"), "냉동");
  assert.equal(normalizeIngredientStorageType("냉동밥", "냉동"), "냉동");
});

test("normalizes ingredient record storage without mutating the original", () => {
  const ingredient: IngredientRecord = {
    id: "rice",
    deviceId: "device",
    userId: null,
    name: "밥",
    category: "곡물/면/빵",
    storageType: "냉동",
    quantity: "1공기",
    expiryDate: null,
    barcode: null,
    imageUrl: null,
    memo: null,
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  };

  const normalized = withNormalizedIngredientStorage(ingredient);

  assert.equal(ingredient.storageType, "냉동");
  assert.equal(normalized.storageType, "냉장");
});
