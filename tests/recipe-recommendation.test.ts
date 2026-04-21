import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRecipeIngredientMatch,
  rankRecipeRecommendations,
} from "../lib/matching.ts";

test("calculateRecipeIngredientMatch keeps the existing match result shape", () => {
  const match = calculateRecipeIngredientMatch(["계란", "대파"], "계란 2개, 대파 1줄기, 간장 1큰술");

  assert.deepEqual(Object.keys(match).sort(), [
    "ingredientList",
    "matchRate",
    "matchedIngredients",
    "missingIngredients",
    "totalRecipeIngredients",
  ]);
  assert.equal(match.matchRate, 67);
  assert.deepEqual(match.matchedIngredients, ["계란", "파"]);
  assert.deepEqual(match.missingIngredients, ["간장"]);
});

test("ranking prefers recipes with fewer missing ingredients at the same match rate", () => {
  const ranked = rankRecipeRecommendations(
    [
      { id: "many-missing", ingredients: "두부, 파, 간장, 고추" },
      { id: "few-missing", ingredients: "두부, 간장" },
    ],
    [{ name: "두부" }, { name: "파" }],
  );

  assert.equal(ranked[0].recipe.id, "few-missing");
  assert.equal(ranked[0].match.matchRate, ranked[1].match.matchRate);
  assert.ok(ranked[0].score.total > ranked[1].score.total);
});

test("ranking uses more available ingredients when match quality is otherwise tied", () => {
  const ranked = rankRecipeRecommendations(
    [
      { id: "one-ingredient", ingredients: "계란" },
      { id: "three-ingredients", ingredients: "계란, 파, 간장" },
    ],
    [{ name: "계란" }, { name: "파" }, { name: "간장" }],
  );

  assert.equal(ranked[0].recipe.id, "three-ingredients");
  assert.equal(ranked[0].match.matchRate, 100);
  assert.equal(ranked[1].match.matchRate, 100);
});

test("ranking lifts recipes that use ingredients expiring soon", () => {
  const ranked = rankRecipeRecommendations(
    [
      { id: "fresh-later", ingredients: "두부, 파" },
      { id: "use-soon", ingredients: "계란, 파" },
    ],
    [
      { name: "두부", expiryDate: "2026-04-30" },
      { name: "계란", expiryDate: "2026-04-23" },
      { name: "파", expiryDate: "2026-05-01" },
    ],
    new Date("2026-04-22T00:00:00+09:00"),
  );

  assert.equal(ranked[0].recipe.id, "use-soon");
  assert.ok(ranked[0].score.freshnessUrgencyPoints > ranked[1].score.freshnessUrgencyPoints);
});

test("ranking ignores invalid expiry metadata instead of adding freshness urgency", () => {
  const ranked = rankRecipeRecommendations(
    [{ id: "invalid-expiry", ingredients: "계란" }],
    [{ name: "계란", expiryDate: "not-a-date" }],
    new Date("2026-04-22T00:00:00+09:00"),
  );

  assert.equal(ranked[0].score.freshnessUrgencyPoints, 0);
});
