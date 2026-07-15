import { existsSync, readFileSync } from "node:fs";

const files = {
  listRoute: "app/api/v1/recipes/route.ts",
  detailRoute: "app/api/v1/recipes/[id]/route.ts",
  recommendationRoute: "app/api/v1/recommendations/route.ts",
  feedbackRoute: "app/api/v1/recipe-feedback/route.ts",
  progressRoute: "app/api/v1/recipe-progress/route.ts",
  shoppingRoute: "app/api/v1/shopping/items/from-recipe/route.ts",
  repository: "lib/recipe-api-v1-repository.ts",
  recommendation: "lib/recipe-recommendation-v1.ts",
  feedback: "lib/recipe-feedback.ts",
  progress: "lib/recipe-progress.ts",
  shopping: "lib/shopping-from-recipe.ts",
  response: "lib/api-v1-response.ts",
  limiter: "lib/distributed-rate-limit.ts",
  migration: "supabase/migrations/20260710160000_add_distributed_api_rate_limits.sql",
  rollback: "supabase/rollbacks/20260710160000_add_distributed_api_rate_limits.sql",
  feedbackMigration: "supabase/migrations/20260714100000_add_recipe_feedback.sql",
  feedbackRollback: "supabase/rollbacks/20260714100000_add_recipe_feedback.sql",
  feedbackDetailsMigration: "supabase/migrations/20260714110000_extend_recipe_feedback_completion_details.sql",
  feedbackDetailsRollback: "supabase/rollbacks/20260714110000_extend_recipe_feedback_completion_details.sql",
  servingMigration: "supabase/migrations/20260715100000_add_recipe_serving_variants.sql",
  servingRollback: "supabase/rollbacks/20260715100000_add_recipe_serving_variants.sql",
  progressMigration: "supabase/migrations/20260715110000_add_recipe_progress.sql",
  progressRollback: "supabase/rollbacks/20260715110000_add_recipe_progress.sql",
  schema: "supabase/schema.sql",
  envExample: ".env.example",
};

const results = [];

function addResult(level, label, detail) {
  results.push({ level, label, detail });
}

function check(label, condition, passDetail, failDetail) {
  addResult(condition ? "pass" : "fail", label, condition ? passDetail : failDetail);
}

function read(relativePath) {
  if (!existsSync(relativePath)) {
    addResult("fail", relativePath, "required API v1 file is missing");
    return "";
  }
  return readFileSync(relativePath, "utf8");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, relativePath]) => [key, read(relativePath)]),
);
const routes = [
  source.listRoute,
  source.detailRoute,
  source.recommendationRoute,
  source.feedbackRoute,
  source.progressRoute,
  source.shoppingRoute,
];

check(
  "API v1 routes",
  routes.every(
    (route) =>
      route.includes("consumeDistributedRateLimit") &&
      route.includes("createApiV1Responder"),
  ) &&
    source.response.includes("createApiRequestId()") &&
    source.response.includes("apiV1Success(data, requestId, status)") &&
    source.response.includes("apiV1Error(") &&
    source.response.includes("createApiOperationRecorder"),
  "list, detail, recommendation, feedback, progress, and shopping routes share request IDs, envelopes, operational telemetry, and distributed limits",
  "every route must use the common responder and distributed rate-limit contracts",
);

check(
  "API v1 route privacy",
  routes.every(
    (route) =>
      !route.includes("console.") &&
      !route.includes("x-device-id") &&
      !route.includes("SUPABASE_SERVICE_ROLE_KEY") &&
      !route.includes("error.stack"),
  ),
  "routes do not log internals or use unsigned device identity",
  "routes must not expose internals, server secrets, or device-header authorization",
);

const publicationFilters = [
  '.eq("schema_version", 2)',
  '.eq("review_status", "approved")',
  '.eq("reviewed_for_beginner", true)',
  '.eq("actual_cooking_tested", true)',
  '.eq("food_safety_reviewed", true)',
  '.in("image_rights_status", ["approved", "no_image_approved"])',
  '.not("source_id", "is", null)',
  '.not("published_at", "is", null)',
];
check(
  "public recipe repository",
  publicationFilters.every((filter) => source.repository.split(filter).length >= 3) &&
    source.repository.includes("isDatabaseRecipePublicationApproved") &&
    source.repository.includes("toRecipePublicationEvidence"),
  "list and detail queries require v2 publication evidence and revalidate service-role results",
  "list and detail must both apply every publication filter and revalidate returned rows",
);

check(
  "list sort and cursor contract",
  source.listRoute.includes("parseApiSort") &&
    source.repository.includes("sortPublicRecipeCards") &&
    source.repository.includes('sort === "most-owned"') &&
    source.repository.includes('sort === "least-missing"') &&
    source.repository.includes('sort === "fastest"') &&
    source.repository.includes('kind: "ranked"'),
  "list supports the five documented sorts with sort-bound opaque cursors",
  "list sort or ranked cursor handling is incomplete",
);

check(
  "normalized recipe detail",
  source.repository.includes("recipe_ingredients") &&
    source.repository.includes("recipe_steps") &&
    source.repository.includes("recipe_step_ingredients") &&
    source.repository.includes("filterNormalizedPublicRecipeRows") &&
    source.repository.split('.from("recipe_steps")').length >= 3 &&
    source.repository.split('.from("recipe_sources")').length >= 3 &&
    source.repository.includes("safetyNotes.length === 0") &&
    source.repository.includes("usedIngredientIds") &&
    source.repository.includes("recoveryTip"),
  "list and detail fail closed on missing normalized ingredients, usages, sources, safety, or recovery guidance",
  "list and detail must be assembled only from complete normalized recipe data",
);

check(
  "recommendation evidence",
  source.recommendation.includes("matchedIngredientIds") &&
    source.recommendation.includes("missingIngredientIds") &&
    source.recommendation.includes("reasons") &&
    source.recommendationRoute.includes("limit: 200") &&
    source.recommendationRoute.includes("candidateCount"),
  "recommendations expose owned/missing evidence and bounded candidate counts",
  "recommendations must explain ingredient matches instead of returning opaque scores",
);

check(
  "bounded recommendation body",
  source.recommendationRoute.includes("readBoundedJsonObject") &&
    source.recommendationRoute.includes("MAX_BODY_BYTES") &&
    source.recommendationRoute.includes('bodyResult.status === "too_large"'),
  "recommendation bodies are stream-counted even when Content-Length is missing",
  "recommendation parsing must enforce its byte limit on chunked bodies",
);

check(
  "private recipe feedback API",
  source.feedbackRoute.includes("readBoundedJsonObject") &&
    source.feedbackRoute.includes("getBearerAccessToken") &&
    source.feedbackRoute.includes("getAuthenticatedServerUser") &&
    source.feedbackRoute.includes("getServerSupabaseAdminClient") &&
    source.feedbackRoute.includes('.from("recipe_feedback").insert') &&
    source.feedbackRoute.includes('respond.error("UNAUTHORIZED"') &&
    source.feedbackRoute.includes('error?.code === "23505"') &&
    source.feedbackRoute.includes("difficult_step_order: input.difficultStepOrder") &&
    source.feedbackRoute.includes("taste_result: input.tasteResult") &&
    source.feedbackRoute.includes("repeat_intent: input.repeatIntent") &&
    source.feedback.includes("INPUT_KEY_SET") &&
    !source.feedback.includes('"comment"'),
  "feedback requires a verified signed session, exact bounded fields, and idempotent server-only writes",
  "feedback authentication, input minimization, or idempotent storage is incomplete",
);

check(
  "private recipe progress API",
  source.progressRoute.includes("export async function GET") &&
    source.progressRoute.includes("export async function POST") &&
    source.progressRoute.includes("readBoundedJsonObject") &&
    source.progressRoute.includes("getBearerAccessToken") &&
    source.progressRoute.includes("getAuthenticatedServerUser") &&
    source.progressRoute.includes("user.is_anonymous === true") &&
    source.progressRoute.includes("getServerSupabaseAdminClient") &&
    source.progressRoute.includes('.from("recipe_progress")') &&
    source.progressRoute.includes('.eq("user_id", user.id)') &&
    source.progressRoute.includes('.eq("updated_at", existing.updated_at)') &&
    source.progressRoute.includes('respond.error("CONFLICT"') &&
    source.progress.includes("INPUT_KEY_SET") &&
    source.progress.includes("TIMER_KEY_SET") &&
    !/comment|memo|note|description/i.test(source.progress),
  "progress requires a permanent signed user, exact bounded fields, server-only storage, and optimistic conflicts",
  "progress authentication, input minimization, or conflict protection is incomplete",
);

check(
  "private shopping merge API",
  source.shoppingRoute.includes("readBoundedJsonObject") &&
    source.shoppingRoute.includes("getBearerAccessToken") &&
    source.shoppingRoute.includes("getAuthenticatedServerUser") &&
    source.shoppingRoute.includes("getPublicRecipeDetailV1(input.recipeId)") &&
    source.shoppingRoute.includes("getServerSupabaseAdminClient") &&
    source.shoppingRoute.includes('.from("shopping_items")') &&
    source.shoppingRoute.includes('.eq("user_id", user.id)') &&
    source.shoppingRoute.includes('.is("family_group_id", null)') &&
    source.shoppingRoute.includes("buildShoppingFromRecipeCandidates") &&
    source.shoppingRoute.includes("buildShoppingFromRecipeUpserts") &&
    source.shopping.includes("INPUT_KEY_SET") &&
    source.shopping.includes("MAX_SELECTED_INGREDIENTS = 50") &&
    !/name|quantity|user|device|family|category/i.test(
      source.shopping.match(/const INPUT_KEYS = \[([\s\S]*?)\] as const;/)?.[1] ?? "",
    ),
  "shopping merge accepts only signed, bounded recipe selections and scopes every server write to the verified user",
  "shopping merge authentication, server-derived fields, or user isolation is incomplete",
);

check(
  "response envelope",
  source.response.includes('"Cache-Control": "no-store"') &&
    source.response.includes('"X-Request-Id"') &&
    source.response.includes('headers.set("Retry-After"'),
  "responses are non-cacheable and carry request and retry metadata",
  "responses must include no-store, request IDs, and Retry-After for limited/unavailable paths",
);

check(
  "distributed limiter runtime",
  source.limiter.includes('createHmac("sha256"') &&
  source.limiter.includes('process.env.NODE_ENV === "production"') &&
    source.limiter.includes('status: "unavailable"') &&
    source.limiter.includes("LOCAL_BUCKET_CAPACITY") &&
    source.limiter.includes("localDevelopmentLimit") &&
    source.limiter.includes('client.rpc("consume_api_rate_limit"'),
  "production fails closed through an HMAC-pseudonymized database limiter",
  "production must not fall back to an in-memory-only rate limit",
);

check(
  "distributed limiter database contract",
  source.migration.includes("create table if not exists public.api_rate_limit_buckets") &&
    source.migration.includes("primary key (route_key, key_hash, window_start)") &&
    source.migration.includes("security definer") &&
    source.migration.includes("set search_path = pg_catalog, public") &&
    source.migration.includes("on conflict (route_key, key_hash, window_start)") &&
    source.migration.includes("to service_role") &&
    source.migration.includes("from public, anon, authenticated") &&
    !/\bto\s+(anon|authenticated)\b/i.test(source.migration),
  "counter updates are atomic, RLS-protected, and service-role only",
  "rate-limit storage and RPC privileges are incomplete",
);

check(
  "rate-limit rollback",
  source.rollback.includes("drop function if exists public.consume_api_rate_limit") &&
    !/drop\s+table|truncate/i.test(source.rollback),
  "rollback removes executable access without destroying pseudonymous counters",
  "rollback must revoke the RPC without destructive counter deletion",
);

check(
  "recipe feedback database contract",
  source.feedbackMigration.includes("create table if not exists public.recipe_feedback") &&
    source.feedbackMigration.includes("recipe_feedback_failure_fields_consistent") &&
    source.feedbackMigration.includes("recipe_feedback_no_free_text") &&
    source.feedbackMigration.includes("check (comment is null)") &&
    source.feedbackMigration.includes("unique (user_id, client_submission_id)") &&
    source.feedbackMigration.includes("idx_recipe_feedback_recipe_created") &&
    source.feedbackMigration.includes("idx_recipe_feedback_user_created") &&
    source.feedbackMigration.includes("enable row level security") &&
    source.feedbackMigration.includes("from public, anon, authenticated") &&
    source.feedbackMigration.includes("to service_role") &&
    !/grant\s+(?:all|insert|select)[^;]*\bto\s+(?:anon|authenticated)\b/i.test(
      source.feedbackMigration,
    ),
  "feedback rows are constrained, indexed, inaccessible to app roles, and writable only by the server",
  "feedback storage must minimize data and deny direct app-role access",
);

check(
  "recipe feedback rollback",
  source.feedbackRollback.includes("revoke all on table public.recipe_feedback") &&
    source.feedbackDetailsRollback.includes("revoke all on table public.recipe_feedback") &&
    !/drop\s+(?:table|column)|truncate/i.test(source.feedbackDetailsRollback) &&
    !/drop\s+table|truncate/i.test(source.feedbackRollback),
  "rollback revokes runtime access while retaining private beta evidence",
  "feedback rollback must preserve collected evidence and remove runtime access",
);

check(
  "recipe feedback completion details",
  source.feedbackDetailsMigration.includes("add column if not exists difficult_step_order") &&
    source.feedbackDetailsMigration.includes("add column if not exists taste_result") &&
    source.feedbackDetailsMigration.includes("add column if not exists repeat_intent") &&
    source.feedbackDetailsMigration.includes("recipe_feedback_difficult_step_consistent") &&
    source.feedbackDetailsMigration.includes("recipe_feedback_taste_result_allowed") &&
    source.feedbackDetailsMigration.includes("recipe_feedback_repeat_intent_allowed") &&
    source.feedbackDetailsMigration.includes("recipe_feedback_completion_details_consistent") &&
    source.feedbackDetailsMigration.includes("from public, anon, authenticated") &&
    source.feedbackDetailsMigration.includes("to service_role") &&
    !/grant\s+(?:all|insert|select)[^;]*\bto\s+(?:anon|authenticated)\b/i.test(
      source.feedbackDetailsMigration,
    ),
  "completion details are bounded fixed choices and remain service-role only",
  "completion detail columns, constraints, or least-privilege grants are incomplete",
);

check(
  "reviewed serving variants",
  source.servingMigration.includes("add column if not exists serving_variants jsonb") &&
    source.servingMigration.includes("recipe_serving_variants_shape") &&
    source.servingMigration.includes("from public, anon, authenticated") &&
    source.servingMigration.includes("to service_role") &&
    source.servingRollback.includes("from public, anon, authenticated, service_role") &&
    !/drop\s+(?:table|column)|truncate|delete\s+from/i.test(source.servingRollback),
  "serving variants are bounded, server-only, and retained by rollback",
  "serving variant storage or fail-closed rollback is incomplete",
);

check(
  "recipe progress database contract",
  source.progressMigration.includes("create table if not exists public.recipe_progress") &&
    source.progressMigration.includes("recipe_progress_checked_steps_canonical") &&
    source.progressMigration.includes("recipe_progress_timer_fields_consistent") &&
    source.progressMigration.includes("unique (user_id, recipe_id, servings)") &&
    source.progressMigration.includes("new.updated_at = clock_timestamp()") &&
    source.progressMigration.includes("enable row level security") &&
    source.progressMigration.includes("from public, anon, authenticated") &&
    source.progressMigration.includes("to service_role") &&
    !/grant\s+(?:all|select|insert|update)[^;]*\bto\s+(?:anon|authenticated)\b/i.test(
      source.progressMigration,
    ),
  "progress rows are bounded, private, server-clock owned, and service-role only",
  "progress storage constraints, clock ownership, or least-privilege grants are incomplete",
);

check(
  "recipe progress rollback",
  source.progressRollback.includes(
    "revoke all on table public.recipe_progress from public, anon, authenticated, service_role",
  ) &&
    !/drop\s+(?:table|function)|truncate|delete\s+from/i.test(source.progressRollback),
  "rollback revokes every runtime role while retaining cook progress",
  "progress rollback must preserve rows and remove runtime access",
);

check(
  "schema synchronization",
  source.schema.includes("PHASE2_API_FOUNDATION_SCHEMA_START") &&
    source.schema.includes("public.api_rate_limit_buckets") &&
    source.schema.includes("public.consume_api_rate_limit") &&
    source.schema.includes("recipe_serving_variants_shape") &&
    source.schema.includes("serving_variants jsonb"),
  "Phase 2 database foundation is mirrored into the canonical schema",
  "canonical schema is missing the Phase 2 marker or rate-limit contract",
);

check(
  "recipe feedback schema synchronization",
  source.schema.includes("PHASE7_RECIPE_FEEDBACK_SCHEMA_START") &&
    source.schema.includes("public.recipe_feedback") &&
    source.schema.includes("recipe_feedback_no_free_text") &&
    source.schema.includes("recipe_feedback_completion_details_consistent"),
  "Phase 7 feedback storage is mirrored into the canonical schema",
  "canonical schema is missing the Phase 7 feedback contract",
);

check(
  "recipe progress schema synchronization",
  source.schema.includes("PHASE4_RECIPE_PROGRESS_SCHEMA_START") &&
    source.schema.includes("public.recipe_progress") &&
    source.schema.includes("recipe_progress_checked_steps_canonical") &&
    source.schema.includes("recipe_progress_timer_fields_consistent"),
  "Phase 4 private progress storage is mirrored into the canonical schema",
  "canonical schema is missing the Phase 4 progress contract",
);

check(
  "server-only rate-limit secret",
  source.envExample.includes("API_RATE_LIMIT_HMAC_SECRET=") &&
    !source.envExample.includes("NEXT_PUBLIC_API_RATE_LIMIT_HMAC_SECRET"),
  "the HMAC secret is documented only as a server-side placeholder",
  "API_RATE_LIMIT_HMAC_SECRET must be server-only and unset in the example",
);

const requiredTests = [
  "tests/api-v1-contract.test.ts",
  "tests/distributed-rate-limit.test.ts",
  "tests/recipe-api-v1.test.ts",
  "tests/recipe-recommendation-v1.test.ts",
  "tests/recipe-feedback.test.ts",
  "tests/recipe-feedback-contract.test.ts",
  "tests/recipe-cook-completion.test.ts",
  "tests/recipe-serving-variants.test.ts",
  "tests/recipe-progress.test.ts",
  "tests/recipe-progress-contract.test.ts",
  "tests/shopping-from-recipe.test.ts",
  "tests/shopping-from-recipe-contract.test.ts",
];
check(
  "API v1 regression coverage",
  requiredTests.every((file) => existsSync(file)),
  "cursor, publication, detail, recommendation, and limiter boundaries have tests",
  "one or more API v1 regression test files are missing",
);

const failures = results.filter((item) => item.level === "fail");
const passes = results.filter((item) => item.level === "pass");

console.log("API v1 contract check");
console.log(`Passes: ${passes.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) {
    console.log(`- ${failure.label}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log("\nPASS");
for (const pass of passes) {
  console.log(`- ${pass.label}: ${pass.detail}`);
}
