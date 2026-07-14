import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mergeIngredientRecords } from "../lib/ingredient-sync.ts";
import { LOCAL_DB_STORES } from "../lib/local-db/schema.ts";
import { mergeShoppingItems } from "../lib/shopping-sync.ts";
import type { IngredientRecord, ShoppingItem } from "../types/index.ts";

function ingredient(overrides: Partial<IngredientRecord>): IngredientRecord {
  return {
    id: "ingredient-1",
    deviceId: "device-1",
    userId: null,
    name: "두부",
    category: "유제품",
    storageType: "냉장",
    quantity: null,
    expiryDate: null,
    barcode: null,
    imageUrl: null,
    memo: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function shoppingItem(overrides: Partial<ShoppingItem>): ShoppingItem {
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
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

test("local-first schema defines the requested durable stores", () => {
  assert.equal(LOCAL_DB_STORES.ingredients, "ingredients");
  assert.equal(LOCAL_DB_STORES.shoppingItems, "shopping_items");
  assert.equal(LOCAL_DB_STORES.favoriteRecipes, "favorite_recipes");
  assert.equal(LOCAL_DB_STORES.recipeCache, "recipe_cache");
  assert.equal(LOCAL_DB_STORES.fridgeEvents, "fridge_events");
  assert.equal(LOCAL_DB_STORES.pendingSyncQueue, "pending_sync_queue");
});

test("primary data hooks no longer use localStorage as their storage adapter", () => {
  const ingredientHook = readFileSync(new URL("../hooks/useIngredients.ts", import.meta.url), "utf8");
  const shoppingHook = readFileSync(new URL("../hooks/useShopping.ts", import.meta.url), "utf8");
  const favoritesHook = readFileSync(new URL("../hooks/useFavorites.ts", import.meta.url), "utf8");

  assert.doesNotMatch(ingredientHook, /localStorage/);
  assert.doesNotMatch(shoppingHook, /localStorage/);
  assert.doesNotMatch(favoritesHook, /localStorage/);
  assert.match(ingredientHook, /enqueuePendingSync/);
  assert.match(shoppingHook, /enqueuePendingSync/);
});

test("pending local ingredient updates beat newer remote rows until sync completes", () => {
  const local = ingredient({
    id: "shared",
    name: "로컬 양파",
    syncStatus: "pending_update",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  const remote = ingredient({
    id: "shared",
    name: "원격 양파",
    syncStatus: "synced",
    updatedAt: "2026-06-02T00:00:00.000Z",
  });

  const merged = mergeIngredientRecords([local], [remote]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.name, "로컬 양파");
});

test("pending local shopping updates beat newer remote rows until sync completes", () => {
  const local = shoppingItem({
    id: "shared",
    checked: true,
    syncStatus: "pending_update",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  const remote = shoppingItem({
    id: "shared",
    checked: false,
    syncStatus: "synced",
    updatedAt: "2026-06-02T00:00:00.000Z",
  });

  const merged = mergeShoppingItems([local], [remote]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.checked, true);
});

test("recipe hook uses the publication-gated API v1 without a stale local fallback", () => {
  const recipeHook = readFileSync(new URL("../hooks/useRecipes.ts", import.meta.url), "utf8");

  assert.match(recipeHook, /fetchRecipeListV1/);
  assert.match(recipeHook, /recipeApiV1CardToMatch/);
  assert.doesNotMatch(recipeHook, /rankRecipeRecommendations/);
  assert.doesNotMatch(recipeHook, /listCachedRecipePage|cacheRecipes|CURATED_RECIPE_RECORDS/);
});
