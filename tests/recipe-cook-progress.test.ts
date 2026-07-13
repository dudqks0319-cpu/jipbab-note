import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecipeCookTimer,
  normalizeRecipeCookProgress,
  pauseRecipeCookTimer,
  recipeCookProgressKey,
  remainingTimerSeconds,
  resumeRecipeCookTimer,
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

test("cook timer pauses and resumes from the persisted remaining duration", () => {
  const timer = createRecipeCookTimer(1, 90, 1_000);
  assert.ok(timer);
  const paused = pauseRecipeCookTimer(timer, 31_000);
  assert.ok(paused);
  assert.equal(paused.pausedRemainingSeconds, 60);
  assert.equal(remainingTimerSeconds(paused, 80_000), 60);

  const resumed = resumeRecipeCookTimer(paused, 80_000);
  assert.ok(resumed);
  assert.equal(resumed.pausedRemainingSeconds, null);
  assert.equal(resumed.endsAt, 140_000);
});

test("saved cook progress restores only current recipe steps", () => {
  const progress = normalizeRecipeCookProgress({
    version: 1,
    activeStepIndex: 1,
    checkedStepIndexes: [1, 2, 2, 99],
    timer: { stepIndex: 2, endsAt: 50_000, durationSeconds: 60, pausedRemainingSeconds: 30 },
    completedAt: "2026-07-11T00:00:00.000Z",
    feedback: "easy",
    updatedAt: "2026-07-11T00:00:00.000Z",
  }, [1, 2, 3]);

  assert.ok(progress);
  assert.deepEqual(progress.checkedStepIndexes, [1, 2]);
  assert.equal(progress.activeStepIndex, 1);
  assert.equal(progress.timer?.stepIndex, 2);
  assert.equal(progress.timer?.pausedRemainingSeconds, 30);
  assert.equal(progress.feedback, "easy");
  assert.equal(recipeCookProgressKey("recipe-1"), "jipbab:recipe-cook-progress:v1:recipe-1");
});

test("malformed saved cook progress fails closed", () => {
  assert.equal(normalizeRecipeCookProgress(null, [1, 2]), null);
  assert.equal(normalizeRecipeCookProgress({ version: 2, updatedAt: "now" }, [1, 2]), null);
});
