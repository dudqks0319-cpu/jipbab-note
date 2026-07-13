import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_ANALYTICS_CONSENT_STORAGE_KEY,
  getProductAnalyticsConsent,
  isTechnicalFixtureAnalyticsEvent,
  mapRuntimeProductAnalyticsEvent,
  runtimeAnalyticsCoversCanonicalContract,
  setProductAnalyticsConsent,
} from "../lib/product-analytics.ts";
import { readFileSync } from "node:fs";

test("runtime analytics maps UI events into the canonical privacy-safe contract", () => {
  assert.deepEqual(
    mapRuntimeProductAnalyticsEvent("timer_started", {
      recipeId: "00000000-0000-4000-8000-000000000101",
      stepIndex: 2,
      durationSeconds: 90,
      email: "must-not-pass@example.com",
    }),
    {
      event: "timer_started",
      screen: "cooking",
      recipeId: "00000000-0000-4000-8000-000000000101",
      measurements: { step_number: 2, timer_seconds: 90 },
    },
  );
});

test("runtime analytics excludes technical fixture events regardless of browser storage", () => {
  assert.equal(isTechnicalFixtureAnalyticsEvent({ isTestFixture: true }), true);
  assert.equal(isTechnicalFixtureAnalyticsEvent({ source: "technical_fixture" }), true);
  assert.equal(
    isTechnicalFixtureAnalyticsEvent({ recipeId: "00000000-0000-4000-8000-0000000006e1" }),
    true,
  );
  assert.equal(
    isTechnicalFixtureAnalyticsEvent({ recipeId: "00000000-0000-4000-8000-000000000101" }),
    false,
  );
});

test("runtime analytics maps all 33 canonical events and drops unsafe recipe IDs", () => {
  assert.equal(runtimeAnalyticsCoversCanonicalContract(), true);
  assert.deepEqual(
    mapRuntimeProductAnalyticsEvent("recipe_favorited", {
      recipeId: "beginner-recipe-001",
      filterId: "free_text",
      failureCode: "raw failure text",
    }),
    {
      event: "recipe_favorited",
      screen: "recipe_detail",
      recipeId: undefined,
      measurements: {},
    },
  );
});

test("analytics consent is pending by default and can be revoked", () => {
  const values = new Map<string, string>();
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem(key: string) { return values.get(key) ?? null; },
        setItem(key: string, value: string) { values.set(key, value); },
      },
      dispatchEvent() { return true; },
    },
  });
  try {
    assert.equal(getProductAnalyticsConsent(), "pending");
    setProductAnalyticsConsent("granted");
    assert.equal(values.get(PRODUCT_ANALYTICS_CONSENT_STORAGE_KEY), "granted");
    setProductAnalyticsConsent("denied");
    assert.equal(getProductAnalyticsConsent(), "denied");
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
  }
});

test("settings exposes optional analytics consent and withdrawal controls", () => {
  const settingsPage = readFileSync("app/settings/page.tsx", "utf8");
  assert.match(settingsPage, /익명 분석 허용/);
  assert.match(settingsPage, /거부·동의 철회/);
  assert.match(settingsPage, /레시피 제목, 자유 입력, 이메일, 전화번호는 수집하지 않으며/);
  assert.match(settingsPage, /승인된 외부 분석 벤더가 없어/);
});

test("product analytics events are wired to real product interactions", () => {
  const sources = [
    "app/fridge/page.tsx",
    "app/recipe/page.tsx",
    "app/shopping/page.tsx",
    "components/home/StarterActionCard.tsx",
    "components/home/TodayActionCard.tsx",
    "components/recipe/RecipeCookMode.tsx",
    "components/recipe/RecipeFavoriteButton.tsx",
    "components/recipe/RecipeIngredientList.tsx",
    "components/recipe/RecipeShoppingAssistant.tsx",
  ].map((file) => readFileSync(file, "utf8")).join("\n");

  for (const event of [
    "onboarding_viewed",
    "ingredient_added",
    "recommendation_clicked",
    "recipe_search",
    "recipe_favorited",
    "serving_changed",
    "missing_ingredient_added",
    "cooking_step_viewed",
    "timer_paused",
    "timer_completed",
    "shopping_item_checked",
    "shopping_item_moved_to_fridge",
  ]) {
    assert.match(sources, new RegExp(`trackProductAnalyticsEvent\\(['\"]${event}['\"]`), event);
  }
});
