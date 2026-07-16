import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  RECIPE_ALLERGEN_OPTIONS,
  isRecipeAllergenId,
  parseRecipeAllergenIds,
} from "../lib/recipe-allergens.ts";
import {
  recipePassesAllergenHardFilter,
  type RecipeIngredientAllergenLinkRow,
  type RecipeIngredientAllergenProfileRow,
} from "../lib/recipe-api-v1-repository.ts";

const migration = readFileSync(
  "supabase/migrations/20260717090000_add_structured_allergen_safety.sql",
  "utf8",
);
const rollback = readFileSync(
  "supabase/rollbacks/20260717090000_add_structured_allergen_safety.sql",
  "utf8",
);
const schema = readFileSync("supabase/schema.sql", "utf8");
const settingsHook = readFileSync("hooks/useAppSettings.ts", "utf8");
const recipeHook = readFileSync("hooks/useRecipes.ts", "utf8");
const listRoute = readFileSync("app/api/v1/recipes/route.ts", "utf8");

test("structured allergen IDs follow the official Korean display categories", () => {
  assert.equal(RECIPE_ALLERGEN_OPTIONS.length, 19);
  assert.equal(isRecipeAllergenId("eggs"), true);
  assert.equal(isRecipeAllergenId("shellfish"), true);
  assert.equal(isRecipeAllergenId("unknown"), false);
  assert.deepEqual(parseRecipeAllergenIds(["EGGS", "soy", "eggs"]), ["eggs", "soy"]);
  assert.throws(() => parseRecipeAllergenIds(["eggs", "unknown"]), /invalid_allergen_id/);
});

test("structured allergen settings reach the server-side recipe hard filter", () => {
  assert.match(settingsHook, /allergenIds: RecipeAllergenId\[\]/);
  assert.match(recipeHook, /excludedAllergenIds/);
  assert.match(listRoute, /parseRecipeAllergenIds/);
  assert.match(listRoute, /excludedAllergenIds/);
});

test("allergen hard filter excludes matching and unreviewed recipe ingredients", () => {
  const profiles: RecipeIngredientAllergenProfileRow[] = [
    { ingredient_id: "dairy-egg", review_status: "approved" },
    { ingredient_id: "veg-onion", review_status: "approved" },
    { ingredient_id: "processed-fishcake", review_status: "unreviewed" },
  ];
  const links: RecipeIngredientAllergenLinkRow[] = [
    { ingredient_id: "dairy-egg", allergen_group_id: "eggs", presence_type: "contains" },
  ];

  assert.equal(
    recipePassesAllergenHardFilter(["dairy-egg", "veg-onion"], ["eggs"], profiles, links),
    false,
  );
  assert.equal(
    recipePassesAllergenHardFilter(["processed-fishcake"], ["eggs"], profiles, links),
    false,
  );
  assert.equal(
    recipePassesAllergenHardFilter(["veg-onion"], ["eggs"], profiles, links),
    true,
  );
  assert.equal(
    recipePassesAllergenHardFilter(["dairy-egg"], [], [], []),
    true,
  );
});

test("allergen migration keeps app roles read-only and starts catalog profiles unreviewed", () => {
  for (const tableName of [
    "allergen_groups",
    "ingredient_allergen_profiles",
    "ingredient_allergen_links",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${tableName}`));
  }
  assert.match(migration, /review_status text not null default 'unreviewed'/);
  assert.match(migration, /select id, 'unreviewed'/);
  assert.match(migration, /revoke all on table public\.ingredient_allergen_profiles from anon, authenticated/);
  assert.match(migration, /revoke all on table public\.ingredient_allergen_links from anon, authenticated/);
  assert.match(schema, /create table if not exists public\.ingredient_allergen_profiles/);
  assert.doesNotMatch(rollback, /drop table|truncate|delete from/i);
});
