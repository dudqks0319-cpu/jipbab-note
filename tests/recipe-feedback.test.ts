import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRecipeCookDurationSeconds,
  feedbackDifficultyForStatus,
  parseRecipeFeedbackV1Input,
  RecipeFeedbackValidationError,
} from "../lib/recipe-feedback.ts";

const baseInput = {
  clientSubmissionId: "263f627e-39f9-4e74-9a3d-68657698ec87",
  recipeId: "a36e34ec-5f17-4e4a-8e07-246b8082447e",
  recipeVersion: 3,
  completionStatus: "completed_independently",
  difficultStepOrder: null,
  failedStepOrder: null,
  reasonCode: null,
  tasteResult: null,
  repeatIntent: null,
  actualDurationSeconds: 870,
} as const;

test("recipe feedback accepts a bounded completion payload", () => {
  assert.deepEqual(parseRecipeFeedbackV1Input(baseInput), baseInput);
  assert.equal(feedbackDifficultyForStatus("completed_independently"), "manageable");
  assert.equal(feedbackDifficultyForStatus("completed_with_difficulty"), "difficult");
  assert.equal(feedbackDifficultyForStatus("failed"), "blocked");
});

test("recipe feedback accepts a failed step and optional reason code", () => {
  const input = {
    ...baseInput,
    completionStatus: "failed",
    failedStepOrder: 4,
    reasonCode: "heat_control",
  } as const;

  assert.deepEqual(parseRecipeFeedbackV1Input(input), input);
});

test("recipe feedback accepts bounded completion details without free text", () => {
  const input = {
    ...baseInput,
    completionStatus: "completed_with_difficulty",
    difficultStepOrder: 2,
    tasteResult: "delicious",
    repeatIntent: "after_adjustment",
  } as const;

  assert.deepEqual(parseRecipeFeedbackV1Input(input), input);
});

test("recipe feedback rejects free text, unknown fields, and inconsistent failure fields", () => {
  assert.throws(
    () => parseRecipeFeedbackV1Input({ ...baseInput, comment: "전화 주세요" }),
    RecipeFeedbackValidationError,
  );
  assert.throws(
    () => parseRecipeFeedbackV1Input({ ...baseInput, failedStepOrder: 2 }),
    RecipeFeedbackValidationError,
  );
  assert.throws(
    () => parseRecipeFeedbackV1Input({ ...baseInput, difficultStepOrder: 2 }),
    RecipeFeedbackValidationError,
  );
  assert.throws(
    () => parseRecipeFeedbackV1Input({
      ...baseInput,
      completionStatus: "failed",
      failedStepOrder: null,
    }),
    RecipeFeedbackValidationError,
  );
  assert.throws(
    () => parseRecipeFeedbackV1Input({
      ...baseInput,
      completionStatus: "failed",
      failedStepOrder: 2,
      tasteResult: "delicious",
    }),
    RecipeFeedbackValidationError,
  );
});

test("recipe feedback rejects malformed identifiers and unbounded durations", () => {
  assert.throws(
    () => parseRecipeFeedbackV1Input({ ...baseInput, recipeId: "recipe-1" }),
    RecipeFeedbackValidationError,
  );
  assert.throws(
    () => parseRecipeFeedbackV1Input({ ...baseInput, actualDurationSeconds: 43_201 }),
    RecipeFeedbackValidationError,
  );
});

test("actual cook duration is derived only from canonical bounded timestamps", () => {
  assert.equal(
    calculateRecipeCookDurationSeconds(
      "2026-07-14T01:00:00.000Z",
      "2026-07-14T01:14:30.000Z",
    ),
    870,
  );
  assert.equal(calculateRecipeCookDurationSeconds(null, "2026-07-14T01:14:30.000Z"), null);
  assert.equal(
    calculateRecipeCookDurationSeconds(
      "2026-07-14T01:14:30.000Z",
      "2026-07-14T01:00:00.000Z",
    ),
    null,
  );
});
