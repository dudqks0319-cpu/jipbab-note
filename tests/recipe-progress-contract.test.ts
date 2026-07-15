import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("recipe progress API is signed-user only, bounded, and conflict safe", () => {
  const route = source("app/api/v1/recipe-progress/route.ts");

  for (const contract of [
    "export async function GET",
    "export async function POST",
    "readBoundedJsonObject",
    "consumeDistributedRateLimit",
    "getBearerAccessToken",
    "getAuthenticatedServerUser",
    "user.is_anonymous === true",
    "getServerSupabaseAdminClient",
    '.from("recipe_progress")',
    '.eq("user_id", user.id)',
    '.eq("updated_at", existing.updated_at)',
    'respond.error("CONFLICT"',
    "serverUpdatedAt",
  ]) {
    assert.ok(route.includes(contract), `missing route contract: ${contract}`);
  }
  assert.doesNotMatch(route, /console\.|SUPABASE_SERVICE_ROLE_KEY|error\.stack/);
});

test("recipe progress parser accepts only bounded structured fields", () => {
  const parser = source("lib/recipe-progress.ts");

  assert.match(parser, /const INPUT_KEYS = \[/);
  assert.match(parser, /const TIMER_KEYS = \[/);
  assert.match(parser, /MAX_RECIPE_PROGRESS_STEPS = 100/);
  assert.match(parser, /MAX_RECIPE_PROGRESS_SERVINGS = 20/);
  assert.match(parser, /MAX_RECIPE_PROGRESS_TIMER_SECONDS = 24 \* 60 \* 60/);
  assert.doesNotMatch(parser, /comment|memo|note|description/i);
});

test("recipe progress database is private, constrained, and server-clock owned", () => {
  const migration = source("supabase/migrations/20260715110000_add_recipe_progress.sql");
  const rollback = source("supabase/rollbacks/20260715110000_add_recipe_progress.sql");

  for (const contract of [
    "create table if not exists public.recipe_progress",
    "recipe_progress_checked_steps_canonical",
    "recipe_progress_timer_fields_consistent",
    "unique (user_id, recipe_id, servings)",
    "new.updated_at = clock_timestamp()",
    "enable row level security",
    "from public, anon, authenticated",
    "to service_role",
  ]) {
    assert.ok(migration.includes(contract), `missing migration contract: ${contract}`);
  }
  assert.doesNotMatch(migration, /grant\s+(?:all|select|insert|update)[^;]*\bto\s+(?:anon|authenticated)\b/i);
  assert.match(rollback, /from public, anon, authenticated, service_role/);
  assert.doesNotMatch(rollback, /drop\s+(?:table|function)|truncate|delete\s+from/i);
});

test("recipe progress is wired into schema, telemetry, and API contracts", () => {
  const sync = source("scripts/sync-phase-1-schema.mjs");
  const telemetry = source("lib/operational-telemetry.ts");
  const envelope = source("lib/api-v1-envelope.ts");
  const packageJson = source("package.json");

  assert.match(sync, /PHASE4_RECIPE_PROGRESS_SCHEMA_START/);
  assert.match(sync, /20260715110000_add_recipe_progress\.sql/);
  assert.match(telemetry, /GET \/api\/v1\/recipe-progress/);
  assert.match(telemetry, /POST \/api\/v1\/recipe-progress/);
  assert.match(envelope, /"CONFLICT"/);
  assert.match(packageJson, /"phase4:schema:sync"/);
});
