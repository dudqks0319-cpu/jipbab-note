import assert from "node:assert/strict";
import test from "node:test";

import {
  getIngredientCatalog,
  getIngredientCatalogByCategory,
  searchIngredientCatalog,
} from "../lib/ingredient-catalog.ts";
import { getIngredientPhotoUrl } from "../lib/utils.ts";

test("returns many curated items for frozen foods", () => {
  const items = getIngredientCatalogByCategory("냉동식품");

  assert.ok(items.length >= 12);
  assert.ok(items.some((item) => item.name === "냉동만두"));
  assert.ok(items.some((item) => item.name === "냉동새우"));
});

test("ingredient catalog has broad first-batch competitive coverage", () => {
  const items = getIngredientCatalog();

  assert.ok(items.length >= 160);
  assert.ok(items.some((item) => item.name === "고추" && item.aliases?.includes("청양고추")));
  assert.ok(items.some((item) => item.name === "맛술" && item.aliases?.includes("미림")));
  assert.ok(items.some((item) => item.name === "당면"));
  assert.ok(items.some((item) => item.name === "토마토캔"));
});

test("search matches aliases as well as direct names", () => {
  const items = searchIngredientCatalog({
    category: "조미료",
    query: "간장",
    limit: 20,
  });

  assert.ok(items.some((item) => item.name === "진간장"));
  assert.ok(items.some((item) => item.name === "국간장"));
});

test("search can find a direct-input escape hatch candidate by keyword miss", () => {
  const items = searchIngredientCatalog({
    category: "채소",
    query: "방울",
    limit: 20,
  });

  assert.ok(items.some((item) => item.name === "방울토마토"));
});

test("ingredient photos avoid misleading generic fallbacks for common confusing items", () => {
  assert.equal(getIngredientPhotoUrl("닭고기", "육류"), "/images/ingredients/chicken-raw-photo.png");
  assert.equal(getIngredientPhotoUrl("참치", "수산물"), "/images/ingredients/tuna-raw-photo.png");
  assert.equal(getIngredientPhotoUrl("문어", "수산물"), "/images/ingredients/octopus-photo.png");
  assert.equal(getIngredientPhotoUrl("냉동야채믹스", "냉동식품"), "/images/ingredients/frozen-vegetable-mix-photo.png");
  assert.equal(getIngredientPhotoUrl("들기름", "조미료"), "/images/ingredients/perilla-oil-photo.png");
  assert.equal(getIngredientPhotoUrl("쌈장", "조미료"), "/images/ingredients/ssamjang-photo.png");
});
