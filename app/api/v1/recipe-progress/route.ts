import { createApiV1Responder } from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  parseRecipeProgressV1Input,
  parseRecipeProgressV1Query,
  normalizeRecipeProgressServerTimestamp,
  recipeProgressDatabaseValues,
  recipeProgressV1Data,
  type RecipeProgressDatabaseRow,
  RecipeProgressValidationError,
} from "@/lib/recipe-progress";
import { readBoundedJsonObject } from "@/lib/request-security";
import {
  getAuthenticatedServerUser,
  getBearerAccessToken,
  getServerSupabaseAdminClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

const MAX_BODY_BYTES = 8 * 1024;
const PROGRESS_COLUMNS = [
  "id",
  "recipe_id",
  "recipe_version",
  "servings",
  "active_step_index",
  "checked_step_indexes",
  "timer_step_index",
  "timer_ends_at",
  "timer_duration_seconds",
  "started_at",
  "completed_at",
  "client_updated_at",
  "created_at",
  "updated_at",
].join(",");
const DEPENDENCY_ERROR_CODES = new Set(["42P01", "42501", "PGRST204", "PGRST205"]);

function isDependencyError(error: { code?: string | null } | null): boolean {
  return Boolean(error && DEPENDENCY_ERROR_CODES.has(error.code ?? ""));
}

export async function GET(request: Request) {
  const respond = createApiV1Responder("GET /api/v1/recipe-progress");
  const rateLimit = await consumeDistributedRateLimit(request, "recipes:progress:read", {
    limit: 60,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") {
    return respond.error("RATE_LIMITED", "요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, {
      retryAfter: rateLimit.retryAfter,
    });
  }
  if (rateLimit.status === "unavailable") {
    return respond.error("DEPENDENCY_NOT_READY", "조리 진행 API를 준비 중입니다.", 503, {
      retryAfter: rateLimit.retryAfter,
    });
  }

  const authorizationHeader = request.headers.get("authorization");
  if (!getBearerAccessToken(authorizationHeader)) {
    return respond.error("UNAUTHORIZED", "로그인한 계정의 세션이 필요합니다.", 401);
  }

  try {
    const user = await getAuthenticatedServerUser(authorizationHeader);
    if (!user || user.is_anonymous === true) {
      return respond.error("UNAUTHORIZED", "로그인한 계정을 확인하지 못했습니다.", 401);
    }
    const query = parseRecipeProgressV1Query(new URL(request.url).searchParams);
    const client = getServerSupabaseAdminClient();
    const { data, error } = await client
      .from("recipe_progress")
      .select(PROGRESS_COLUMNS)
      .eq("user_id", user.id)
      .eq("recipe_id", query.recipeId)
      .eq("servings", query.servings)
      .maybeSingle();

    if (isDependencyError(error)) {
      return respond.error("DEPENDENCY_NOT_READY", "조리 진행 저장소를 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    if (error) {
      return respond.error("INTERNAL_ERROR", "조리 진행을 불러오지 못했습니다.", 500);
    }

    return respond.success({
      progress: data
        ? recipeProgressV1Data(data as unknown as RecipeProgressDatabaseRow)
        : null,
    });
  } catch (error) {
    if (error instanceof RecipeProgressValidationError) {
      return respond.error("INVALID_QUERY", error.message, 400);
    }
    if (isMissingServerSupabaseConfigError(error)) {
      return respond.error("DEPENDENCY_NOT_READY", "조리 진행 API를 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    return respond.error("INTERNAL_ERROR", "조리 진행을 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: Request) {
  const respond = createApiV1Responder("POST /api/v1/recipe-progress");
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return respond.error("INVALID_BODY", "요청 본문이 너무 큽니다.", 413);
  }

  const rateLimit = await consumeDistributedRateLimit(request, "recipes:progress:write", {
    limit: 30,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") {
    return respond.error("RATE_LIMITED", "요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, {
      retryAfter: rateLimit.retryAfter,
    });
  }
  if (rateLimit.status === "unavailable") {
    return respond.error("DEPENDENCY_NOT_READY", "조리 진행 API를 준비 중입니다.", 503, {
      retryAfter: rateLimit.retryAfter,
    });
  }

  const authorizationHeader = request.headers.get("authorization");
  if (!getBearerAccessToken(authorizationHeader)) {
    return respond.error("UNAUTHORIZED", "로그인한 계정의 세션이 필요합니다.", 401);
  }

  try {
    const user = await getAuthenticatedServerUser(authorizationHeader);
    if (!user || user.is_anonymous === true) {
      return respond.error("UNAUTHORIZED", "로그인한 계정을 확인하지 못했습니다.", 401);
    }
    const bodyResult = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (bodyResult.status === "too_large") {
      return respond.error("INVALID_BODY", "요청 본문이 너무 큽니다.", 413);
    }
    if (bodyResult.status === "invalid") {
      return respond.error("INVALID_BODY", "조리 진행 요청 형식을 확인해 주세요.", 400);
    }

    const input = parseRecipeProgressV1Input(bodyResult.value);
    const client = getServerSupabaseAdminClient();
    const existingResult = await client
      .from("recipe_progress")
      .select(PROGRESS_COLUMNS)
      .eq("user_id", user.id)
      .eq("recipe_id", input.recipeId)
      .eq("servings", input.servings)
      .maybeSingle();

    if (isDependencyError(existingResult.error)) {
      return respond.error("DEPENDENCY_NOT_READY", "조리 진행 저장소를 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    if (existingResult.error) {
      return respond.error("INTERNAL_ERROR", "조리 진행을 저장하지 못했습니다.", 500);
    }

    const existing = existingResult.data as unknown as RecipeProgressDatabaseRow | null;
    if (!existing) {
      if (input.baseServerUpdatedAt !== null) {
        return respond.error("CONFLICT", "다른 기기에서 조리 진행이 변경되었습니다.", 409, {
          details: { serverProgressExists: false },
        });
      }
      const insertResult = await client
        .from("recipe_progress")
        .insert(recipeProgressDatabaseValues(input, user.id))
        .select(PROGRESS_COLUMNS)
        .single();

      if (insertResult.error?.code === "23505") {
        return respond.error("CONFLICT", "다른 기기에서 조리 진행이 먼저 저장되었습니다.", 409, {
          details: { serverProgressExists: true },
        });
      }
      if (insertResult.error?.code === "23503") {
        return respond.error("INVALID_BODY", "조리 진행 대상 레시피를 확인해 주세요.", 400);
      }
      if (isDependencyError(insertResult.error)) {
        return respond.error("DEPENDENCY_NOT_READY", "조리 진행 저장소를 준비 중입니다.", 503, {
          retryAfter: 60,
        });
      }
      if (insertResult.error || !insertResult.data) {
        return respond.error("INTERNAL_ERROR", "조리 진행을 저장하지 못했습니다.", 500);
      }
      return respond.success({
        progress: recipeProgressV1Data(
          insertResult.data as unknown as RecipeProgressDatabaseRow,
        ),
      }, 201);
    }

    const existingServerUpdatedAt = recipeProgressV1Data(existing).serverUpdatedAt;
    if (input.baseServerUpdatedAt !== existingServerUpdatedAt) {
      return respond.error("CONFLICT", "다른 기기에서 조리 진행이 변경되었습니다.", 409, {
        details: { serverUpdatedAt: existingServerUpdatedAt },
      });
    }

    const updateResult = await client
      .from("recipe_progress")
      .update(recipeProgressDatabaseValues(input, user.id))
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .eq("updated_at", existing.updated_at)
      .select(PROGRESS_COLUMNS)
      .maybeSingle();

    if (isDependencyError(updateResult.error)) {
      return respond.error("DEPENDENCY_NOT_READY", "조리 진행 저장소를 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    if (updateResult.error) {
      return respond.error("INTERNAL_ERROR", "조리 진행을 저장하지 못했습니다.", 500);
    }
    if (!updateResult.data) {
      const latest = await client
        .from("recipe_progress")
        .select("updated_at")
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .maybeSingle();
      return respond.error("CONFLICT", "다른 기기에서 조리 진행이 변경되었습니다.", 409, {
        details: {
          serverUpdatedAt: typeof latest.data?.updated_at === "string"
            ? normalizeRecipeProgressServerTimestamp(latest.data.updated_at)
            : existingServerUpdatedAt,
        },
      });
    }

    return respond.success({
      progress: recipeProgressV1Data(
        updateResult.data as unknown as RecipeProgressDatabaseRow,
      ),
    });
  } catch (error) {
    if (error instanceof RecipeProgressValidationError) {
      return respond.error("INVALID_BODY", error.message, 400);
    }
    if (isMissingServerSupabaseConfigError(error)) {
      return respond.error("DEPENDENCY_NOT_READY", "조리 진행 API를 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    return respond.error("INTERNAL_ERROR", "조리 진행을 저장하지 못했습니다.", 500);
  }
}
