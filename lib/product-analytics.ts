// 이 파일은 화면 이벤트를 기존 개인정보 보호 분석 계약에 맞춰 동의 후에만 전달합니다.
'use client'

import {
  emitProductAnalyticsEvent,
  type ProductAnalyticsEventName as CanonicalEventName,
  type ProductAnalyticsMeasurements,
  type ProductAnalyticsScreen,
} from './analytics/product-events.ts'

export type RuntimeProductAnalyticsEventName =
  | 'starter_ingredient_selected'
  | 'starter_ingredients_saved'
  | 'recommendation_requested'
  | 'recommendation_result_viewed'
  | 'recipe_detail_viewed'
  | 'missing_ingredient_added'
  | 'cooking_started'
  | 'timer_started'
  | 'cooking_step_completed'
  | 'cooking_completed'
  | 'cooking_abandoned'

type RuntimeProperties = Record<string, unknown>

const EVENT_MAPPING: Record<RuntimeProductAnalyticsEventName, CanonicalEventName> = {
  starter_ingredient_selected: 'starter_ingredients_selected',
  starter_ingredients_saved: 'onboarding_completed',
  recommendation_requested: 'recommendation_requested',
  recommendation_result_viewed: 'recommendation_result_viewed',
  recipe_detail_viewed: 'recipe_viewed',
  missing_ingredient_added: 'missing_ingredients_added',
  cooking_started: 'cooking_started',
  timer_started: 'timer_started',
  cooking_step_completed: 'cooking_step_completed',
  cooking_completed: 'cooking_completed',
  cooking_abandoned: 'cooking_abandoned',
}

const SCREEN_MAPPING: Record<RuntimeProductAnalyticsEventName, ProductAnalyticsScreen> = {
  starter_ingredient_selected: 'onboarding',
  starter_ingredients_saved: 'onboarding',
  recommendation_requested: 'home',
  recommendation_result_viewed: 'home',
  recipe_detail_viewed: 'recipe_detail',
  missing_ingredient_added: 'recipe_detail',
  cooking_started: 'cooking',
  timer_started: 'cooking',
  cooking_step_completed: 'cooking',
  cooking_completed: 'cooking',
  cooking_abandoned: 'cooking',
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | undefined {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : undefined
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
  if (ingredientCount !== undefined) measurements.ingredient_count = ingredientCount
  if (resultCount !== undefined) measurements.result_count = resultCount
  if (stepNumber !== undefined) measurements.step_number = stepNumber
  if (timerSeconds !== undefined) measurements.timer_seconds = timerSeconds

  const recipeId = typeof properties.recipeId === 'string' ? properties.recipeId : undefined
  return {
    event: EVENT_MAPPING[event],
    screen: SCREEN_MAPPING[event],
    recipeId,
    measurements,
  }
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
      consent: window.localStorage.getItem('jipbab:analytics-consent') === 'granted'
        ? 'granted'
        : 'pending',
      transport: {
        send(payload) {
          window.dispatchEvent(new CustomEvent('jipbab:analytics', { detail: payload }))
        },
      },
    },
  )
}
