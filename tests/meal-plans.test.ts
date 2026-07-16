import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getWeekDates, getWeekStart, parseMealPlanInput } from "../lib/meal-plan.ts";

const migration = readFileSync("supabase/migrations/20260717093000_add_meal_plans.sql", "utf8");
const rollback = readFileSync("supabase/rollbacks/20260717093000_add_meal_plans.sql", "utf8");
const route = readFileSync("app/api/v1/meal-plans/route.ts", "utf8");
const hook = readFileSync("hooks/useMealPlan.ts", "utf8");
const page = readFileSync("app/meal-plan/page.tsx", "utf8");
const schema = readFileSync("supabase/schema.sql", "utf8");

const recipeId = "c1028db3-6d0b-44b3-8128-9f28d633604b";

test("meal plans validate a Monday week and unique breakfast lunch dinner slots", () => {
  assert.equal(getWeekStart(new Date("2026-07-17T12:00:00+09:00")), "2026-07-13");
  assert.deepEqual(getWeekDates("2026-07-13"), [
    "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19",
  ]);
  const input = {
    weekStart: "2026-07-13",
    items: [
      { date: "2026-07-13", mealType: "dinner", kind: "recipe", recipeId, title: "두부조림", servings: 2 },
      { date: "2026-07-14", mealType: "breakfast", kind: "leftovers", recipeId: null, title: "남은 두부조림", servings: 1 },
    ],
  };
  assert.deepEqual(parseMealPlanInput(input), input);
  for (const invalid of [
    { ...input, weekStart: "2026-07-14" },
    { ...input, items: [...input.items, input.items[0]] },
    { ...input, items: [{ ...input.items[0], date: "2026-07-20" }] },
    { ...input, items: [{ ...input.items[0], kind: "recipe", recipeId: null }] },
    { ...input, items: [{ ...input.items[1], kind: "delivery", recipeId }] },
  ]) {
    assert.throws(() => parseMealPlanInput(invalid), /invalid_meal_plan/);
  }
});

test("meal plan persistence is private and item replacement is atomic", () => {
  assert.match(migration, /create table if not exists public\.meal_plans/);
  assert.match(migration, /create table if not exists public\.meal_plan_items/);
  assert.match(migration, /create or replace function public\.replace_meal_plan_items/);
  assert.match(migration, /meal_plan_date_out_of_range/);
  assert.match(migration, /revoke all on table public\.meal_plans from anon, authenticated/);
  assert.match(migration, /grant execute on function public\.replace_meal_plan_items\(uuid, jsonb\) to service_role/);
  assert.match(schema, /create table if not exists public\.meal_plans/);
  assert.doesNotMatch(rollback, /drop table|truncate|delete from/i);
});

test("meal plan API requires permanent auth and validates public recipes", () => {
  assert.match(route, /createApiV1Responder\("GET \/api\/v1\/meal-plans"\)/);
  assert.match(route, /createApiV1Responder\("PUT \/api\/v1\/meal-plans"\)/);
  assert.match(route, /isPermanentSupabaseUser/);
  assert.match(route, /parseMealPlanInput/);
  assert.match(route, /review_status/);
  assert.match(route, /canonicalRecipeTitles/);
  assert.match(route, /replace_meal_plan_items/);
});

test("meal plan UI persists real slots and separates local from synced state", () => {
  assert.match(hook, /jipbab:meal-plan:v1:/);
  assert.match(hook, /"local_only" \| "syncing" \| "synced" \| "failed"/);
  assert.match(hook, /"conflict"/);
  assert.match(hook, /자동으로 덮어쓰지 않았습니다/);
  assert.match(hook, /동기화에 실패했습니다\. 현재 식단은 이 기기에만 저장됩니다/);
  assert.match(page, /MEAL_TYPES\.map/);
  assert.match(page, /추천 메뉴로 저녁 7일 채우기/);
  assert.match(page, /식단 부족 재료 장보기에 합치기/);
  assert.match(page, /계정과 동기화됨/);
  assert.match(page, /계정 식단 사용/);
  assert.match(page, /기기 식단 유지/);
});
