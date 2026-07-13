import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_ANALYTICS_EVENTS,
  buildProductAnalyticsEvent,
} from "../lib/product-analytics.ts";

test("product analytics contract includes the Phase 6 core funnel", () => {
  assert.deepEqual(PRODUCT_ANALYTICS_EVENTS, [
    "starter_ingredient_selected",
    "starter_ingredients_saved",
    "recommendation_requested",
    "recommendation_result_viewed",
    "recipe_detail_viewed",
    "missing_ingredient_added",
    "cooking_started",
    "timer_started",
    "cooking_step_completed",
    "cooking_completed",
    "cooking_abandoned",
    "affiliate_link_clicked",
  ]);
});

test("product analytics drops sensitive and free-form metadata", () => {
  const event = buildProductAnalyticsEvent("cooking_started", {
    recipeId: "recipe-1",
    ingredientCount: 3,
    email: "person@example.com",
    note: "free-form text",
  });

  assert.deepEqual(event.properties, {
    recipeId: "recipe-1",
    ingredientCount: 3,
  });
  assert.match(event.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
