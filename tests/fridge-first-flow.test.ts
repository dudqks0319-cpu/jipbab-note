import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { calculateRecipeIngredientMatch } from "../lib/matching.ts";
import { getCoupangSearchKeyword, resolvePartnerLink } from "../lib/partner-links.ts";
import {
  buildIngredientPayloadFromShoppingItem,
  normalizeShoppingIngredientName,
} from "../lib/shopping-to-fridge.ts";
import type { ShoppingItem } from "../types/index.ts";

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "shopping-1",
    deviceId: "device-1",
    userId: null,
    name: "애호박",
    quantity: "1개",
    category: "채소",
    checked: true,
    sourceRecipeId: "recipe-doenjang",
    sourceRecipeName: "된장찌개",
    createdAt: "2026-05-31T00:00:00.000Z",
    updatedAt: "2026-05-31T00:00:00.000Z",
    ...overrides,
  };
}

test("fridge-first flow matches aliases from inventory to recipe needs", () => {
  const match = calculateRecipeIngredientMatch(
    ["달걀", "두부", "대파"],
    "계란, 두부, 파, 애호박",
  );

  assert.deepEqual(match.matchedIngredients, ["계란", "두부", "대파"]);
  assert.deepEqual(match.missingIngredients, ["애호박"]);
});

test("shopping missing item can return to fridge with source context", () => {
  const item = shoppingItem();
  const payload = buildIngredientPayloadFromShoppingItem(item, {
    now: new Date("2026-05-31T08:00:00.000Z"),
  });

  assert.equal(payload.name, "애호박");
  assert.equal(payload.storageType, "냉장");
  assert.equal(payload.memo, "된장찌개 장보기에서 냉장고 반영");
  assert.equal(normalizeShoppingIngredientName("고추가루"), normalizeShoppingIngredientName("고춧가루"));
});

test("Coupang fallback links use refined keywords for missing ingredients", () => {
  assert.equal(getCoupangSearchKeyword("두부"), "찌개용 두부");

  const result = resolvePartnerLink(
    {
      name: "두부",
      category: "유제품",
    },
    {
      itemLinks: {},
      categoryLinks: {},
    },
  );

  assert.equal(result.kind, "search");
  assert.match(result.href, /%EC%B0%8C%EA%B0%9C%EC%9A%A9%20%EB%91%90%EB%B6%80/);
});

test("fridge and shopping screens keep the fridge-first UX hooks", () => {
  const fridgeComponent = readFileSync(
    new URL("../components/fridge/FridgeIllustration.tsx", import.meta.url),
    "utf8",
  );
  const fridgePage = readFileSync(new URL("../app/fridge/page.tsx", import.meta.url), "utf8");
  const shoppingPage = readFileSync(new URL("../app/shopping/page.tsx", import.meta.url), "utf8");

  assert.match(fridgeComponent, /냉장실/);
  assert.match(fridgeComponent, /냉동실/);
  assert.match(fridgeComponent, /실온칸/);
  assert.match(fridgeComponent, /hiddenCount/);
  assert.match(fridgePage, /highlightedIngredientId/);
  assert.match(fridgePage, /source !== 'local'/);
  assert.match(fridgePage, /냉장고 보기/);
  assert.match(fridgePage, /리스트 보기/);
  assert.match(shoppingPage, /sourceRecipeName\} 부족 재료/);
  assert.match(shoppingPage, /sponsored noopener noreferrer/);
  assert.match(shoppingPage, /buildFridgePrefillHref/);
});
