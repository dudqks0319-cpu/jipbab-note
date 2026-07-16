import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("recipe comments have dedicated DB table, RLS, and status moderation states", () => {
  const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../supabase/migrations/20260523090000_add_recipe_comments.sql", import.meta.url), "utf8");

  for (const source of [schema, migration]) {
    assert.match(source, /create table if not exists public\.recipe_comments/);
    assert.match(source, /recipe_id text not null/);
    assert.match(source, /status text not null default 'visible'/);
    assert.match(source, /char_length\(content\) between 1 and 500/);
    assert.match(source, /recipe_comments_select_visible/);
    assert.match(source, /recipe_comments_insert_authenticated/);
    assert.match(source, /recipe_comments_update_own/);
    assert.match(source, /recipe_comments_delete_own/);
  }
});

test("recipe comments API requires login for writes and hides deleted comments", () => {
  const listRoute = readFileSync(new URL("../app/api/recipes/[id]/comments/route.ts", import.meta.url), "utf8");
  const deleteRoute = readFileSync(new URL("../app/api/recipes/[id]/comments/[commentId]/route.ts", import.meta.url), "utf8");
  const component = readFileSync(new URL("../components/recipe/RecipeComments.tsx", import.meta.url), "utf8");
  const detailPage = readFileSync(new URL("../app/recipe/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(listRoute, /getAuthenticatedUser/);
  assert.match(listRoute, /isPermanentSupabaseUser/);
  assert.match(listRoute, /로그인하면 댓글을 남길 수 있어요/);
  assert.match(listRoute, /MAX_CONTENT_LENGTH = 500/);
  assert.match(listRoute, /device_id: `signed:\$\{randomUUID\(\)\}`/);
  assert.doesNotMatch(listRoute, /x-device-id/);
  assert.match(listRoute, /safeDecodeURIComponent/);
  assert.match(listRoute, /\.eq\("status", "visible"\)/);
  assert.match(deleteRoute, /status: "deleted"/);
  assert.match(deleteRoute, /\.eq\("user_id", auth\.user\.id\)/);
  assert.match(deleteRoute, /safeDecodeURIComponent/);
  assert.match(deleteRoute, /\.select\("id"\)/);
  assert.match(deleteRoute, /\.maybeSingle\(\)/);
  assert.match(deleteRoute, /댓글을 찾을 수 없거나 삭제 권한이 없습니다/);
  assert.match(component, /RecipeComments/);
  assert.match(component, /댓글 등록/);
  assert.match(component, /내 댓글 삭제/);
  assert.match(detailPage, /<RecipeComments recipeId=\{recipe\.id\} recipeName=\{recipe\.name\} \/>/);
});
