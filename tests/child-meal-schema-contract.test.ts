import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function migration(name: string) {
  return readFile(path.join(root, "supabase", "migrations", name), "utf8");
}

test("child guidance migration is additive, reviewed and server-only", async () => {
  const sql = await migration("20260712090000_add_recipe_child_guidance.sql");

  assert.match(sql, /create table if not exists public\.recipe_child_guidance/i);
  assert.match(sql, /references public\.recipes\(id\) on delete cascade/i);
  assert.match(sql, /review_status <> 'approved'/i);
  assert.match(sql, /child_feeding_reviewed = true/i);
  assert.match(sql, /requirements_verified = true/i);
  assert.match(sql, /alter table public\.recipe_child_guidance enable row level security/i);
  assert.match(sql, /revoke all on table public\.recipe_child_guidance from anon, authenticated/i);
  assert.doesNotMatch(sql, /security\s+definer/i);
  assert.doesNotMatch(sql, /grant\s+select/i);
});

test("recipe reference migration records use and rights without public reads", async () => {
  const sql = await migration("20260712091000_add_recipe_reference_links.sql");

  assert.match(sql, /create table if not exists public\.recipe_reference_links/i);
  assert.match(sql, /license_or_usage_note text not null/i);
  assert.match(sql, /rights_note text not null/i);
  assert.match(sql, /used_for text not null/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.recipe_reference_links from anon, authenticated/i);
  assert.doesNotMatch(sql, /security\s+definer/i);
});
