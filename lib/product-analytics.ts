// 이 파일은 화면 이벤트를 기존 개인정보 보호 분석 계약에 맞춰 동의 후에만 전달합니다.
'use client'

import {
  emitProductAnalyticsEvent,
  type ProductAnalyticsEventName as CanonicalEventName,
  type ProductAnalyticsConsent,
  PRODUCT_ANALYTICS_EVENT_NAMES,
  PRODUCT_ANALYTICS_FILTER_IDS,
  PRODUCT_ANALYTICS_FAILURE_CODES,
  type ProductAnalyticsMeasurements,
  type ProductAnalyticsScreen,
} from './analytics/product-events.ts'

export type RuntimeProductAnalyticsEventName =
  | CanonicalEventName
  | 'starter_ingredient_selected'
  | 'starter_ingredients_saved'
  | 'recipe_detail_viewed'
  | 'missing_ingredient_added'

type RuntimeProperties = Record<string, unknown>

const PHASE6_TECHNICAL_FIXTURE_RECIPE_ID = '00000000-0000-4000-8000-0000000006e1'
const RECIPE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const PRODUCT_ANALYTICS_CONSENT_STORAGE_KEY = 'jipbab:analytics-consent'

const EVENT_MAPPING: Record<RuntimeProductAnalyticsEventName, CanonicalEventName> = {
  onboarding_viewed: 'onboarding_viewed',
  onboarding_skipped: 'onboarding_skipped',
  onboarding_completed: 'onboarding_completed',
  starter_ingredients_selected: 'starter_ingredients_selected',
  starter_ingredient_selected: 'starter_ingredients_selected',
  starter_ingredients_saved: 'onboarding_completed',
  ingredient_add_started: 'ingredient_add_started',
  ingredient_added: 'ingredient_added',
  ingredient_updated: 'ingredient_updated',
  ingredient_consumed: 'ingredient_consumed',
  ingredient_discarded: 'ingredient_discarded',
  expiry_filter_used: 'expiry_filter_used',
  recommendation_requested: 'recommendation_requested',
  recommendation_result_viewed: 'recommendation_result_viewed',
  recommendation_clicked: 'recommendation_clicked',
  recommendation_empty: 'recommendation_empty',
  recipe_search: 'recipe_search',
  recipe_filter_applied: 'recipe_filter_applied',
  recipe_viewed: 'recipe_viewed',
  recipe_detail_viewed: 'recipe_viewed',
  recipe_favorited: 'recipe_favorited',
  recipe_unfavorited: 'recipe_unfavorited',
  serving_changed: 'serving_changed',
  missing_ingredients_added: 'missing_ingredients_added',
  missing_ingredient_added: 'missing_ingredients_added',
  cooking_started: 'cooking_started',
  cooking_step_viewed: 'cooking_step_viewed',
  cooking_step_completed: 'cooking_step_completed',
  timer_started: 'timer_started',
  timer_paused: 'timer_paused',
  timer_completed: 'timer_completed',
  cooking_abandoned: 'cooking_abandoned',
  cooking_completed: 'cooking_completed',
  cooking_failed: 'cooking_failed',
  shopping_item_added: 'shopping_item_added',
  shopping_item_checked: 'shopping_item_checked',
  shopping_item_moved_to_fridge: 'shopping_item_moved_to_fridge',
}

const SCREEN_MAPPING: Record<RuntimeProductAnalyticsEventName, ProductAnalyticsScreen> = {
  onboarding_viewed: 'onboarding',
  onboarding_skipped: 'onboarding',
  onboarding_completed: 'onboarding',
  starter_ingredients_selected: 'onboarding',
  starter_ingredient_selected: 'onboarding',
  starter_ingredients_saved: 'onboarding',
  ingredient_add_started: 'fridge',
  ingredient_added: 'fridge',
  ingredient_updated: 'fridge',
  ingredient_consumed: 'fridge',
  ingredient_discarded: 'fridge',
  expiry_filter_used: 'fridge',
  recommendation_requested: 'home',
  recommendation_result_viewed: 'home',
  recommendation_clicked: 'home',
  recommendation_empty: 'home',
  recipe_search: 'recipe_list',
  recipe_filter_applied: 'recipe_list',
  recipe_viewed: 'recipe_detail',
  recipe_detail_viewed: 'recipe_detail',
  recipe_favorited: 'recipe_detail',
  recipe_unfavorited: 'recipe_detail',
  serving_changed: 'recipe_detail',
  missing_ingredients_added: 'recipe_detail',
  missing_ingredient_added: 'recipe_detail',
  cooking_started: 'cooking',
  cooking_step_viewed: 'cooking',
  cooking_step_completed: 'cooking',
  timer_started: 'cooking',
  timer_paused: 'cooking',
  timer_completed: 'cooking',
  cooking_abandoned: 'cooking',
  cooking_completed: 'cooking',
  cooking_failed: 'cooking',
  shopping_item_added: 'shopping',
  shopping_item_checked: 'shopping',
  shopping_item_moved_to_fridge: 'shopping',
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | undefined {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : undefined
}

export function isTechnicalFixtureAnalyticsEvent(properties: RuntimeProperties): boolean {
  return properties.isTestFixture === true
    || properties.source === 'technical_fixture'
    || properties.recipeId === PHASE6_TECHNICAL_FIXTURE_RECIPE_ID
}

export function mapRuntimeProductAnalyticsEvent(
  event: RuntimeProductAnalyticsEventName,
  properties: RuntimeProperties,
): {
  event: CanonicalEventName
  screen: ProductAnalyticsScreen
  recipeId?: string
  measurements: ProductAnalyticsMeasurements
} {
  const measurements: ProductAnalyticsMeasurements = {}
  const ingredientCount = boundedInteger(
    properties.ingredientCount ?? properties.selectedCount ?? properties.missingCount,
    0,
    1_000,
  )
  const resultCount = boundedInteger(properties.resultCount, 0, 1_000)
  const stepNumber = boundedInteger(properties.stepIndex, 1, 500)
  const timerSeconds = boundedInteger(properties.durationSeconds, 0, 86_400)
  const elapsedSeconds = boundedInteger(properties.elapsedSeconds, 0, 86_400)
  if (ingredientCount !== undefined) measurements.ingredient_count = ingredientCount
  if (resultCount !== undefined) measurements.result_count = resultCount
  if (stepNumber !== undefined) measurements.step_number = stepNumber
  if (timerSeconds !== undefined) measurements.timer_seconds = timerSeconds
  if (elapsedSeconds !== undefined) measurements.elapsed_seconds = elapsedSeconds
  if (
    typeof properties.filterId === 'string'
    && (PRODUCT_ANALYTICS_FILTER_IDS as readonly string[]).includes(properties.filterId)
  ) {
    measurements.filter_id = properties.filterId as ProductAnalyticsMeasurements['filter_id']
  }
  if (
    typeof properties.failureCode === 'string'
    && (PRODUCT_ANALYTICS_FAILURE_CODES as readonly string[]).includes(properties.failureCode)
  ) {
    measurements.failure_code = properties.failureCode as ProductAnalyticsMeasurements['failure_code']
  }

  const recipeId = typeof properties.recipeId === 'string' && RECIPE_ID_PATTERN.test(properties.recipeId)
    ? properties.recipeId
    : undefined
  return {
    event: EVENT_MAPPING[event],
    screen: SCREEN_MAPPING[event],
    recipeId,
    measurements,
  }
}

export function getProductAnalyticsConsent(): ProductAnalyticsConsent {
  if (typeof window === 'undefined') return 'pending'
  const stored = window.localStorage.getItem(PRODUCT_ANALYTICS_CONSENT_STORAGE_KEY)
  return stored === 'granted' || stored === 'denied' ? stored : 'pending'
}

export function setProductAnalyticsConsent(consent: Exclude<ProductAnalyticsConsent, 'pending'>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCT_ANALYTICS_CONSENT_STORAGE_KEY, consent)
  window.dispatchEvent(new CustomEvent('jipbab:analytics-consent-changed', { detail: { consent } }))
}

export function runtimeAnalyticsCoversCanonicalContract(): boolean {
  return PRODUCT_ANALYTICS_EVENT_NAMES.every((event) => EVENT_MAPPING[event] === event)
}

function runtimePlatform(): 'web' | 'ios' | 'android' {
  const userAgent = window.navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
  if (userAgent.includes('android')) return 'android'
  return 'web'
}

function anonymousSessionId(): string {
  const key = 'jipbab:analytics-session-id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = window.crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

export function trackProductAnalyticsEvent(
  event: RuntimeProductAnalyticsEventName,
  properties: RuntimeProperties = {},
): void {
  if (typeof window === 'undefined') return
  if (isTechnicalFixtureAnalyticsEvent(properties)) return
  if (window.localStorage.getItem('jipbab:e2e-fixture') === 'true') return
  if (process.env.NEXT_PUBLIC_PRODUCT_ANALYTICS_ENABLED !== 'true') return

  const mapped = mapRuntimeProductAnalyticsEvent(event, properties)
  void emitProductAnalyticsEvent(
    mapped.event,
    {
      anonymous_session_id: anonymousSessionId(),
      user_status: 'guest',
      screen: mapped.screen,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
      platform: runtimePlatform(),
      deployment_sha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'unknown',
      ...(mapped.recipeId ? { recipe_id: mapped.recipeId } : {}),
    },
    mapped.measurements,
    {
      enabled: true,
      consent: getProductAnalyticsConsent(),
      transport: {
        send(payload) {
          window.dispatchEvent(new CustomEvent('jipbab:analytics', { detail: payload }))
        },
      },
    },
  )
}
