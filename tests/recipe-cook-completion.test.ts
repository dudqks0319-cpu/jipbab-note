import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildConsumedIngredientPayload,
  selectConsumableRecipeIngredients,
} from "../lib/recipe-ingredient-consumption.ts";
import type { IngredientRecord } from "../types/index.ts";

const ingredient: IngredientRecord = {
  id: "ingredient-1",
  deviceId: "device-1",
  userId: null,
  familyGroupId: null,
  name: "대파",
  category: "채소",
  storageType: "냉장",
  quantity: "1대",
  expiryDate: "2026-07-16",
  purchaseDate: "2026-07-12",
  openedAt: null,
  storageLocation: "채소칸",
  unitPrice: 1200,
  purchasePlace: "시장",
  consumedAt: null,
  discardedAt: null,
  repeatPurchase: true,
  barcode: null,
  imageUrl: null,
  memo: "먼저 사용",
  createdAt: "2026-07-12T00:00:00.000Z",
  updatedAt: "2026-07-12T00:00:00.000Z",
};

test("completion selects only active recipe-matched fridge ingredients", () => {
  const matched = selectConsumableRecipeIngredients([
    ingredient,
    { ...ingredient, id: "ingredient-2", name: "우유" },
    { ...ingredient, id: "ingredient-3", name: "계란", consumedAt: "2026-07-14T00:00:00.000Z" },
  ], ["파", "계란"]);

  assert.deepEqual(matched.map((item) => item.id), ["ingredient-1"]);
});

test("completion consumption preserves ingredient metadata and creates a reversible record payload", () => {
  const payload = buildConsumedIngredientPayload(
    ingredient,
    "계란볶음밥",
    "2026-07-14T03:00:00.000Z",
  );

  assert.equal(payload.name, "대파");
  assert.equal(payload.quantity, "1대");
  assert.equal(payload.consumedAt, "2026-07-14T03:00:00.000Z");
  assert.equal(payload.discardedAt, null);
  assert.equal(payload.memo, "먼저 사용 · 계란볶음밥 조리 후 소진");
});

test("completion UI uses explicit choices, consume events, and no modal/free-text input", () => {
  const completion = readFileSync("components/recipe/RecipeCookCompletion.tsx", "utf8");
  const hook = readFileSync("hooks/useIngredients.ts", "utf8");

  for (const contract of [
    "요리를 완성했어요",
    "실제 걸린 시간",
    "사용한 냉장고 재료 차감",
    "선택한 ${selectedIngredientIds.size}개 소진 처리",
    "냉장고에서 되돌릴 수 있어요",
    "aria-live=\"polite\"",
    "Promise.all",
  ]) {
    assert.ok(completion.includes(contract), `missing completion contract: ${contract}`);
  }
  assert.match(hook, /recordFridgeEvent\(deviceId, target\.userId, nextRecord\.id, "consume"/);
  assert.match(hook, /ingredientBelongsToScope/);
  assert.doesNotMatch(completion, /window\.confirm|<textarea|type=["']text["']/);
});
