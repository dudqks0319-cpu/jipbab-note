export const PRODUCT_ANALYTICS_EVENT_NAMES = [
  "onboarding_viewed",
  "onboarding_skipped",
  "onboarding_completed",
  "starter_ingredients_selected",
  "ingredient_add_started",
  "ingredient_added",
  "ingredient_updated",
  "ingredient_consumed",
  "ingredient_discarded",
  "expiry_filter_used",
  "recommendation_requested",
  "recommendation_result_viewed",
  "recommendation_clicked",
  "recommendation_empty",
  "recipe_search",
  "recipe_filter_applied",
  "recipe_viewed",
  "recipe_favorited",
  "recipe_unfavorited",
  "serving_changed",
  "missing_ingredients_added",
  "cooking_started",
  "cooking_step_viewed",
  "cooking_step_completed",
  "timer_started",
  "timer_paused",
  "timer_completed",
  "cooking_abandoned",
  "cooking_completed",
  "cooking_failed",
  "shopping_item_added",
  "shopping_item_checked",
  "shopping_item_moved_to_fridge",
] as const;

export const PRODUCT_ANALYTICS_SCREENS = [
  "onboarding",
  "home",
  "fridge",
  "recipe_list",
  "recipe_detail",
  "cooking",
  "shopping",
  "family",
  "settings",
] as const;

export const PRODUCT_ANALYTICS_FILTER_IDS = [
  "category",
  "difficulty",
  "time",
  "tools",
  "fridge_fit",
  "beginner",
  "sort",
] as const;

export const PRODUCT_ANALYTICS_FAILURE_CODES = [
  "instruction_unclear",
  "ingredient_missing",
  "time_mismatch",
  "heat_control",
  "safety_concern",
  "app_error",
  "other_selected",
] as const;

export type ProductAnalyticsEventName = (typeof PRODUCT_ANALYTICS_EVENT_NAMES)[number];
export type ProductAnalyticsScreen = (typeof PRODUCT_ANALYTICS_SCREENS)[number];
export type ProductAnalyticsFilterId = (typeof PRODUCT_ANALYTICS_FILTER_IDS)[number];
export type ProductAnalyticsFailureCode = (typeof PRODUCT_ANALYTICS_FAILURE_CODES)[number];
export type ProductAnalyticsConsent = "pending" | "denied" | "granted";

export type ProductAnalyticsContext = {
  anonymous_session_id: string;
  user_status: "guest" | "authenticated";
  screen: ProductAnalyticsScreen;
  app_version: string;
  platform: "web" | "ios" | "android";
  deployment_sha: string;
  recipe_id?: string;
  recipe_version?: number;
  experiment_id?: string;
};

export type ProductAnalyticsMeasurements = {
  ingredient_count?: number;
  result_count?: number;
  step_number?: number;
  timer_seconds?: number;
  elapsed_seconds?: number;
  filter_id?: ProductAnalyticsFilterId;
  failure_code?: ProductAnalyticsFailureCode;
};

export type ProductAnalyticsEvent = {
  schema_version: 1;
  event: ProductAnalyticsEventName;
  timestamp: string;
  properties: ProductAnalyticsContext & ProductAnalyticsMeasurements;
};

export type ProductAnalyticsTransport = {
  send: (event: ProductAnalyticsEvent) => void | Promise<void>;
};

export const PRODUCT_ANALYTICS_DEFAULTS = Object.freeze({
  enabled: false,
  consent: "pending" as ProductAnalyticsConsent,
});

const CONTEXT_KEYS = new Set<keyof ProductAnalyticsContext>([
  "anonymous_session_id",
  "user_status",
  "screen",
  "app_version",
  "platform",
  "deployment_sha",
  "recipe_id",
  "recipe_version",
  "experiment_id",
]);

const MEASUREMENT_KEYS = new Set<keyof ProductAnalyticsMeasurements>([
  "ingredient_count",
  "result_count",
  "step_number",
  "timer_seconds",
  "elapsed_seconds",
  "filter_id",
  "failure_code",
]);

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEPLOYMENT_SHA_PATTERN = /^(?:unknown|[a-f0-9]{7,64})$/i;
const APP_VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._-]{0,31}$/;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?82[- ]?)?0?1[016789][- ]?\d{3,4}[- ]?\d{4}/;

function assertAllowedKeys(value: object, allowed: ReadonlySet<string>, label: string): void {
  const rejected = Object.keys(value).find((key) => !allowed.has(key));
  if (rejected) {
    throw new Error(`${label}_property_not_allowed:${rejected}`);
  }
}

function assertOpaqueId(value: string, label: string, minimum: number, maximum: number): void {
  if (
    value.length < minimum ||
    value.length > maximum ||
    !OPAQUE_ID_PATTERN.test(value) ||
    EMAIL_PATTERN.test(value) ||
    PHONE_PATTERN.test(value)
  ) {
    throw new Error(`${label}_invalid`);
  }
}

function assertBoundedInteger(
  value: number | undefined,
  label: string,
  minimum: number,
  maximum: number,
): void {
  if (value === undefined) {
    return;
  }
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label}_invalid`);
  }
}

function validateContext(context: ProductAnalyticsContext): void {
  assertAllowedKeys(context, CONTEXT_KEYS, "context");
  assertOpaqueId(context.anonymous_session_id, "anonymous_session_id", 16, 128);
  if (context.user_status !== "guest" && context.user_status !== "authenticated") {
    throw new Error("user_status_invalid");
  }
  if (!PRODUCT_ANALYTICS_SCREENS.includes(context.screen)) {
    throw new Error("screen_invalid");
  }
  if (!APP_VERSION_PATTERN.test(context.app_version)) {
    throw new Error("app_version_invalid");
  }
  if (!(["web", "ios", "android"] as const).includes(context.platform)) {
    throw new Error("platform_invalid");
  }
  if (!DEPLOYMENT_SHA_PATTERN.test(context.deployment_sha)) {
    throw new Error("deployment_sha_invalid");
  }
  if (context.recipe_id !== undefined && !UUID_PATTERN.test(context.recipe_id)) {
    throw new Error("recipe_id_invalid");
  }
  assertBoundedInteger(context.recipe_version, "recipe_version", 1, 1_000_000);
  if (context.experiment_id !== undefined) {
    assertOpaqueId(context.experiment_id, "experiment_id", 1, 64);
  }
}

function validateMeasurements(measurements: ProductAnalyticsMeasurements): void {
  assertAllowedKeys(measurements, MEASUREMENT_KEYS, "measurement");
  assertBoundedInteger(measurements.ingredient_count, "ingredient_count", 0, 1_000);
  assertBoundedInteger(measurements.result_count, "result_count", 0, 1_000);
  assertBoundedInteger(measurements.step_number, "step_number", 1, 500);
  assertBoundedInteger(measurements.timer_seconds, "timer_seconds", 0, 86_400);
  assertBoundedInteger(measurements.elapsed_seconds, "elapsed_seconds", 0, 86_400);
  if (
    measurements.filter_id !== undefined &&
    !PRODUCT_ANALYTICS_FILTER_IDS.includes(measurements.filter_id)
  ) {
    throw new Error("filter_id_invalid");
  }
  if (
    measurements.failure_code !== undefined &&
    !PRODUCT_ANALYTICS_FAILURE_CODES.includes(measurements.failure_code)
  ) {
    throw new Error("failure_code_invalid");
  }
}

export function buildProductAnalyticsEvent(
  event: ProductAnalyticsEventName,
  context: ProductAnalyticsContext,
  measurements: ProductAnalyticsMeasurements = {},
  now: () => Date = () => new Date(),
): ProductAnalyticsEvent {
  if (!PRODUCT_ANALYTICS_EVENT_NAMES.includes(event)) {
    throw new Error("event_not_allowed");
  }
  validateContext(context);
  validateMeasurements(measurements);

  return {
    schema_version: 1,
    event,
    timestamp: now().toISOString(),
    properties: {
      ...context,
      ...measurements,
    },
  };
}

type EmitProductAnalyticsOptions = {
  enabled?: boolean;
  consent?: ProductAnalyticsConsent;
  transport?: ProductAnalyticsTransport;
  now?: () => Date;
};

export async function emitProductAnalyticsEvent(
  event: ProductAnalyticsEventName,
  context: ProductAnalyticsContext,
  measurements: ProductAnalyticsMeasurements = {},
  options: EmitProductAnalyticsOptions = {},
): Promise<
  | { status: "disabled" | "consent_required" | "transport_unavailable" | "delivery_failed" }
  | { status: "sent"; payload: ProductAnalyticsEvent }
> {
  if (options.enabled !== true) {
    return { status: "disabled" };
  }
  if (options.consent !== "granted") {
    return { status: "consent_required" };
  }
  if (!options.transport) {
    return { status: "transport_unavailable" };
  }

  const payload = buildProductAnalyticsEvent(event, context, measurements, options.now);
  try {
    await options.transport.send(payload);
    return { status: "sent", payload };
  } catch {
    return { status: "delivery_failed" };
  }
}
