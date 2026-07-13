import assert from "node:assert/strict";
import test from "node:test";

import { mapRuntimeProductAnalyticsEvent } from "../lib/product-analytics.ts";

test("runtime analytics maps UI events into the canonical privacy-safe contract", () => {
  assert.deepEqual(
    mapRuntimeProductAnalyticsEvent("timer_started", {
      recipeId: "00000000-0000-4000-8000-0000000006e1",
      stepIndex: 2,
      durationSeconds: 90,
      email: "must-not-pass@example.com",
    }),
    {
      event: "timer_started",
      screen: "cooking",
      recipeId: "00000000-0000-4000-8000-0000000006e1",
      measurements: { step_number: 2, timer_seconds: 90 },
    },
  );
});
