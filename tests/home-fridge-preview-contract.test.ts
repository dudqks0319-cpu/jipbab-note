import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHomeFridgePreviewCells,
  getHomeFridgeIngredientDisplayName,
  getHomeFridgePreviewWidth,
  HOME_FRIDGE_PREVIEW_COLUMNS,
  HOME_FRIDGE_PREVIEW_MAX_VISIBLE,
} from "../lib/home-fridge-preview.ts";

function ingredients(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `ingredient-${index + 1}`,
    name: `재료${index + 1}`,
  }));
}

test("home fridge preview keeps a fixed six-column layout", () => {
  assert.equal(HOME_FRIDGE_PREVIEW_COLUMNS, 6);
  assert.equal(HOME_FRIDGE_PREVIEW_MAX_VISIBLE, 12);
  assert.equal(getHomeFridgePreviewWidth(), 202);
});

test("home fridge preview keeps zero, six, seven and twelve ingredients without overflow", () => {
  for (const count of [0, 1, 6, 7, 12]) {
    const cells = buildHomeFridgePreviewCells(ingredients(count));
    assert.equal(cells.length, count);
    assert.equal(cells.some((cell) => cell.kind === "overflow"), false);
  }
});

test("home fridge preview reserves the final cell for the hidden count", () => {
  const cells = buildHomeFridgePreviewCells(ingredients(13));
  assert.equal(cells.length, 12);
  assert.equal(cells.filter((cell) => cell.kind === "ingredient").length, 11);
  assert.deepEqual(cells.at(-1), { kind: "overflow", count: 2 });

  const fifteenCells = buildHomeFridgePreviewCells(ingredients(15));
  assert.deepEqual(fifteenCells.at(-1), { kind: "overflow", count: 4 });
});

test("home fridge preview compacts long names and removes the frozen prefix", () => {
  assert.equal(getHomeFridgeIngredientDisplayName("냉동브로콜리"), "브로콜리");
  assert.equal(getHomeFridgeIngredientDisplayName("방울토마토"), "방울토…");
  assert.equal(getHomeFridgeIngredientDisplayName("계란"), "계란");
});
