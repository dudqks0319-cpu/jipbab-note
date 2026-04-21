import assert from "node:assert/strict";
import test from "node:test";

import { mergeIngredientRecords } from "../lib/ingredient-sync.ts";
import type { IngredientRecord } from "../types/index.ts";

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
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-04-20T00:00:00.000Z",
    ...overrides,
  };
}

test("keeps local ingredients when Supabase returns an empty list", () => {
  const local = [
    ingredient({
      id: "local-only",
      name: "감자",
      updatedAt: "2026-04-21T00:00:00.000Z",
    }),
  ];

  const merged = mergeIngredientRecords(local, []);

  assert.deepEqual(merged, local);
});

test("prefers the newest ingredient per id using updatedAt", () => {
  const local = ingredient({
    id: "shared",
    name: "로컬 양파",
    updatedAt: "2026-04-21T00:00:00.000Z",
  });
  const remote = ingredient({
    id: "shared",
    name: "원격 양파",
    updatedAt: "2026-04-22T00:00:00.000Z",
  });

  const merged = mergeIngredientRecords([local], [remote]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.name, "원격 양파");
});

test("sorts merged ingredients by newest updatedAt first", () => {
  const oldRemote = ingredient({
    id: "remote-old",
    name: "당근",
    updatedAt: "2026-04-20T00:00:00.000Z",
  });
  const newLocal = ingredient({
    id: "local-new",
    name: "대파",
    updatedAt: "2026-04-22T00:00:00.000Z",
  });

  const merged = mergeIngredientRecords([newLocal], [oldRemote]);

  assert.deepEqual(
    merged.map((item) => item.id),
    ["local-new", "remote-old"],
  );
});
