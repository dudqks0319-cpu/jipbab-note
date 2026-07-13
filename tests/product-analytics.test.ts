import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_ANALYTICS_DEFAULTS,
  PRODUCT_ANALYTICS_EVENT_NAMES,
  buildProductAnalyticsEvent,
  emitProductAnalyticsEvent,
  type ProductAnalyticsContext,
  type ProductAnalyticsEvent,
} from "../lib/analytics/product-events.ts";

const context: ProductAnalyticsContext = {
  anonymous_session_id: "opaque_session_123456",
  user_status: "guest",
  screen: "recipe_detail",
  app_version: "1.0.0",
  platform: "web",
  deployment_sha: "abcdef1234567890",
  recipe_id: "a36e34ec-5f17-4e4a-8e07-246b8082447e",
  recipe_version: 2,
};

test("product analytics event contract matches every event in the plan", () => {
  assert.equal(PRODUCT_ANALYTICS_EVENT_NAMES.length, 33);
  for (const event of [
    "onboarding_completed",
    "ingredient_added",
    "recommendation_clicked",
    "recipe_viewed",
    "cooking_completed",
    "shopping_item_moved_to_fridge",
  ] as const) {
    assert.equal(PRODUCT_ANALYTICS_EVENT_NAMES.includes(event), true);
  }
});

test("product analytics payload keeps bounded structured properties", () => {
  const payload = buildProductAnalyticsEvent(
    "cooking_completed",
    context,
    { step_number: 5, elapsed_seconds: 900 },
    () => new Date("2026-07-13T10:00:00.000Z"),
  );

  assert.deepEqual(payload, {
    schema_version: 1,
    event: "cooking_completed",
    timestamp: "2026-07-13T10:00:00.000Z",
    properties: {
      ...context,
      step_number: 5,
      elapsed_seconds: 900,
    },
  });
});

test("product analytics rejects free text, contact data, and unknown properties", () => {
  assert.throws(
    () =>
      buildProductAnalyticsEvent(
        "recipe_search",
        { ...context, email: "person@example.com" } as ProductAnalyticsContext,
      ),
    /context_property_not_allowed:email/,
  );
  assert.throws(
    () =>
      buildProductAnalyticsEvent("recipe_search", {
        ...context,
        anonymous_session_id: "person@example.com",
      }),
    /anonymous_session_id_invalid/,
  );
  assert.throws(
    () =>
      buildProductAnalyticsEvent(
        "cooking_failed",
        context,
        { failure_reason: "전화 010-1234-5678" } as never,
      ),
    /measurement_property_not_allowed:failure_reason/,
  );
});

test("product analytics is disabled and consent-gated by default", async () => {
  let sends = 0;
  const transport = {
    send() {
      sends += 1;
    },
  };

  assert.deepEqual(PRODUCT_ANALYTICS_DEFAULTS, {
    enabled: false,
    consent: "pending",
  });
  assert.deepEqual(
    await emitProductAnalyticsEvent("recipe_viewed", context, {}, { transport }),
    { status: "disabled" },
  );
  assert.deepEqual(
    await emitProductAnalyticsEvent("recipe_viewed", context, {}, {
      enabled: true,
      transport,
    }),
    { status: "consent_required" },
  );
  assert.equal(sends, 0);
});

test("product analytics sends only through an explicit consented transport", async () => {
  const delivered: ProductAnalyticsEvent[] = [];
  const result = await emitProductAnalyticsEvent(
    "missing_ingredients_added",
    context,
    { ingredient_count: 2 },
    {
      enabled: true,
      consent: "granted",
      now: () => new Date("2026-07-13T10:30:00.000Z"),
      transport: {
        send(event) {
          delivered.push(event);
        },
      },
    },
  );

  assert.equal(result.status, "sent");
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].event, "missing_ingredients_added");
  assert.equal(delivered[0].properties.ingredient_count, 2);
});
