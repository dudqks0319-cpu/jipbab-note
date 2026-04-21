import assert from "node:assert/strict";
import test from "node:test";

import {
  getIngredientCatalogByCategory,
  searchIngredientCatalog,
} from "../lib/ingredient-catalog.ts";

test("returns many curated items for frozen foods", () => {
  const items = getIngredientCatalogByCategory("냉동식품");

  assert.ok(items.length >= 12);
  assert.ok(items.some((item) => item.name === "냉동만두"));
  assert.ok(items.some((item) => item.name === "냉동새우"));
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
