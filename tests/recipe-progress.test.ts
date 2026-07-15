import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRecipeProgressV1Input,
  parseRecipeProgressV1Query,
  recipeProgressDatabaseValues,
  recipeProgressV1Data,
  RecipeProgressValidationError,
  type RecipeProgressDatabaseRow,
} from "../lib/recipe-progress.ts";

const recipeId = "a36e34ec-5f17-4e4a-8e07-246b8082447e";

function validInput() {
  return {
    recipeId,
    recipeVersion: 3,
    servings: 2,
    activeStepIndex: 2,
    checkedStepIndexes: [1, 2],
    timer: {
      stepIndex: 3,
      endsAt: "2026-07-15T09:05:00.000Z",
      durationSeconds: 300,
    },
    startedAt: "2026-07-15T09:00:00.000Z",
    completedAt: null,
    updatedAt: "2026-07-15T09:01:00.000Z",
    baseServerUpdatedAt: "2026-07-15T09:00:30.123456Z",
  };
}

test("recipe progress accepts one canonical bounded progress snapshot", () => {
  assert.deepEqual(parseRecipeProgressV1Input(validInput()), validInput());
});

test("recipe progress rejects extra, missing, and free-text fields", () => {
  assert.throws(
    () => parseRecipeProgressV1Input({ ...validInput(), note: "개인 메모" }),
    RecipeProgressValidationError,
  );
  const missing = validInput() as Record<string, unknown>;
  delete missing.timer;
  assert.throws(() => parseRecipeProgressV1Input(missing), RecipeProgressValidationError);
});

test("recipe progress rejects duplicate, unsorted, or out-of-range steps", () => {
  for (const checkedStepIndexes of [[1, 1], [2, 1], [0], [101]]) {
    assert.throws(
      () => parseRecipeProgressV1Input({ ...validInput(), checkedStepIndexes }),
      RecipeProgressValidationError,
    );
  }
  assert.throws(
    () => parseRecipeProgressV1Input({ ...validInput(), activeStepIndex: 100 }),
    RecipeProgressValidationError,
  );
});

test("recipe progress requires canonical and chronologically valid timestamps", () => {
  assert.throws(
    () => parseRecipeProgressV1Input({ ...validInput(), updatedAt: "2026-07-15T09:01:00Z" }),
    RecipeProgressValidationError,
  );
  assert.throws(
    () => parseRecipeProgressV1Input({
      ...validInput(),
      completedAt: "2026-07-15T08:59:59.000Z",
    }),
    RecipeProgressValidationError,
  );
});

test("recipe progress preserves microsecond server revisions without accepting other zones", () => {
  assert.equal(
    parseRecipeProgressV1Input({
      ...validInput(),
      baseServerUpdatedAt: "2026-07-15T09:00:30.123456+00:00",
    }).baseServerUpdatedAt,
    "2026-07-15T09:00:30.123456Z",
  );
  assert.throws(
    () => parseRecipeProgressV1Input({
      ...validInput(),
      baseServerUpdatedAt: "2026-07-15T18:00:30.123456+09:00",
    }),
    RecipeProgressValidationError,
  );
});

test("recipe progress query requires exactly one UUID and bounded servings value", () => {
  assert.deepEqual(
    parseRecipeProgressV1Query(new URLSearchParams({ recipeId, servings: "2" })),
    { recipeId, servings: 2 },
  );
  assert.throws(
    () => parseRecipeProgressV1Query(
      new URLSearchParams(`recipeId=${recipeId}&servings=2&servings=3`),
    ),
    RecipeProgressValidationError,
  );
  assert.throws(
    () => parseRecipeProgressV1Query(
      new URLSearchParams({ recipeId, servings: "2", debug: "true" }),
    ),
    RecipeProgressValidationError,
  );
});

test("recipe progress database mapping keeps server and client clocks separate", () => {
  const input = parseRecipeProgressV1Input(validInput());
  const userId = "7a79f893-1de2-4b31-b8a7-cb6c1f76688c";
  assert.deepEqual(recipeProgressDatabaseValues(input, userId), {
    recipe_id: recipeId,
    recipe_version: 3,
    user_id: userId,
    servings: 2,
    active_step_index: 2,
    checked_step_indexes: [1, 2],
    timer_step_index: 3,
    timer_ends_at: "2026-07-15T09:05:00.000Z",
    timer_duration_seconds: 300,
    started_at: "2026-07-15T09:00:00.000Z",
    completed_at: null,
    client_updated_at: "2026-07-15T09:01:00.000Z",
  });

  const row: RecipeProgressDatabaseRow = {
    id: "276a88de-1382-42ae-91e4-2a55ea40c01c",
    ...recipeProgressDatabaseValues(input, userId),
    timer_ends_at: "2026-07-15T09:05:00+00:00",
    started_at: "2026-07-15T09:00:00+00:00",
    client_updated_at: "2026-07-15T09:01:00+00:00",
    created_at: "2026-07-15T09:00:30+00:00",
    updated_at: "2026-07-15T09:00:31.654321+00:00",
  };
  assert.deepEqual(recipeProgressV1Data(row), {
    recipeId,
    recipeVersion: 3,
    servings: 2,
    activeStepIndex: 2,
    checkedStepIndexes: [1, 2],
    timer: {
      stepIndex: 3,
      endsAt: "2026-07-15T09:05:00.000Z",
      durationSeconds: 300,
    },
    startedAt: "2026-07-15T09:00:00.000Z",
    completedAt: null,
    updatedAt: "2026-07-15T09:01:00.000Z",
    serverUpdatedAt: "2026-07-15T09:00:31.654321Z",
  });
});
