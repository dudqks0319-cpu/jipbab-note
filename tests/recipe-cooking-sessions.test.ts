import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseRecipeCookingSessionInput } from "../lib/recipe-cooking-session.ts";

const migration = readFileSync("supabase/migrations/20260717092000_add_cooking_sessions.sql", "utf8");
const rollback = readFileSync("supabase/rollbacks/20260717092000_add_cooking_sessions.sql", "utf8");
const route = readFileSync("app/api/v1/recipes/[id]/cooking-sessions/route.ts", "utf8");
const form = readFileSync("components/recipe/RecipeCookingSessionForm.tsx", "utf8");
const cookMode = readFileSync("components/recipe/RecipeCookMode.tsx", "utf8");
const schema = readFileSync("supabase/schema.sql", "utf8");

const validInput = {
  clientSessionId: "c1028db3-6d0b-44b3-8128-9f28d633604b",
  startedAt: "2026-07-17T10:00:00.000Z",
  completedAt: "2026-07-17T10:25:00.000Z",
  actualDurationMinutes: 25,
  outcome: "success",
  difficulty: "easy",
  taste: "balanced",
  remakeIntent: "yes",
  substituteNotes: "대파 대신 쪽파",
  familyReaction: "아이도 잘 먹음",
  comment: "다음에는 간장을 조금 줄이기",
};

test("cooking session input is structured, bounded, and normalized", () => {
  const now = new Date("2026-07-17T11:00:00.000Z");
  assert.deepEqual(parseRecipeCookingSessionInput(validInput, now), validInput);
  for (const input of [
    { ...validInput, clientSessionId: "not-a-uuid" },
    { ...validInput, actualDurationMinutes: 0 },
    { ...validInput, outcome: "perfect" },
    { ...validInput, comment: "가".repeat(501) },
    { ...validInput, completedAt: "2026-07-16T10:25:00.000Z" },
    { ...validInput, extra: true },
  ]) {
    assert.throws(() => parseRecipeCookingSessionInput(input, now), /invalid_cooking_session/);
  }
  assert.throws(
    () => parseRecipeCookingSessionInput({ ...validInput, completedAt: "2026-07-18T11:00:00.000Z" }, now),
    /invalid_cooking_session/,
  );
});

test("cooking sessions require permanent auth, rate limits, and a public v2 recipe", () => {
  assert.match(route, /consumeDistributedRateLimit/);
  assert.match(route, /getAuthenticatedServerUser/);
  assert.match(route, /isPermanentSupabaseUser/);
  assert.match(route, /schema_version/);
  assert.match(route, /review_status/);
  assert.match(route, /published_at/);
  assert.match(route, /onConflict: "user_id,client_session_id"/);
});

test("cooking records stay private and require explicit UI submission", () => {
  assert.match(migration, /create table if not exists public\.cooking_sessions/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /revoke all on table public\.cooking_sessions from anon/);
  assert.match(migration, /not editorial recipe approval evidence/);
  assert.match(schema, /create table if not exists public\.cooking_sessions/);
  assert.doesNotMatch(rollback, /drop table|truncate|delete from/i);
  assert.match(form, /저장 버튼을 눌렀을 때만/);
  assert.match(form, /비공개 기록 저장/);
  assert.match(form, /authorization: `Bearer \$\{accessToken\}`/);
  assert.match(cookMode, /<RecipeCookingSessionForm/);
});
