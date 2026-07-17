import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecipeCookTimer,
  normalizeRecipeCookProgress,
  recipeCookProgressKey,
  remainingTimerSeconds,
  upsertRecipeCookTimer,
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
    version: 1,
    clientSessionId: "c1028db3-6d0b-44b3-8128-9f28d633604b",
    startedAt: "2026-07-10T23:30:00.000Z",
    activeStepIndex: 1,
    checkedStepIndexes: [1, 2, 2, 99],
    timer: { stepIndex: 2, endsAt: 50_000, durationSeconds: 60 },
    completedAt: "2026-07-11T00:00:00.000Z",
    feedback: "easy",
    updatedAt: "2026-07-11T00:00:00.000Z",
  }, [1, 2, 3]);

  assert.ok(progress);
  assert.equal(progress.version, 2);
  assert.deepEqual(progress.checkedStepIndexes, [1, 2]);
  assert.equal(progress.activeStepIndex, 1);
  assert.equal(progress.timers[0]?.stepIndex, 2);
  assert.equal(progress.feedback, "easy");
  assert.equal(progress.clientSessionId, "c1028db3-6d0b-44b3-8128-9f28d633604b");
  assert.equal(progress.startedAt, "2026-07-10T23:30:00.000Z");
  assert.equal(recipeCookProgressKey("recipe-1"), "jipbab:recipe-cook-progress:v1:recipe-1");
});

test("saved cook progress restores multiple valid timers and deduplicates each step", () => {
  const progress = normalizeRecipeCookProgress({
    version: 2,
    clientSessionId: "c1028db3-6d0b-44b3-8128-9f28d633604b",
    startedAt: "2026-07-10T23:30:00.000Z",
    activeStepIndex: 0,
    checkedStepIndexes: [],
    timers: [
      { stepIndex: 1, endsAt: 61_000, durationSeconds: 60 },
      { stepIndex: 2, endsAt: 121_000, durationSeconds: 120 },
      { stepIndex: 2, endsAt: 181_000, durationSeconds: 180 },
      { stepIndex: 99, endsAt: 61_000, durationSeconds: 60 },
    ],
    completedAt: null,
    feedback: null,
    updatedAt: "2026-07-11T00:00:00.000Z",
  }, [1, 2, 3]);

  assert.ok(progress);
  assert.deepEqual(progress.timers.map((timer) => timer.stepIndex), [1, 2]);
  assert.equal(progress.timers[1]?.durationSeconds, 180);
});

test("upserting a cook timer preserves other step timers", () => {
  const first = createRecipeCookTimer(1, 60, 1_000);
  const second = createRecipeCookTimer(2, 120, 1_000);
  assert.ok(first);
  assert.ok(second);

  const timers = upsertRecipeCookTimer(upsertRecipeCookTimer([], first), second);
  assert.deepEqual(timers.map((timer) => timer.stepIndex), [1, 2]);

  const replacement = createRecipeCookTimer(1, 30, 2_000);
  assert.ok(replacement);
  const replaced = upsertRecipeCookTimer(timers, replacement);
  assert.equal(replaced.length, 2);
  assert.equal(replaced.find((timer) => timer.stepIndex === 1)?.durationSeconds, 30);
});

test("malformed saved cook progress fails closed", () => {
  assert.equal(normalizeRecipeCookProgress(null, [1, 2]), null);
  assert.equal(normalizeRecipeCookProgress({ version: 3, updatedAt: "now" }, [1, 2]), null);
});
