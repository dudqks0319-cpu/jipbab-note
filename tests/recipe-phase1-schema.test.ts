import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getIngredientCatalog } from "../lib/ingredient-catalog.ts";
import {
  CANONICAL_RECIPE_CATEGORIES,
  resolveLegacyRecipeCategory,
} from "../lib/recipe-category-taxonomy.ts";

const migration = readFileSync(
  "supabase/migrations/20260710150000_add_recipe_v2_schema_and_versioning.sql",
  "utf8",
);
const seedMigration = readFileSync(
  "supabase/migrations/20260710151000_seed_phase1_ingredient_catalog.sql",
  "utf8",
);
const reclassificationMigration = readFileSync(
  "supabase/migrations/20260711170000_reclassify_egg_tofu_catalog.sql",
  "utf8",
);
const rollback = readFileSync(
  "supabase/rollbacks/20260710150000_add_recipe_v2_schema_and_versioning.sql",
  "utf8",
);
const seedRollback = readFileSync(
  "supabase/rollbacks/20260710151000_seed_phase1_ingredient_catalog.sql",
  "utf8",
);
const schema = readFileSync("supabase/schema.sql", "utf8");
const catalogCsv = readFileSync("docs/phase-1-ingredient-catalog.csv", "utf8");

const normalizeAlias = (value: string) => value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "");

test("Phase 1 migration defines the normalized recipe contract", () => {
  for (const tableName of [
    "recipe_categories",
    "ingredients_catalog",
    "ingredient_aliases",
    "recipe_ingredients",
    "recipe_ingredient_substitutions",
    "recipe_steps",
    "recipe_step_ingredients",
    "recipe_reviews",
    "recipe_versions",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${tableName}`));
  }

  assert.match(migration, /add column if not exists schema_version smallint not null default 1/);
  assert.match(migration, /add column if not exists version integer not null default 1/);
  assert.match(migration, /foreign key \(recipe_step_id, recipe_id\)/);
  assert.match(migration, /foreign key \(recipe_ingredient_id, recipe_id\)/);
  assert.match(migration, /recipe_steps_duration_valid/);
  assert.match(migration, /recipe_reviews_type_allowed/);
});

test("recipe version capture and restore are complete and service-role only", () => {
  assert.match(migration, /create or replace function app\.build_recipe_v2_snapshot/);
  assert.match(migration, /create or replace function public\.capture_recipe_version/);
  assert.match(migration, /create or replace function public\.restore_recipe_version/);
  assert.match(migration, /recipe_version_conflict/);
  assert.match(migration, /current_version_already_archived/);

  for (const snapshotKey of [
    "recipe_ingredients",
    "ingredient_substitutions",
    "recipe_steps",
    "step_ingredients",
  ]) {
    assert.match(migration, new RegExp(`'${snapshotKey}'`));
  }

  assert.match(migration, /set search_path = pg_catalog, public, app/);
  assert.match(migration, /auth\.role\(\)\) <> 'service_role'/);
  assert.match(migration, /grant execute on function public\.capture_recipe_version[\s\S]*to service_role/);
  assert.match(migration, /grant execute on function public\.restore_recipe_version[\s\S]*to service_role/);
  assert.match(migration, /revoke all on function public\.capture_recipe_version[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.restore_recipe_version[\s\S]*from public, anon, authenticated/);
});

test("Phase 1 rollback disables mutation without destroying normalized evidence", () => {
  assert.match(rollback, /drop function if exists public\.restore_recipe_version/);
  assert.match(rollback, /drop function if exists public\.capture_recipe_version/);
  assert.match(rollback, /set schema_version = 1/);
  assert.doesNotMatch(rollback, /drop table|drop column|truncate/i);
  assert.doesNotMatch(seedRollback, /delete from|drop table|truncate/i);
});

test("legacy categories map only when the dish type is deterministic", () => {
  assert.equal(CANONICAL_RECIPE_CATEGORIES.length, 15);
  assert.deepEqual(resolveLegacyRecipeCategory("밥"), {
    status: "mapped",
    source: "밥",
    categoryId: "rice",
  });
  assert.equal(resolveLegacyRecipeCategory("국&찌개").status, "unresolved");
  assert.equal(resolveLegacyRecipeCategory("한식").status, "unresolved");
  assert.equal(resolveLegacyRecipeCategory("전자레인지/노불").status, "unresolved");
  assert.equal(resolveLegacyRecipeCategory("").status, "missing");
});

test("ingredient aliases are globally unambiguous and exact", () => {
  const aliases = new Map<string, string>();
  for (const item of getIngredientCatalog()) {
    for (const alias of [item.name, ...(item.aliases ?? [])]) {
      const normalized = normalizeAlias(alias);
      const existing = aliases.get(normalized);
      assert.ok(!existing || existing === item.id, `${alias} maps to both ${existing} and ${item.id}`);
      aliases.set(normalized, item.id);
    }
  }

  assert.equal(aliases.get("파"), "veg-green-onion");
  assert.equal(aliases.get("양파"), "veg-onion");
  assert.notEqual(aliases.get("파"), aliases.get("양파"));
  assert.equal(aliases.get("불고기용소고기"), "meat-beef-bulgogi");
});

test("generated catalog seed and canonical schema match the app-owned source", () => {
  const catalog = getIngredientCatalog();
  const expectedAliasCount = catalog.reduce((count, item) => count + 1 + (item.aliases?.length ?? 0), 0);
  const generatedAliasCount = [...seedMigration.matchAll(/'(?:canonical|synonym)', 'ko-KR'\)/g)].length;

  assert.equal(catalog.length, 173);
  assert.equal(catalogCsv.trim().split("\n").length, catalog.length + 1);
  assert.equal(generatedAliasCount, expectedAliasCount);
  assert.match(seedMigration, /on conflict \(locale, normalized_alias\) do update/);
  assert.ok(schema.includes(migration.trim()));
  assert.ok(schema.includes(seedMigration.trim()));
  assert.ok(schema.includes(reclassificationMigration.trim()));
});

test("Phase 1 relational tables are not exposed directly to app roles", () => {
  for (const tableName of [
    "ingredients_catalog",
    "ingredient_aliases",
    "recipe_ingredients",
    "recipe_ingredient_substitutions",
    "recipe_steps",
    "recipe_step_ingredients",
    "recipe_reviews",
    "recipe_versions",
  ]) {
    assert.match(migration, new RegExp(`revoke all on table public\\.${tableName} from anon, authenticated`));
  }
  assert.match(migration, /recipe_categories_select_public/);
  assert.match(migration, /using \(active is true\)/);
});
