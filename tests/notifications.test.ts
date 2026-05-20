import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExpiryNotificationSchedule,
  scheduleDeviceExpiryNotifications,
} from "../lib/notifications.ts";

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
