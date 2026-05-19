import assert from "node:assert/strict";
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
