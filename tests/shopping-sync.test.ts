import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mergeShoppingItems } from "../lib/shopping-sync.ts";
import type { ShoppingItem } from "../types/index.ts";

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "shopping-1",
    deviceId: "device-1",
    userId: null,
    name: "두부",
    quantity: "1모",
    category: "유제품",
    checked: false,
    sourceRecipeId: null,
    sourceRecipeName: null,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides,
  };
}

test("keeps local-only shopping items when remote query returns no rows", () => {
  const merged = mergeShoppingItems(
    [shoppingItem({ id: "local-1", name: "계란" })],
    [],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.name, "계란");
});

test("prefers the newer remote shopping item for the same id", () => {
  const merged = mergeShoppingItems(
    [shoppingItem({ id: "shared", checked: false, updatedAt: "2026-05-18T00:00:00.000Z" })],
    [shoppingItem({ id: "shared", checked: true, updatedAt: "2026-05-19T00:00:00.000Z" })],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.checked, true);
});

test("sorts merged shopping items by newest update first", () => {
  const merged = mergeShoppingItems(
    [shoppingItem({ id: "old", name: "양파", updatedAt: "2026-05-18T00:00:00.000Z" })],
    [shoppingItem({ id: "new", name: "대파", updatedAt: "2026-05-19T00:00:00.000Z" })],
  );

  assert.deepEqual(merged.map((item) => item.id), ["new", "old"]);
});

test("shopping page exposes direct add, quick chips, duplicate merge, and fridge options", () => {
  const pageSource = readFileSync(new URL("../app/shopping/page.tsx", import.meta.url), "utf8");
  const hookSource = readFileSync(new URL("../hooks/useShopping.ts", import.meta.url), "utf8");

  assert.match(pageSource, /\+ 직접 추가/);
  assert.match(pageSource, /QUICK_SHOPPING_CHIPS/);
  assert.match(pageSource, /이미 장보기 목록에 있어요/);
  assert.match(pageSource, /INGREDIENT_STORAGE_TYPES/);
  assert.match(pageSource, /EXPIRY_PRESETS/);
  assert.match(hookSource, /mergeDuplicates/);
  assert.match(hookSource, /mergeQuantityDisplay/);
});

test("recipe shopping assistant supports scoped and selective missing ingredient adds", () => {
  const assistantSource = readFileSync(new URL("../components/recipe/RecipeShoppingAssistant.tsx", import.meta.url), "utf8");
  const shoppingPageSource = readFileSync(new URL("../app/shopping/page.tsx", import.meta.url), "utf8");

  assert.match(assistantSource, /useFamilyShare/);
  assert.match(assistantSource, /selectedMissingNames/);
  assert.match(assistantSource, /requiredIngredientNames/);
  assert.match(assistantSource, /required !== false/);
  assert.match(assistantSource, /scope: activeScope/);
  assert.match(assistantSource, /familyGroupId/);
  assert.match(assistantSource, /가족 장보기/);
  assert.match(assistantSource, /이미 담긴 항목/);
  assert.match(assistantSource, /필수 부족 재료/);
  assert.match(assistantSource, /대체:/);
  assert.match(shoppingPageSource, /useFamilyShare/);
  assert.match(shoppingPageSource, /내 장보기/);
  assert.match(shoppingPageSource, /가족 장보기/);
  assert.match(shoppingPageSource, /scope: activeScope/);
});
