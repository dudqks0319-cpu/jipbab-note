import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("recipe feedback API authenticates, rate limits, bounds input, and redacts internals", () => {
  const route = source("app/api/v1/recipe-feedback/route.ts");

  for (const contract of [
    'createApiV1Responder("POST /api/v1/recipe-feedback")',
    'consumeDistributedRateLimit(request, "recipes:feedback"',
    "readBoundedJsonObject(request, MAX_BODY_BYTES)",
    "getBearerAccessToken(authorizationHeader)",
    "getAuthenticatedServerUser(authorizationHeader)",
    "getServerSupabaseAdminClient()",
    '.from("recipe_feedback").insert',
    'respond.error("UNAUTHORIZED"',
    'error?.code === "23505"',
  ]) {
    assert.ok(route.includes(contract), `missing route contract: ${contract}`);
  }
  assert.doesNotMatch(route, /console\.|x-device-id|error\.stack/);
});

test("recipe feedback storage is private, constrained, indexed, and non-destructive to roll back", () => {
  const migration = source("supabase/migrations/20260714100000_add_recipe_feedback.sql");
  const rollback = source("supabase/rollbacks/20260714100000_add_recipe_feedback.sql");
  const completionMigration = source("supabase/migrations/20260714110000_extend_recipe_feedback_completion_details.sql");
  const completionRollback = source("supabase/rollbacks/20260714110000_extend_recipe_feedback_completion_details.sql");
  const schema = source("supabase/schema.sql");

  for (const contract of [
    "create table if not exists public.recipe_feedback",
    "recipe_id uuid not null references public.recipes(id) on delete cascade",
    "user_id uuid not null references auth.users(id) on delete cascade",
    "unique (user_id, client_submission_id)",
    "recipe_feedback_failure_fields_consistent",
    "recipe_feedback_no_free_text",
    "check (comment is null)",
    "idx_recipe_feedback_recipe_created",
    "idx_recipe_feedback_user_created",
    "alter table public.recipe_feedback enable row level security",
    "revoke all on table public.recipe_feedback from public, anon, authenticated",
    "grant select, insert on table public.recipe_feedback to service_role",
  ]) {
    assert.ok(migration.includes(contract), `missing database contract: ${contract}`);
  }
  assert.doesNotMatch(migration, /grant\s+(?:all|insert|select)[^;]*\bto\s+(?:anon|authenticated)\b/i);
  assert.doesNotMatch(rollback, /drop\s+table|truncate/i);
  for (const contract of [
    "add column if not exists difficult_step_order smallint",
    "add column if not exists taste_result text",
    "add column if not exists repeat_intent text",
    "recipe_feedback_difficult_step_consistent",
    "recipe_feedback_taste_result_allowed",
    "recipe_feedback_repeat_intent_allowed",
    "recipe_feedback_completion_details_consistent",
    "from public, anon, authenticated",
    "to service_role",
  ]) {
    assert.ok(completionMigration.includes(contract), `missing completion database contract: ${contract}`);
  }
  assert.doesNotMatch(completionMigration, /grant\s+(?:all|insert|select)[^;]*\bto\s+(?:anon|authenticated)\b/i);
  assert.doesNotMatch(completionRollback, /drop\s+(?:table|column)|truncate/i);
  assert.match(schema, /PHASE7_RECIPE_FEEDBACK_SCHEMA_START/);
  assert.match(schema, /public\.recipe_feedback/);
});

test("cook mode collects the plan completion choices without personal free text", () => {
  const form = source("components/recipe/RecipeCookFeedbackForm.tsx");
  const feedback = source("lib/recipe-feedback.ts");
  const cookMode = source("components/recipe/RecipeCookMode.tsx");
  const completion = source("components/recipe/RecipeCookCompletion.tsx");
  const page = source("app/recipe/[id]/page.tsx");
  const visibleContract = `${form}\n${feedback}\n${completion}`;

  for (const copy of [
    "혼자서 완성할 수 있었나요?",
    "네, 잘 완성했어요.",
    "완성했지만 어려웠어요.",
    "중간에 실패했어요.",
    "설명이 어려움",
    "불 세기 문제",
    "재료 양 문제",
    "필요한 도구 없음",
    "음식이 타거나 덜 익음",
    "어느 단계가 가장 어려웠나요?",
    "맛있게 완성됐어요",
    "다시 만들고 싶어요",
    "실제 걸린 시간",
    "남은 음식 보관 방법",
    "사용한 냉장고 재료 차감",
    "이 레시피 즐겨찾기",
    "이름·이메일·자유 입력은 받지 않습니다.",
  ]) {
    assert.ok(visibleContract.includes(copy), `missing plan copy: ${copy}`);
  }
  assert.doesNotMatch(form, /<textarea|type=["']text["']/);
  assert.doesNotMatch(completion, /<textarea|type=["']text["']|window\.confirm/);
  assert.match(cookMode, /현재 단계에서 조리를 멈췄어요/);
  assert.match(cookMode, /version: 2/);
  assert.match(page, /recipeVersion=\{recipe\.version \?\? 1\}/);
});

test("recipe feedback schema and telemetry are wired into release contracts", () => {
  const sync = source("scripts/sync-phase-1-schema.mjs");
  const telemetry = source("lib/operational-telemetry.ts");
  const packageJson = source("package.json");

  assert.match(sync, /20260714100000_add_recipe_feedback\.sql/);
  assert.match(sync, /20260714110000_extend_recipe_feedback_completion_details\.sql/);
  assert.match(telemetry, /POST \/api\/v1\/recipe-feedback/);
  assert.match(packageJson, /"phase7:schema:sync"/);
});
