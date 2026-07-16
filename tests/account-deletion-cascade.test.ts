import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260530000000_cascade_user_deletion.sql",
  "utf8",
);
const accountDeletionRoute = readFileSync(
  "app/api/account-deletion-requests/[id]/route.ts",
  "utf8",
);
const directAccountDeletionRoute = readFileSync(
  "app/api/account/delete/route.ts",
  "utf8",
);

test("auth user deletion trigger scrubs account deletion request PII before content cleanup", () => {
  assert.match(migration, /create or replace function public\.handle_user_deletion\(\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = public, auth/);
  assert.match(migration, /update public\.account_deletion_requests/);
  assert.match(migration, /user_id = null/);
  assert.match(migration, /email = null/);
  assert.match(migration, /reason = null/);
  assert.match(migration, /where user_id = old\.id/);
});

test("auth user deletion trigger cleans user-owned public tables", () => {
  for (const tableName of [
    "ingredients",
    "favorites",
    "shopping_items",
    "community_likes",
    "recipe_comments",
    "community_comments",
    "community_posts",
  ]) {
    assert.match(migration, new RegExp(`delete from public\\.${tableName} where user_id = old\\.id`));
  }
});

test("account deletion completion delegates auth deletion to Supabase admin once confirmed", () => {
  assert.match(accountDeletionRoute, /ACCOUNT_DELETE_ACTION = "delete-account"/);
  assert.match(accountDeletionRoute, /confirmUserId !== currentRequest\.user_id/);
  assert.match(accountDeletionRoute, /client\.auth\.admin\.deleteUser\(currentRequest\.user_id\)/);
  assert.doesNotMatch(accountDeletionRoute, /deleteRowsForUser/);
});

test("direct account deletion verifies the bearer session and deletes only that auth user", () => {
  assert.match(directAccountDeletionRoute, /DIRECT_DELETE_CONFIRMATION = "DELETE_MY_ACCOUNT"/);
  assert.match(
    directAccountDeletionRoute,
    /getAuthenticatedServerUser\(request\.headers\.get\("authorization"\)\)/,
  );
  assert.match(directAccountDeletionRoute, /client\.auth\.admin\.deleteUser\(user\.id\)/);
  assert.match(directAccountDeletionRoute, /status: COMPLETED_STATUS/);
  assert.doesNotMatch(directAccountDeletionRoute, /confirmUserId/);
  assert.doesNotMatch(directAccountDeletionRoute, /body\.user_id|body\.email|body\.id/);
});
