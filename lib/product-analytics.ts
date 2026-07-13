// 이 파일은 개인정보 없이 핵심 제품 퍼널 이벤트를 일관된 형식으로 전달합니다.
export const PRODUCT_ANALYTICS_EVENTS = [
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
] as const;

export type ProductAnalyticsEventName = (typeof PRODUCT_ANALYTICS_EVENTS)[number];
export type ProductAnalyticsValue = string | number | boolean | null;

const ALLOWED_PROPERTY_KEYS = new Set([
  "recipeId",
  "ingredientCount",
  "selectedCount",
  "missingCount",
  "resultCount",
  "stepIndex",
  "durationSeconds",
  "scope",
  "source",
]);

export type ProductAnalyticsEvent = {
  event: ProductAnalyticsEventName;
  timestamp: string;
  properties: Record<string, ProductAnalyticsValue>;
};

export function buildProductAnalyticsEvent(
  event: ProductAnalyticsEventName,
  properties: Record<string, unknown> = {},
): ProductAnalyticsEvent {
  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => (
      ALLOWED_PROPERTY_KEYS.has(key)
      && (value === null || ["string", "number", "boolean"].includes(typeof value))
    )),
  ) as Record<string, ProductAnalyticsValue>;
  return { event, timestamp: new Date().toISOString(), properties: safeProperties };
}

export function trackProductAnalyticsEvent(
  event: ProductAnalyticsEventName,
  properties: Record<string, unknown> = {},
): ProductAnalyticsEvent {
  const payload = buildProductAnalyticsEvent(event, properties);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("jipbab:analytics", { detail: payload }));
  }
  return payload;
}
