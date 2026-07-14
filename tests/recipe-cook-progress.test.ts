import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecipeCookTimer,
  normalizeRecipeCookProgress,
  recipeCookProgressKey,
  remainingTimerSeconds,
} from "../lib/recipe-cook-progress.ts";

test("cook timer uses an absolute deadline across background gaps", () => {
  const timer = createRecipeCookTimer(2, 90, 1_000);
  assert.ok(timer);
  assert.equal(timer.endsAt, 91_000);
  assert.equal(remainingTimerSeconds(timer, 31_000), 60);
  assert.equal(remainingTimerSeconds(timer, 91_500), 0);
});

test("cook timer rejects invalid or unbounded durations", () => {
  assert.equal(createRecipeCookTimer(0, 60), null);
  assert.equal(createRecipeCookTimer(1, 0), null);
  assert.equal(createRecipeCookTimer(1, 86_401), null);
});

test("saved cook progress restores only current recipe steps", () => {
  const progress = normalizeRecipeCookProgress({
    version: 2,
    activeStepIndex: 1,
    checkedStepIndexes: [1, 2, 2, 99],
    timer: { stepIndex: 2, endsAt: 50_000, durationSeconds: 60 },
    startedAt: "2026-07-11T00:00:00.000Z",
    completedAt: "2026-07-11T00:00:00.000Z",
    feedback: {
      clientSubmissionId: "263f627e-39f9-4e74-9a3d-68657698ec87",
      completionStatus: "failed",
      failedStepOrder: 2,
      reasonCode: "timer_issue",
      actualDurationSeconds: 600,
      submittedAt: "2026-07-11T00:10:00.000Z",
      syncedAt: null,
    },
    updatedAt: "2026-07-11T00:00:00.000Z",
  }, [1, 2, 3]);

  assert.ok(progress);
  assert.deepEqual(progress.checkedStepIndexes, [1, 2]);
  assert.equal(progress.activeStepIndex, 1);
  assert.equal(progress.timer?.stepIndex, 2);
  assert.equal(progress.startedAt, "2026-07-11T00:00:00.000Z");
  assert.equal(progress.feedback?.completionStatus, "failed");
  assert.equal(progress.feedback?.reasonCode, "timer_issue");
  assert.equal(recipeCookProgressKey("recipe-1"), "jipbab:recipe-cook-progress:v1:recipe-1");
});

test("version one progress migrates without reinterpreting legacy difficulty feedback", () => {
  const progress = normalizeRecipeCookProgress({
    version: 1,
    activeStepIndex: 0,
    checkedStepIndexes: [1],
    timer: null,
    completedAt: null,
    feedback: "easy",
    updatedAt: "2026-07-11T00:00:00.000Z",
  }, [1, 2]);

  assert.ok(progress);
  assert.equal(progress.version, 2);
  assert.equal(progress.startedAt, null);
  assert.equal(progress.feedback, null);
  assert.deepEqual(progress.checkedStepIndexes, [1]);
});

test("malformed saved cook progress fails closed", () => {
  assert.equal(normalizeRecipeCookProgress(null, [1, 2]), null);
  assert.equal(normalizeRecipeCookProgress({ version: 3, updatedAt: "now" }, [1, 2]), null);
});
