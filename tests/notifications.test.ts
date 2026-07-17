import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCookTimerNotificationJob,
  buildExpiryNotificationSchedule,
  scheduleDeviceExpiryNotifications,
} from "../lib/notifications.ts";
import { createRecipeCookTimer } from "../lib/recipe-cook-progress.ts";

test("expiry notification schedule includes D-3, D-1, and same-day jobs", () => {
  const jobs = buildExpiryNotificationSchedule(
    [{ ingredientId: "tofu", ingredientName: "두부", expiryDate: "2026-05-10" }],
    { now: new Date("2026-05-06T08:00:00+09:00"), notificationHour: 9 },
  );

  assert.deepEqual(jobs.map((job) => job.dDay), [3, 1, 0]);
  assert.match(jobs[2].body, /오늘까지/);
});

test("device expiry scheduler is safe during server rendering", async () => {
  const result = await scheduleDeviceExpiryNotifications(
    [{ ingredientId: "kimchi", ingredientName: "김치", expiryDate: "2026-05-10" }],
    { now: new Date("2026-05-06T08:00:00+09:00") },
  );

  assert.equal(result.mode, "server");
  assert.equal(result.jobs.length, 3);
});

test("cook timer notification uses the absolute timer deadline", () => {
  const timer = createRecipeCookTimer(3, 90, Date.parse("2026-07-17T01:00:00.000Z"));
  assert.ok(timer);
  const job = buildCookTimerNotificationJob("recipe-1", "된장찌개", timer);

  assert.equal(job.id, "cook-recipe-1-step-3");
  assert.equal(job.scheduledAt, "2026-07-17T01:01:30.000Z");
  assert.match(job.title, /3단계/);
  assert.match(job.body, /된장찌개/);
});
