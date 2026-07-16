import { writeFileSync } from "node:fs";
import path from "node:path";

import { getIngredientCatalog } from "../lib/ingredient-catalog.ts";

const cwd = process.cwd();
const migrationPath = path.join(
  cwd,
  "supabase/migrations/20260710151000_seed_phase1_ingredient_catalog.sql",
);
const rollbackPath = path.join(
  cwd,
  "supabase/rollbacks/20260710151000_seed_phase1_ingredient_catalog.sql",
);
const csvPath = path.join(cwd, "docs/phase-1-ingredient-catalog.csv");

function normalizeAlias(value) {
  return value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "");
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return "null";
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const catalog = getIngredientCatalog();
const ids = new Set();
const canonicalNames = new Set();
const aliasesByNormalizedValue = new Map();

for (const item of catalog) {
  if (ids.has(item.id)) {
    throw new Error(`Duplicate ingredient id: ${item.id}`);
  }
  ids.add(item.id);

  const canonicalKey = normalizeAlias(item.name);
  if (canonicalNames.has(canonicalKey)) {
    throw new Error(`Duplicate canonical ingredient name: ${item.name}`);
  }
  canonicalNames.add(canonicalKey);

  const values = [
    { alias: item.name, aliasType: "canonical" },
    ...(item.aliases ?? []).map((alias) => ({ alias, aliasType: "synonym" })),
  ];

  for (const value of values) {
    const normalizedAlias = normalizeAlias(value.alias);
    const existing = aliasesByNormalizedValue.get(normalizedAlias);
    if (existing && existing.ingredientId !== item.id) {
      throw new Error(
        `Ambiguous ingredient alias: ${value.alias} (${existing.ingredientId}, ${item.id})`,
      );
    }
    aliasesByNormalizedValue.set(normalizedAlias, {
      ingredientId: item.id,
      alias: value.alias,
      normalizedAlias,
      aliasType: value.aliasType,
    });
  }
}

const catalogValues = catalog.map(
  (item) =>
    `  (${[
      sqlString(item.id),
      sqlString(item.name),
      sqlString(item.category),
      sqlString(item.defaultStorageType),
      sqlString(item.defaultUnit),
      "null",
    ].join(", ")})`,
);

const aliasRows = [...aliasesByNormalizedValue.values()].sort((left, right) =>
  left.normalizedAlias.localeCompare(right.normalizedAlias, "ko"),
);
const aliasValues = aliasRows.map(
  (row) =>
    `  (${[
      sqlString(row.ingredientId),
      sqlString(row.alias),
      sqlString(row.normalizedAlias),
      sqlString(row.aliasType),
      sqlString("ko-KR"),
    ].join(", ")})`,
);

const migration = [
  "insert into public.ingredients_catalog (",
  "  id, canonical_name, category, default_storage_type, common_unit, allergen_group",
  ") values",
  `${catalogValues.join(",\n")}`,
  "on conflict (id) do update",
  "set canonical_name = excluded.canonical_name,",
  "    category = excluded.category,",
  "    default_storage_type = excluded.default_storage_type,",
  "    common_unit = excluded.common_unit,",
  "    allergen_group = excluded.allergen_group,",
  "    active = true,",
  "    updated_at = now();",
  "",
  "insert into public.ingredient_aliases (",
  "  ingredient_id, alias, normalized_alias, alias_type, locale",
  ") values",
  `${aliasValues.join(",\n")}`,
  "on conflict (locale, normalized_alias) do update",
  "set ingredient_id = excluded.ingredient_id,",
  "    alias = excluded.alias,",
  "    alias_type = excluded.alias_type;",
  "",
  "notify pgrst, 'reload schema';",
  "",
].join("\n");

const rollback = [
  "revoke all on table public.ingredients_catalog from anon, authenticated;",
  "revoke all on table public.ingredient_aliases from anon, authenticated;",
  "comment on table public.ingredients_catalog is",
  "  'Phase 1 rollback retained the app-owned catalog because normalized recipe rows may reference it.';",
  "notify pgrst, 'reload schema';",
  "",
].join("\n");

const csvRows = [
  ["id", "canonical_name", "category", "default_storage_type", "common_unit", "aliases"],
  ...catalog.map((item) => [
    item.id,
    item.name,
    item.category,
    item.defaultStorageType ?? "",
    item.defaultUnit ?? "",
    (item.aliases ?? []).join("|"),
  ]),
];

writeFileSync(migrationPath, migration, "utf8");
writeFileSync(rollbackPath, rollback, "utf8");
writeFileSync(
  csvPath,
  `${csvRows.map((row) => row.map(csvValue).join(",")).join("\n")}\n`,
  "utf8",
);

console.log(`Phase 1 ingredient seed generated: ${catalog.length} catalog rows, ${aliasRows.length} aliases`);
