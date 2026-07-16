import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260710150000_add_recipe_v2_schema_and_versioning.sql",
  "utf8",
);
const seed = readFileSync(
  "supabase/migrations/20260710151000_seed_phase1_ingredient_catalog.sql",
  "utf8",
);
const productionSeedBackup = readFileSync(
  "supabase/migrations/20260715135333_backup_phase1_ingredient_catalog_pre_seed_20260715.sql",
  "utf8",
);
const reconciledProductionSeed = readFileSync(
  "supabase/migrations/20260715135424_seed_phase1_ingredient_catalog_reconciled_20260715.sql",
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
const dataContract = readFileSync("docs/phase-1-data-contract.md", "utf8");
const catalogCsv = readFileSync("docs/phase-1-ingredient-catalog.csv", "utf8");
const dryRunCsv = readFileSync("docs/phase-1-migration-dry-run.csv", "utf8");
const dryRunReport = readFileSync("docs/phase-1-migration-dry-run.md", "utf8");
const sourceLedger = readFileSync("docs/recipe-source-ledger.csv", "utf8");
const beginnerRubric = readFileSync("docs/beginner-recipe-review-rubric.md", "utf8");
const publicationMigration = readFileSync(
  "supabase/migrations/20260710130000_gate_recipe_publication.sql",
  "utf8",
);
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const results = [];

function check(label, condition, detail) {
  results.push({ label, ok: Boolean(condition), detail });
}

const requiredTables = [
  "recipe_categories",
  "ingredients_catalog",
  "ingredient_aliases",
  "recipe_ingredients",
  "recipe_ingredient_substitutions",
  "recipe_steps",
  "recipe_step_ingredients",
  "recipe_reviews",
  "recipe_versions",
];

for (const tableName of requiredTables) {
  check(
    `table ${tableName}`,
    migration.includes(`create table if not exists public.${tableName}`),
    "present in Phase 1 schema migration",
  );
}

check(
  "same-recipe step ingredient integrity",
  migration.includes("foreign key (recipe_step_id, recipe_id)") &&
    migration.includes("foreign key (recipe_ingredient_id, recipe_id)"),
  "composite foreign keys prevent cross-recipe usage links",
);
check(
  "service-role version capture",
  migration.includes("public.capture_recipe_version") &&
    migration.includes("grant execute on function public.capture_recipe_version(uuid, integer, text, uuid) to service_role"),
  "capture RPC is restricted to service_role",
);
check(
  "service-role version restore",
  migration.includes("public.restore_recipe_version") &&
    migration.includes("grant execute on function public.restore_recipe_version(uuid, integer, integer, text, uuid) to service_role"),
  "restore RPC is restricted to service_role",
);
check(
  "fixed function search path",
  (migration.match(/set search_path = pg_catalog, public, app/g) ?? []).length === 3,
  "every Phase 1 SECURITY DEFINER function fixes search_path",
);
check(
  "non-destructive rollback",
  !/drop table|drop column|truncate/i.test(`${rollback}\n${seedRollback}`),
  "rollback disables mutation and preserves normalized data",
);
check(
  "catalog seed size",
  catalogCsv.trim().split("\n").length === 174,
  "173 catalog rows plus header",
);
check(
  "canonical and alias seed",
  (seed.match(/'(?:canonical|synonym)', 'ko-KR'\)/g) ?? []).length === 258,
  "258 globally unique exact alias rows",
);
check(
  "canonical egg and tofu categories",
  seed.includes("('dairy-egg', '계란', '육류', '냉장', 'piece', null)") &&
    seed.includes("('dairy-tofu', '두부', '통조림/가공식품', '냉장', 'block', null)") &&
    catalogCsv.includes("dairy-egg,계란,육류,냉장,piece,달걀") &&
    catalogCsv.includes("dairy-tofu,두부,통조림/가공식품,냉장,block,") &&
    !seed.includes("('dairy-egg', '계란', '유제품'") &&
    !seed.includes("('dairy-tofu', '두부', '유제품'"),
  "generated SQL and CSV preserve the app-owned canonical categories",
);
check(
  "production catalog seed backup",
  productionSeedBackup.includes("ops_backup.ingredients_catalog_pre_phase1_seed_20260715") &&
    productionSeedBackup.includes("ops_backup.ingredient_aliases_pre_phase1_seed_20260715") &&
    productionSeedBackup.includes("revoke all on table") &&
    !/\bdelete\b|\btruncate\b|\bdrop table\b/i.test(productionSeedBackup),
  "production seed has a private, non-destructive recovery snapshot",
);
check(
  "reconciled production seed",
  reconciledProductionSeed === seed,
  "the remote reconciliation migration exactly matches the canonical generated seed",
);
check(
  "schema snapshot synchronized",
  schema.includes(migration.trim()) && schema.includes(seed.trim()),
  "canonical schema contains both Phase 1 migrations",
);
check(
  "dry-run artifact shape",
  dryRunCsv.startsWith("recipeId,title,sourceCategory,categoryStatus") &&
    /Live rows inspected: \*\*\d+\*\*/.test(dryRunReport),
  "read-only editor queue and summary are present",
);
check(
  "dry-run no inference rule",
  dryRunReport.includes("never converted by this dry run") &&
    dryRunReport.includes("remain unresolved instead of being mapped by keyword guesswork"),
  "legacy strings and ambiguous categories remain unconverted",
);
check(
  "rollout safety evidence documented",
  dataContract.includes("migration-history drift") &&
    dryRunReport.includes("restorable-backup requirement"),
  "staging, migration-history evidence, and restorable backup stay documented",
);
check(
  "generated evidence contains no credential material",
  !/(?:service_role|anon_key|api[_-]?key)\s*[:=]\s*[A-Za-z0-9._-]{20,}/i.test(
    `${catalogCsv}\n${dryRunCsv}\n${dryRunReport}`,
  ),
  "no credential-shaped values in Phase 1 evidence",
);
check(
  "source ledger contract",
  sourceLedger.startsWith("inventory_key,inventory_scope,recipe_id,title,category,source,source_url,source_license") &&
    sourceLedger.includes("source_record_status") &&
    sourceLedger.includes("attribution"),
  "source, license, attribution, and record status are inventoried",
);
check(
  "beginner review rubric",
  beginnerRubric.includes("초보자 레시피 100점 검수표") &&
    beginnerRubric.includes("actual_cooking") &&
    beginnerRubric.includes("legal_source") &&
    beginnerRubric.includes("실제 조리 테스트") &&
    beginnerRubric.includes("점수와 무관하게 `needs_revision`"),
  "100-point editorial rubric keeps evidence and actual cooking as hard gates",
);
check(
  "publication evidence gate",
  [
    "review_status = 'approved'",
    "reviewed_for_beginner is true",
    "actual_cooking_tested is true",
    "food_safety_reviewed is true",
    "image_rights_status in ('approved', 'no_image_approved')",
    "source_id is not null",
    "published_at is not null",
  ].every((requirement) => publicationMigration.includes(requirement)),
  "public reads require approval, beginner, cooking, safety, rights, and source evidence",
);
check(
  "content gate wiring",
  packageJson.scripts?.["test:content"]?.includes("check:phase1-data-contract") &&
    packageJson.scripts?.["test:content"]?.includes("check:curated-beginner-guidance") &&
    packageJson.scripts?.["test:content"]?.includes("check:recipe-inventory"),
  "Phase 1, beginner guidance, and inventory run together",
);

const failures = results.filter((result) => !result.ok);
console.log("Phase 1 data contract check");
console.log(`Passes: ${results.length - failures.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) {
    console.log(`- ${failure.label}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log("\nPASS");
for (const result of results) {
  console.log(`- ${result.label}: ${result.detail}`);
}
