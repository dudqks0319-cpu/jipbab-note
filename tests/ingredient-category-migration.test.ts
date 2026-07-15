import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260715121727_fix_legacy_ingredient_categories_20260715.sql",
  "utf8",
);
const rollback = readFileSync(
  "supabase/rollbacks/20260715121727_fix_legacy_ingredient_categories_20260715.sql",
  "utf8",
);
const canonicalMigration = readFileSync(
  "supabase/migrations/20260715121937_enforce_canonical_egg_tofu_categories_20260715.sql",
  "utf8",
);
const canonicalRollback = readFileSync(
  "supabase/rollbacks/20260715121937_enforce_canonical_egg_tofu_categories_20260715.sql",
  "utf8",
);

test("legacy ingredient category repair is narrow and backed up", () => {
  assert.match(migration, /ingredients_pre_category_fix_20260715/);
  assert.match(migration, /where category = '유제품'/);
  assert.match(migration, /in \('계란', '달걀', '두부'\)/);
  assert.match(migration, /then '육류'/);
  assert.match(migration, /then '통조림\/가공식품'/);
  assert.match(migration, /revoke all on table ops_backup\.ingredients_pre_category_fix_20260715/);
  assert.doesNotMatch(migration, /\bdelete\b|\btruncate\b|\bdrop table\b/i);
});

test("legacy ingredient category rollback restores the captured values", () => {
  assert.match(rollback, /set category = backup\.category/);
  assert.match(rollback, /where target\.id = backup\.id/);
  assert.doesNotMatch(rollback, /\bdelete\b|\btruncate\b|\bdrop table\b/i);
});

test("canonical repair catches remaining exact-name category drift", () => {
  assert.match(canonicalMigration, /ingredients_pre_canonical_category_fix_20260715/);
  assert.match(canonicalMigration, /category is distinct from case/);
  assert.match(canonicalMigration, /then '육류'/);
  assert.match(canonicalMigration, /then '통조림\/가공식품'/);
  assert.doesNotMatch(canonicalMigration, /\bdelete\b|\btruncate\b|\bdrop table\b/i);
});

test("canonical repair rollback restores the captured values", () => {
  assert.match(canonicalRollback, /set category = backup\.category/);
  assert.match(canonicalRollback, /where target\.id = backup\.id/);
  assert.doesNotMatch(canonicalRollback, /\bdelete\b|\btruncate\b|\bdrop table\b/i);
});
