import {
  PRODUCT_ANALYTICS_FAILURE_CODES,
  parseProductAnalyticsEvent,
  type ProductAnalyticsEvent,
  type ProductAnalyticsFailureCode,
} from "./product-events.ts";
import {
  API_OPERATION_ENDPOINTS,
  type ApiOperationEndpoint,
  type ApiOperationMetadata,
} from "../operational-telemetry.ts";

const OPERATIONAL_EVENT_KEYS = new Set(["event", "level", "timestamp", "metadata"]);
const OPERATIONAL_METADATA_KEYS = new Set([
  "request_id",
  "endpoint",
  "status",
  "latency_ms",
  "error_code",
  "deployment_sha",
]);
const API_ERROR_CODES = new Set([
  "INVALID_QUERY",
  "INVALID_BODY",
  "INVALID_FILTER",
  "INVALID_CURSOR",
  "INVALID_LIMIT",
  "NOT_FOUND",
  "RATE_LIMITED",
  "DEPENDENCY_NOT_READY",
  "INTERNAL_ERROR",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEPLOYMENT_SHA_PATTERN = /^(?:unknown|[a-f0-9]{7,64})$/i;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

type JsonRecord = Record<string, unknown>;

export type OperationalAnalyticsEvent = {
  event: "api.request_completed";
  level: "debug" | "info" | "warn" | "error";
  timestamp: string;
  metadata: ApiOperationMetadata;
};

export type FunnelMetric = {
  key:
    | "new_users"
    | "first_ingredient"
    | "first_recommendation"
    | "recipe_detail"
    | "cooking_started"
    | "cooking_completed";
  label: string;
  sessions: number;
  rate_from_new_users_pct: number | null;
  rate_from_previous_stage_pct: number | null;
};

export type RecipeQualityMetric = {
  recipe_id: string;
  recipe_version: number | null;
  starts: number;
  completes: number;
  completion_rate_pct: number | null;
  abandons: number;
  abandonment_rate_pct: number | null;
  failures: number;
  failure_rate_pct: number | null;
  failure_codes: Partial<Record<ProductAnalyticsFailureCode, number>>;
  top_abandonment_step: number | null;
  median_elapsed_seconds: number | null;
  p95_elapsed_seconds: number | null;
  recipe_view_sessions: number;
  shopping_add_sessions: number;
  shopping_add_rate_pct: number | null;
  sample_status: "insufficient" | "reviewable";
  review_rank: number;
};

export type OperationalMetric = {
  endpoint: ApiOperationEndpoint | "all";
  request_count: number;
  client_error_rate_pct: number | null;
  server_error_rate_pct: number | null;
  p50_latency_ms: number | null;
  p95_latency_ms: number | null;
  error_codes: Record<string, number>;
};

export type Phase6AnalyticsDashboardReport = {
  schema_version: 1;
  generated_at: string;
  data_state: "empty" | "partial" | "ready";
  source: {
    product_event_count: number;
    operational_event_count: number;
    unique_session_count: number;
    first_event_at: string | null;
    last_event_at: string | null;
    deployment_shas: string[];
    caveat: "privacy_safe_local_evidence_not_live_product_analytics";
  };
  product: {
    new_users: number;
    active_users: number;
    funnel: FunnelMetric[];
    seven_day_returning_sessions: number;
    seven_day_return_rate_pct: number | null;
  };
  recipes: RecipeQualityMetric[];
  operations: {
    overall: OperationalMetric;
    endpoints: OperationalMetric[];
    instrumentation_gaps: string[];
  };
  data_quality: {
    missing_coverage: string[];
    product_events_without_recipe_id: number;
    orphan_cooking_outcomes: number;
    overlapping_cooking_starts: number;
    open_cooking_attempts: number;
  };
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(value: JsonRecord, allowed: ReadonlySet<string>, label: string) {
  const rejected = Object.keys(value).find((key) => !allowed.has(key));
  if (rejected) {
    throw new Error(`${label}_property_not_allowed:${rejected}`);
  }
}

function assertCanonicalTimestamp(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("timestamp_invalid");
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("timestamp_invalid");
  }
}

export function parseOperationalAnalyticsEvent(value: unknown): OperationalAnalyticsEvent {
  if (!isRecord(value)) {
    throw new Error("operational_event_invalid");
  }
  assertAllowedKeys(value, OPERATIONAL_EVENT_KEYS, "operational_event");
  if (value.event !== "api.request_completed") {
    throw new Error("operational_event_not_allowed");
  }
  if (!(typeof value.level === "string" && ["debug", "info", "warn", "error"].includes(value.level))) {
    throw new Error("operational_level_invalid");
  }
  assertCanonicalTimestamp(value.timestamp);
  if (!isRecord(value.metadata)) {
    throw new Error("operational_metadata_invalid");
  }
  const metadata = value.metadata;
  assertAllowedKeys(metadata, OPERATIONAL_METADATA_KEYS, "operational_metadata");
  if (typeof metadata.request_id !== "string" || !UUID_PATTERN.test(metadata.request_id)) {
    throw new Error("request_id_invalid");
  }
  if (
    typeof metadata.endpoint !== "string" ||
    !(API_OPERATION_ENDPOINTS as readonly string[]).includes(metadata.endpoint)
  ) {
    throw new Error("endpoint_invalid");
  }
  if (!Number.isInteger(metadata.status) || Number(metadata.status) < 100 || Number(metadata.status) > 599) {
    throw new Error("status_invalid");
  }
  if (
    !Number.isInteger(metadata.latency_ms) ||
    Number(metadata.latency_ms) < 0 ||
    Number(metadata.latency_ms) > DAY_MILLISECONDS
  ) {
    throw new Error("latency_ms_invalid");
  }
  if (
    metadata.error_code !== undefined &&
    (typeof metadata.error_code !== "string" || !API_ERROR_CODES.has(metadata.error_code))
  ) {
    throw new Error("error_code_invalid");
  }
  if (
    typeof metadata.deployment_sha !== "string" ||
    !DEPLOYMENT_SHA_PATTERN.test(metadata.deployment_sha)
  ) {
    throw new Error("deployment_sha_invalid");
  }

  return {
    event: "api.request_completed",
    level: value.level as OperationalAnalyticsEvent["level"],
    timestamp: value.timestamp,
    metadata: {
      request_id: metadata.request_id,
      endpoint: metadata.endpoint as ApiOperationEndpoint,
      status: Number(metadata.status),
      latency_ms: Number(metadata.latency_ms),
      ...(metadata.error_code
        ? { error_code: metadata.error_code as ApiOperationMetadata["error_code"] }
        : {}),
      deployment_sha: metadata.deployment_sha.toLowerCase(),
    },
  };
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1_000) / 10;
}

function percentile(values: number[], quantile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
}

function timestampRange(productEvents: ProductAnalyticsEvent[], operationalEvents: OperationalAnalyticsEvent[]) {
  const timestamps = [...productEvents, ...operationalEvents]
    .map((event) => event.timestamp)
    .sort();
  return {
    first: timestamps[0] ?? null,
    last: timestamps.at(-1) ?? null,
  };
}

const FUNNEL_STAGES = [
  { key: "new_users", label: "신규 사용자", event: "onboarding_viewed" },
  { key: "first_ingredient", label: "첫 재료 등록", event: "ingredient_added" },
  { key: "first_recommendation", label: "첫 추천 확인", event: "recommendation_result_viewed" },
  { key: "recipe_detail", label: "레시피 상세 진입", event: "recipe_viewed" },
  { key: "cooking_started", label: "조리 시작", event: "cooking_started" },
  { key: "cooking_completed", label: "조리 완료", event: "cooking_completed" },
] as const;

function buildProductMetrics(events: ProductAnalyticsEvent[]) {
  const bySession = new Map<string, ProductAnalyticsEvent[]>();
  for (const event of events) {
    const sessionId = event.properties.anonymous_session_id;
    bySession.set(sessionId, [...(bySession.get(sessionId) ?? []), event]);
  }
  for (const sessionEvents of bySession.values()) {
    sessionEvents.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  }

  const stageCounts = new Map(FUNNEL_STAGES.map((stage) => [stage.key, 0]));
  let returningSessions = 0;
  for (const sessionEvents of bySession.values()) {
    const onboardingIndex = sessionEvents.findIndex((event) => event.event === "onboarding_viewed");
    if (onboardingIndex < 0) continue;
    stageCounts.set("new_users", (stageCounts.get("new_users") ?? 0) + 1);
    let cursor = onboardingIndex;
    for (const stage of FUNNEL_STAGES.slice(1)) {
      const relativeIndex = sessionEvents
        .slice(cursor + 1)
        .findIndex((event) => event.event === stage.event);
      if (relativeIndex < 0) break;
      cursor += relativeIndex + 1;
      stageCounts.set(stage.key, (stageCounts.get(stage.key) ?? 0) + 1);
    }

    const cohortStartedAt = Date.parse(sessionEvents[onboardingIndex].timestamp);
    if (
      sessionEvents.some((event) => {
        const elapsed = Date.parse(event.timestamp) - cohortStartedAt;
        return elapsed >= 7 * DAY_MILLISECONDS && elapsed < 8 * DAY_MILLISECONDS;
      })
    ) {
      returningSessions += 1;
    }
  }

  const newUsers = stageCounts.get("new_users") ?? 0;
  const funnel = FUNNEL_STAGES.map((stage, index): FunnelMetric => {
    const sessions = stageCounts.get(stage.key) ?? 0;
    const previousSessions =
      index === 0 ? sessions : (stageCounts.get(FUNNEL_STAGES[index - 1].key) ?? 0);
    return {
      key: stage.key,
      label: stage.label,
      sessions,
      rate_from_new_users_pct: rate(sessions, newUsers),
      rate_from_previous_stage_pct: index === 0 ? null : rate(sessions, previousSessions),
    };
  });

  return {
    newUsers,
    activeUsers: bySession.size,
    funnel,
    returningSessions,
    returnRate: rate(returningSessions, newUsers),
  };
}

type RecipeAccumulator = {
  recipe_id: string;
  recipe_version: number | null;
  starts: number;
  completes: number;
  abandons: number;
  failures: number;
  elapsed: number[];
  abandonmentSteps: Map<number, number>;
  failureCodes: Map<ProductAnalyticsFailureCode, number>;
  viewSessions: Set<string>;
  shoppingSessions: Set<string>;
};

type CookingAttempt = {
  recipeKey: string;
  lastStep: number | null;
};

function buildRecipeMetrics(events: ProductAnalyticsEvent[]) {
  const accumulators = new Map<string, RecipeAccumulator>();
  const attempts = new Map<string, CookingAttempt>();
  let eventsWithoutRecipeId = 0;
  let orphanOutcomes = 0;
  let overlappingStarts = 0;

  function recipeFor(event: ProductAnalyticsEvent): RecipeAccumulator | null {
    const recipeId = event.properties.recipe_id;
    if (!recipeId) return null;
    const recipeVersion = event.properties.recipe_version ?? null;
    const key = `${recipeId}@${recipeVersion ?? "unknown"}`;
    const current = accumulators.get(key) ?? {
      recipe_id: recipeId,
      recipe_version: recipeVersion,
      starts: 0,
      completes: 0,
      abandons: 0,
      failures: 0,
      elapsed: [],
      abandonmentSteps: new Map<number, number>(),
      failureCodes: new Map<ProductAnalyticsFailureCode, number>(),
      viewSessions: new Set<string>(),
      shoppingSessions: new Set<string>(),
    };
    accumulators.set(key, current);
    return current;
  }

  const sorted = [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  for (const event of sorted) {
    const recipe = recipeFor(event);
    const recipeScoped =
      event.event === "recipe_viewed" ||
      event.event === "missing_ingredients_added" ||
      event.event.startsWith("cooking_") ||
      event.event.startsWith("timer_");
    if (!recipe && recipeScoped) {
      eventsWithoutRecipeId += 1;
      continue;
    }
    if (!recipe) continue;

    const sessionId = event.properties.anonymous_session_id;
    const recipeKey = `${recipe.recipe_id}@${recipe.recipe_version ?? "unknown"}`;
    const attemptKey = `${sessionId}:${recipeKey}`;
    if (event.event === "recipe_viewed") recipe.viewSessions.add(sessionId);
    if (event.event === "missing_ingredients_added") recipe.shoppingSessions.add(sessionId);

    if (event.event === "cooking_started") {
      if (attempts.has(attemptKey)) overlappingStarts += 1;
      recipe.starts += 1;
      attempts.set(attemptKey, { recipeKey, lastStep: event.properties.step_number ?? null });
      continue;
    }

    const attempt = attempts.get(attemptKey);
    if (event.event === "cooking_step_viewed" && attempt) {
      attempt.lastStep = event.properties.step_number ?? attempt.lastStep;
      continue;
    }
    if (!["cooking_completed", "cooking_abandoned", "cooking_failed"].includes(event.event)) {
      continue;
    }
    if (!attempt) {
      orphanOutcomes += 1;
      continue;
    }

    if (event.event === "cooking_completed") {
      recipe.completes += 1;
      if (event.properties.elapsed_seconds !== undefined) {
        recipe.elapsed.push(event.properties.elapsed_seconds);
      }
    } else if (event.event === "cooking_abandoned") {
      recipe.abandons += 1;
      const step = event.properties.step_number ?? attempt.lastStep;
      if (step !== null) {
        recipe.abandonmentSteps.set(step, (recipe.abandonmentSteps.get(step) ?? 0) + 1);
      }
    } else {
      recipe.failures += 1;
      const code = event.properties.failure_code;
      if (code) recipe.failureCodes.set(code, (recipe.failureCodes.get(code) ?? 0) + 1);
    }
    attempts.delete(attemptKey);
  }

  const metrics = [...accumulators.values()].map((recipe) => {
    const topAbandonmentStep = [...recipe.abandonmentSteps.entries()].sort(
      ([leftStep, leftCount], [rightStep, rightCount]) =>
        rightCount - leftCount || leftStep - rightStep,
    )[0]?.[0] ?? null;
    const failureCodes = Object.fromEntries(
      PRODUCT_ANALYTICS_FAILURE_CODES.flatMap((code) => {
        const count = recipe.failureCodes.get(code) ?? 0;
        return count > 0 ? [[code, count]] : [];
      }),
    );
    return {
      recipe_id: recipe.recipe_id,
      recipe_version: recipe.recipe_version,
      starts: recipe.starts,
      completes: recipe.completes,
      completion_rate_pct: rate(recipe.completes, recipe.starts),
      abandons: recipe.abandons,
      abandonment_rate_pct: rate(recipe.abandons, recipe.starts),
      failures: recipe.failures,
      failure_rate_pct: rate(recipe.failures, recipe.starts),
      failure_codes: failureCodes,
      top_abandonment_step: topAbandonmentStep,
      median_elapsed_seconds: percentile(recipe.elapsed, 0.5),
      p95_elapsed_seconds: percentile(recipe.elapsed, 0.95),
      recipe_view_sessions: recipe.viewSessions.size,
      shopping_add_sessions: recipe.shoppingSessions.size,
      shopping_add_rate_pct: rate(recipe.shoppingSessions.size, recipe.viewSessions.size),
      sample_status: recipe.starts < 5 ? "insufficient" : "reviewable",
      review_rank: 0,
    } satisfies RecipeQualityMetric;
  });

  metrics.sort((left, right) => {
    const leftSafety = left.failure_codes.safety_concern ?? 0;
    const rightSafety = right.failure_codes.safety_concern ?? 0;
    return (
      rightSafety - leftSafety ||
      (right.failure_rate_pct ?? -1) - (left.failure_rate_pct ?? -1) ||
      (right.abandonment_rate_pct ?? -1) - (left.abandonment_rate_pct ?? -1) ||
      right.starts - left.starts ||
      left.recipe_id.localeCompare(right.recipe_id)
    );
  });
  metrics.forEach((metric, index) => {
    metric.review_rank = index + 1;
  });

  return {
    metrics,
    eventsWithoutRecipeId,
    orphanOutcomes,
    overlappingStarts,
    openAttempts: attempts.size,
  };
}

function operationalMetric(
  endpoint: OperationalMetric["endpoint"],
  events: OperationalAnalyticsEvent[],
): OperationalMetric {
  const clientErrors = events.filter((event) => event.metadata.status >= 400 && event.metadata.status < 500);
  const serverErrors = events.filter((event) => event.metadata.status >= 500);
  const errorCodes = new Map<string, number>();
  for (const event of events) {
    if (event.metadata.error_code) {
      errorCodes.set(event.metadata.error_code, (errorCodes.get(event.metadata.error_code) ?? 0) + 1);
    }
  }
  const latencies = events.map((event) => event.metadata.latency_ms);
  return {
    endpoint,
    request_count: events.length,
    client_error_rate_pct: rate(clientErrors.length, events.length),
    server_error_rate_pct: rate(serverErrors.length, events.length),
    p50_latency_ms: percentile(latencies, 0.5),
    p95_latency_ms: percentile(latencies, 0.95),
    error_codes: Object.fromEntries([...errorCodes.entries()].sort(([left], [right]) => left.localeCompare(right))),
  };
}

export function buildPhase6AnalyticsDashboardReport(input: {
  productEvents?: readonly ProductAnalyticsEvent[];
  operationalEvents?: readonly OperationalAnalyticsEvent[];
  generatedAt?: string;
}): Phase6AnalyticsDashboardReport {
  const productEvents = (input.productEvents ?? []).map((event) => parseProductAnalyticsEvent(event));
  const operationalEvents = (input.operationalEvents ?? []).map((event) =>
    parseOperationalAnalyticsEvent(event),
  );
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  assertCanonicalTimestamp(generatedAt);

  const product = buildProductMetrics(productEvents);
  const recipes = buildRecipeMetrics(productEvents);
  const range = timestampRange(productEvents, operationalEvents);
  const deployments = new Set<string>();
  for (const event of productEvents) deployments.add(event.properties.deployment_sha.toLowerCase());
  for (const event of operationalEvents) deployments.add(event.metadata.deployment_sha.toLowerCase());

  const coverage = [
    [product.newUsers > 0, "new_user_cohort"],
    [(product.funnel.find((stage) => stage.key === "first_ingredient")?.sessions ?? 0) > 0, "first_ingredient"],
    [(product.funnel.find((stage) => stage.key === "first_recommendation")?.sessions ?? 0) > 0, "first_recommendation"],
    [(product.funnel.find((stage) => stage.key === "recipe_detail")?.sessions ?? 0) > 0, "recipe_detail"],
    [recipes.metrics.some((recipe) => recipe.starts > 0), "cooking_started"],
    [recipes.metrics.some((recipe) => recipe.completes > 0), "cooking_completed"],
    [operationalEvents.length > 0, "operational_requests"],
  ] as const;
  const missingCoverage = coverage.filter(([covered]) => !covered).map(([, key]) => key);
  const eventCount = productEvents.length + operationalEvents.length;

  return {
    schema_version: 1,
    generated_at: generatedAt,
    data_state: eventCount === 0 ? "empty" : missingCoverage.length > 0 ? "partial" : "ready",
    source: {
      product_event_count: productEvents.length,
      operational_event_count: operationalEvents.length,
      unique_session_count: product.activeUsers,
      first_event_at: range.first,
      last_event_at: range.last,
      deployment_shas: [...deployments].sort(),
      caveat: "privacy_safe_local_evidence_not_live_product_analytics",
    },
    product: {
      new_users: product.newUsers,
      active_users: product.activeUsers,
      funnel: product.funnel,
      seven_day_returning_sessions: product.returningSessions,
      seven_day_return_rate_pct: product.returnRate,
    },
    recipes: recipes.metrics,
    operations: {
      overall: operationalMetric("all", operationalEvents),
      endpoints: API_OPERATION_ENDPOINTS.map((endpoint) =>
        operationalMetric(
          endpoint,
          operationalEvents.filter((event) => event.metadata.endpoint === endpoint),
        ),
      ),
      instrumentation_gaps: [
        "external_api_failures_not_instrumented",
        "database_errors_not_instrumented",
        "image_errors_not_instrumented",
        "client_errors_not_instrumented",
      ],
    },
    data_quality: {
      missing_coverage: missingCoverage,
      product_events_without_recipe_id: recipes.eventsWithoutRecipeId,
      orphan_cooking_outcomes: recipes.orphanOutcomes,
      overlapping_cooking_starts: recipes.overlappingStarts,
      open_cooking_attempts: recipes.openAttempts,
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayRate(value: number | null): string {
  return value === null ? "표본 없음" : `${value.toFixed(1)}%`;
}

function displayDuration(value: number | null): string {
  if (value === null) return "표본 없음";
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
}

function displayTimestamp(value: string | null): string {
  if (value === null) return "없음";
  return `${value.slice(0, 10).replaceAll("-", ".")} ${value.slice(11, 16)} UTC`;
}

export function renderPhase6AnalyticsDashboardHtml(
  report: Phase6AnalyticsDashboardReport,
): string {
  const stateLabel = report.data_state === "ready" ? "검토 가능" : report.data_state === "partial" ? "부분 데이터" : "데이터 없음";
  const stateClass = report.data_state === "ready" ? "good" : report.data_state === "partial" ? "warn" : "muted";
  const funnelRows = report.product.funnel
    .map((metric) => {
      const width = metric.rate_from_new_users_pct ?? 0;
      return `<li class="funnel-row">
        <div class="funnel-copy"><strong>${escapeHtml(metric.label)}</strong><span>${metric.sessions}세션 · 신규 대비 ${displayRate(metric.rate_from_new_users_pct)}</span></div>
        <div class="bar-track" role="img" aria-label="${escapeHtml(metric.label)} 신규 대비 ${displayRate(metric.rate_from_new_users_pct)}"><span style="width:${width}%"></span></div>
        <small>${metric.key === "new_users" ? "기준 코호트" : `직전 단계 대비 ${displayRate(metric.rate_from_previous_stage_pct)}`}</small>
      </li>`;
    })
    .join("");
  const recipeRows = report.recipes.length === 0
    ? `<tr><td colspan="8" class="empty">레시피 품질 이벤트가 없습니다.</td></tr>`
    : report.recipes
        .map((recipe) => {
          const failureCodes = Object.entries(recipe.failure_codes)
            .map(([code, count]) => `${escapeHtml(code)} ${count}`)
            .join(", ") || "없음";
          return `<tr>
            <td><strong>#${recipe.review_rank}</strong><br><code>${escapeHtml(recipe.recipe_id.slice(0, 8))}</code><br><small>v${recipe.recipe_version ?? "?"} · ${recipe.sample_status === "reviewable" ? "검토 가능" : "표본 부족"}</small></td>
            <td>${recipe.starts}</td>
            <td>${recipe.completes}<br><small>${displayRate(recipe.completion_rate_pct)}</small></td>
            <td>${recipe.abandons}<br><small>${displayRate(recipe.abandonment_rate_pct)} · 단계 ${recipe.top_abandonment_step ?? "-"}</small></td>
            <td>${recipe.failures}<br><small>${displayRate(recipe.failure_rate_pct)} · ${failureCodes}</small></td>
            <td>${displayDuration(recipe.median_elapsed_seconds)}<br><small>p95 ${displayDuration(recipe.p95_elapsed_seconds)}</small></td>
            <td>${recipe.shopping_add_sessions}/${recipe.recipe_view_sessions}<br><small>${displayRate(recipe.shopping_add_rate_pct)}</small></td>
            <td>${(recipe.failure_codes.safety_concern ?? 0) > 0 ? '<strong class="alert">안전 우려 우선</strong>' : "실패율·중단율 순"}</td>
          </tr>`;
        })
        .join("");
  const operationalRows = [report.operations.overall, ...report.operations.endpoints]
    .map((metric) => `<tr>
      <td><code>${escapeHtml(metric.endpoint)}</code></td>
      <td>${metric.request_count}</td>
      <td>${displayRate(metric.client_error_rate_pct)}</td>
      <td>${displayRate(metric.server_error_rate_pct)}</td>
      <td>${metric.p50_latency_ms ?? "-"}ms</td>
      <td>${metric.p95_latency_ms ?? "-"}ms</td>
      <td>${escapeHtml(Object.entries(metric.error_codes).map(([code, count]) => `${code} ${count}`).join(", ") || "없음")}</td>
    </tr>`)
    .join("");
  const missingCoverage = report.data_quality.missing_coverage.length > 0
    ? report.data_quality.missing_coverage.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join("")
    : "<li>핵심 제품·조리·운영 표본이 모두 있습니다.</li>";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>집밥노트 Phase 6 분석 대시보드</title>
  <style>
    :root { color-scheme: light; --ink:#14201b; --sub:#56635e; --line:#d7ddd9; --paper:#fffdf8; --band:#f4f0e7; --accent:#c94f19; --accent-soft:#f8d8c8; --good:#176849; --warn:#915400; --alert:#b42318; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font:15px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif; }
    a.skip { position:absolute; left:12px; top:-80px; min-width:44px; min-height:44px; padding:12px; background:var(--ink); color:white; z-index:2; }
    a.skip:focus { top:12px; }
    header { border-bottom:1px solid var(--line); background:var(--band); padding:28px max(20px,calc((100vw - 1180px)/2)); }
    header p { margin:6px 0 0; color:var(--sub); }
    h1 { margin:0; font-size:clamp(25px,4vw,38px); letter-spacing:-.04em; }
    main { max-width:1180px; margin:0 auto; padding:24px 20px 64px; }
    section { padding:24px 0; border-bottom:1px solid var(--line); }
    h2 { margin:0 0 6px; font-size:22px; }
    .section-note { margin:0 0 18px; color:var(--sub); }
    .status-line { display:flex; flex-wrap:wrap; gap:8px 18px; align-items:center; margin-top:16px; }
    .pill { display:inline-flex; align-items:center; min-height:32px; padding:5px 10px; border:1px solid currentColor; border-radius:999px; font-weight:750; }
    .pill.good { color:var(--good); } .pill.warn { color:var(--warn); } .pill.muted { color:var(--sub); }
    .kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); border:1px solid var(--line); }
    .kpi { min-width:0; padding:16px; border-right:1px solid var(--line); }
    .kpi:last-child { border-right:0; }
    .kpi span { display:block; color:var(--sub); font-size:13px; }
    .kpi strong { display:block; margin-top:4px; font-size:25px; }
    .funnel { list-style:none; padding:0; margin:0; display:grid; gap:16px; }
    .funnel-row { display:grid; grid-template-columns:minmax(190px,1fr) 2fr 140px; gap:16px; align-items:center; }
    .funnel-copy span, small { color:var(--sub); }
    .funnel-copy strong, .funnel-copy span { display:block; }
    .bar-track { height:18px; background:#e4e8e5; border:1px solid #c8d0cb; overflow:hidden; }
    .bar-track span { display:block; height:100%; background:var(--accent); }
    .table-wrap { overflow:auto; border:1px solid var(--line); }
    table { width:100%; border-collapse:collapse; min-width:820px; }
    th,td { padding:12px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { background:var(--band); font-size:13px; }
    tr:last-child td { border-bottom:0; }
    code { font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; }
    .alert { color:var(--alert); }
    .empty { padding:28px; text-align:center; color:var(--sub); }
    .caveat { border-left:4px solid var(--warn); padding:12px 16px; background:#fff5df; }
    ul.compact { margin:8px 0 0; padding-left:20px; columns:2; }
    footer { max-width:1180px; margin:0 auto; padding:0 20px 40px; color:var(--sub); font-size:13px; }
    :focus-visible { outline:3px solid #1769aa; outline-offset:3px; }
    @media (max-width:700px) {
      header { padding:22px 16px; }
      main { padding:16px 16px 48px; }
      section { padding:20px 0; }
      .kpis { grid-template-columns:1fr 1fr; }
      .kpi:nth-child(2) { border-right:0; }
      .kpi:nth-child(-n+2) { border-bottom:1px solid var(--line); }
      .funnel-row { grid-template-columns:1fr; gap:6px; }
      .funnel-row small { margin-top:-2px; }
      ul.compact { columns:1; }
    }
    @media print { body { background:white; } .table-wrap { overflow:visible; } }
  </style>
</head>
<body>
  <a class="skip" href="#main-content">본문으로 건너뛰기</a>
  <header>
    <h1>Phase 6 분석 대시보드</h1>
    <p>제품 전환과 레시피 품질을 같은 증거 묶음에서 읽습니다.</p>
    <div class="status-line"><span class="pill ${stateClass}">${stateLabel}</span><span>마지막 이벤트 ${displayTimestamp(report.source.last_event_at)}</span><span>생성 ${displayTimestamp(report.generated_at)}</span></div>
  </header>
  <main id="main-content" tabindex="-1">
    <section aria-labelledby="summary-title">
      <h2 id="summary-title">즉시 확인</h2>
      <p class="section-note">핵심 값은 hover 없이 표시되며, 비율의 분모가 없으면 표본 없음으로 표시합니다.</p>
      <div class="kpis">
        <div class="kpi"><span>신규 사용자</span><strong>${report.product.new_users}</strong></div>
        <div class="kpi"><span>활성 사용자</span><strong>${report.product.active_users}</strong></div>
        <div class="kpi"><span>조리 완료율</span><strong>${displayRate(report.product.funnel.find((stage) => stage.key === "cooking_completed")?.rate_from_new_users_pct ?? null)}</strong></div>
        <div class="kpi"><span>7일 재방문</span><strong>${displayRate(report.product.seven_day_return_rate_pct)}</strong></div>
      </div>
    </section>
    <section aria-labelledby="funnel-title">
      <h2 id="funnel-title">제품 전환</h2>
      <p class="section-note">동일 세션에서 온보딩 → 재료 → 추천 → 상세 → 조리 시작 → 완료 순서가 지켜진 경우만 다음 단계로 셉니다.</p>
      <ol class="funnel">${funnelRows}</ol>
    </section>
    <section aria-labelledby="recipe-title">
      <h2 id="recipe-title">레시피 품질·재검수 순위</h2>
      <p class="section-note">안전 우려 건수, 실패율, 중단율, 시작 수 순입니다. 5회 미만 시작은 표본 부족으로 표시하며 발행 승인 근거로 사용하지 않습니다.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>순위·레시피</th><th>시작</th><th>완료</th><th>중단</th><th>실패 이유</th><th>실제 조리시간</th><th>장보기 추가</th><th>판정 근거</th></tr></thead>
        <tbody>${recipeRows}</tbody>
      </table></div>
    </section>
    <section aria-labelledby="ops-title">
      <h2 id="ops-title">운영 API</h2>
      <p class="section-note">배포 SHA와 정규화된 endpoint 기준의 구조화 로그만 집계합니다.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>endpoint</th><th>요청</th><th>4xx</th><th>5xx</th><th>p50</th><th>p95</th><th>오류 코드</th></tr></thead>
        <tbody>${operationalRows}</tbody>
      </table></div>
    </section>
    <section aria-labelledby="quality-title">
      <h2 id="quality-title">데이터 품질과 한계</h2>
      <div class="caveat"><strong>로컬 비식별 증거입니다.</strong> 라이브 제품 분석, 실제 사용자 field 지표, 발행 승인 또는 사람 검수 증거가 아닙니다.</div>
      <p>누락된 핵심 범위</p><ul class="compact">${missingCoverage}</ul>
      <p>현재 미계측 운영 범위</p><ul class="compact">${report.operations.instrumentation_gaps.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join("")}</ul>
    </section>
  </main>
  <footer>제품 이벤트 ${report.source.product_event_count}건 · 운영 이벤트 ${report.source.operational_event_count}건 · 배포 SHA ${escapeHtml(report.source.deployment_shas.join(", ") || "없음")}</footer>
</body>
</html>`;
}
