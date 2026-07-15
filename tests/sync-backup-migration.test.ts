import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260715095212_backup_sync_domain_pre_signed_session_20260715.sql",
  "utf8",
);

test("sync migration backup captures affected data and authorization metadata", () => {
  for (const table of [
    "family_groups",
    "family_members",
    "ingredients",
    "shopping_items",
    "favorites",
    "community_posts",
    "community_comments",
    "community_likes",
    "account_deletion_requests",
    "account_deletion_request_events",
  ]) {
    assert.match(migration, new RegExp(`public\\.${table}\\b`), table);
  }

  assert.match(migration, /pg_policies/);
  assert.match(migration, /pg_get_functiondef/);
  assert.match(migration, /supabase_migrations\.schema_migrations/);
  assert.match(migration, /backup_manifest_pre_signed_session_20260715/);
});

test("sync migration backup stays private and non-destructive", () => {
  assert.match(migration, /revoke all on schema ops_backup from public, anon, authenticated/i);
  assert.match(migration, /revoke all on all tables in schema ops_backup from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /\b(drop|truncate|delete|update)\b/i);
  assert.doesNotMatch(
    migration,
    /SUPABASE_(SERVICE_ROLE_KEY|DB_PASSWORD|ACCESS_TOKEN)|SERVICE_ROLE_KEY|API_KEY|PASSWORD/i,
  );
  assert.match(migration, /Not a full project disaster-recovery backup/);
});
