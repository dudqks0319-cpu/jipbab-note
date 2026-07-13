import assert from "node:assert/strict";
import test from "node:test";

import {
  filterChildMealRecipes,
  matchesChildMealFilters,
  sortChildMealRecipes,
  type ChildMealFilterInput,
  type ChildMealFilterableRecipe,
} from "../lib/child-meals/filters.ts";

const baseInput: ChildMealFilterInput = {
  ageMonths: 28,
  excludedAllergenCodes: [],
  maxActiveTimeMinutes: 10,
  familySplitOnly: false,
  freezerFriendlyOnly: false,
  texturePreference: "soft_bite",
  mealTypes: [],
};

function recipe(overrides: Partial<ChildMealFilterableRecipe> = {}): ChildMealFilterableRecipe {
  return {
    minAgeMonths: 24,
    maxAgeMonths: 36,
    allergenCodes: [],
    activeTimeMinutes: 8,
    familySplitSupported: true,
    freezerFriendlyCandidate: false,
    textureLevel: "soft_bite",
    mealTypes: ["dinner"],
    ...overrides,
  };
}

test("child filters never relax age or excluded allergen rules", () => {
  assert.equal(matchesChildMealFilters(recipe(), baseInput), true);
  assert.equal(
    matchesChildMealFilters(recipe({ minAgeMonths: 30 }), baseInput),
    false,
  );
  assert.equal(
    matchesChildMealFilters(
      recipe({ allergenCodes: ["egg"] }),
      { ...baseInput, excludedAllergenCodes: ["egg"] },
    ),
    false,
  );
});

test("child filters apply time, family split, freezer, texture and meal type", () => {
  assert.equal(
    matchesChildMealFilters(recipe({ activeTimeMinutes: 12 }), baseInput),
    false,
  );
  assert.equal(
    matchesChildMealFilters(
      recipe({ familySplitSupported: false }),
      { ...baseInput, familySplitOnly: true },
    ),
    false,
  );
  assert.equal(
    matchesChildMealFilters(
      recipe({ freezerFriendlyCandidate: false }),
      { ...baseInput, freezerFriendlyOnly: true },
    ),
    false,
  );
  assert.equal(
    matchesChildMealFilters(
      recipe({ textureLevel: "family_cut" }),
      baseInput,
    ),
    false,
  );
  assert.equal(
    matchesChildMealFilters(
      recipe({ mealTypes: ["breakfast"] }),
      { ...baseInput, mealTypes: ["dinner"] },
    ),
    false,
  );
});

test("child filtering is non-mutating and sorting favors practical meals", () => {
  const recipes = [
    recipe({ activeTimeMinutes: 9, familySplitSupported: false }),
    recipe({ activeTimeMinutes: 10, familySplitSupported: true }),
    recipe({ activeTimeMinutes: 7, familySplitSupported: true, freezerFriendlyCandidate: true }),
  ];
  const original = recipes.slice();
  const filtered = filterChildMealRecipes(recipes, { ...baseInput, maxActiveTimeMinutes: 20 });
  const sorted = sortChildMealRecipes(filtered, {
    familySplitOnly: false,
    freezerFriendlyOnly: false,
  });

  assert.deepEqual(recipes, original);
  assert.equal(sorted[0]?.freezerFriendlyCandidate, true);
  assert.equal(sorted[1]?.familySplitSupported, true);
});
