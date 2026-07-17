import assert from "node:assert/strict";
import test from "node:test";

import { prioritizeRecipeDiversity } from "../lib/recent-recipes.ts";

test("recently cooked recipes are moved behind equally suitable alternatives", () => {
  const ranked = [
    { recipe: { id: "recent", category: "국·탕" }, score: { total: 100 } },
    { recipe: { id: "fresh", category: "반찬" }, score: { total: 90 } },
  ];
  const result = prioritizeRecipeDiversity(ranked, [
    { recipeId: "recent", category: "국·탕", cookedAt: "2026-07-16T00:00:00.000Z" },
  ], new Date("2026-07-17T00:00:00.000Z"));
  assert.equal(result[0].recipe.id, "fresh");
});

test("old history no longer changes recommendation order", () => {
  const ranked = [
    { recipe: { id: "best", category: "국·탕" }, score: { total: 100 } },
    { recipe: { id: "other", category: "반찬" }, score: { total: 90 } },
  ];
  const result = prioritizeRecipeDiversity(ranked, [
    { recipeId: "best", category: "국·탕", cookedAt: "2026-06-01T00:00:00.000Z" },
  ], new Date("2026-07-17T00:00:00.000Z"));
  assert.equal(result[0].recipe.id, "best");
});
