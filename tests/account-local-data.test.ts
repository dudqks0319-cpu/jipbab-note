import assert from "node:assert/strict";
import test from "node:test";

import { clearAccountLinkedLocalData } from "../lib/account-local-data.ts";
import type { LocalDbStoreName } from "../lib/local-db/schema.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
  has(key: string) { return this.values.has(key); }
}

test("account deletion clears user-created local data without deleting device or public cache markers", async () => {
  const storage = new MemoryStorage();
  for (const key of [
    "jipbab-note-family-group",
    "jipbab-note-imported-recipes",
    "jipbab:meal-plan:v1:2026-07-13",
    "jipbab:recipe-cook-progress:v1:recipe-1",
    "jipbab-note-device-id",
    "jipbab:analytics-consent",
  ]) storage.setItem(key, "value");
  const stores: LocalDbStoreName[] = [];

  const result = await clearAccountLinkedLocalData({
    storage,
    clearStore: async (store) => { stores.push(store); },
  });

  assert.equal(result.removedStorageKeys, 4);
  assert.equal(result.clearedStores, 5);
  assert.equal(storage.has("jipbab-note-family-group"), false);
  assert.equal(storage.has("jipbab:meal-plan:v1:2026-07-13"), false);
  assert.equal(storage.has("jipbab-note-device-id"), true);
  assert.equal(storage.has("jipbab:analytics-consent"), true);
  assert.equal(stores.includes("recipe_cache"), false);
});
