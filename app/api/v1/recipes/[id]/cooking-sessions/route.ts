// 이 파일은 로그인 사용자가 명시적으로 제출한 조리 완료 세션을 비공개로 저장합니다.
import { createApiV1Responder } from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { parseRecipeCookingSessionInput } from "@/lib/recipe-cooking-session";
import { readBoundedJsonObject, isUuidLike } from "@/lib/request-security";
import { isPermanentSupabaseUser } from "@/lib/supabase-session";
import {
  getAuthenticatedServerUser,
  getServerSupabaseAdminClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const respond = createApiV1Responder("POST /api/v1/recipes/:id/cooking-sessions");
  const rateLimit = await consumeDistributedRateLimit(request, "recipes:cooking-sessions", {
    limit: 10,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") {
    return respond.error("RATE_LIMITED", "조리 기록 요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, {
      retryAfter: rateLimit.retryAfter,
    });
  }
  if (rateLimit.status === "unavailable") {
    return respond.error("DEPENDENCY_NOT_READY", "조리 기록 기능을 준비 중입니다.", 503, {
      retryAfter: rateLimit.retryAfter,
    });
  }

  try {
    const user = await getAuthenticatedServerUser(request.headers.get("authorization"));
    if (!isPermanentSupabaseUser(user)) {
      return respond.error("UNAUTHORIZED", "로그인하면 조리 기록을 저장할 수 있습니다.", 401);
    }

    const { id } = await context.params;
    if (!isUuidLike(id)) {
      return respond.error("INVALID_BODY", "레시피 정보를 확인해 주세요.", 400);
    }
    const body = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (body.status === "too_large") {
      return respond.error("INVALID_BODY", "조리 기록이 너무 깁니다.", 413);
    }
    if (body.status !== "ok") {
      return respond.error("INVALID_BODY", "조리 기록을 확인해 주세요.", 400);
    }

    let input;
    try {
      input = parseRecipeCookingSessionInput(body.value);
    } catch {
      return respond.error("INVALID_BODY", "조리 완료 정보와 시간을 확인해 주세요.", 400);
    }

    const admin = getServerSupabaseAdminClient();
    const { data: recipe, error: recipeError } = await admin
      .from("recipes")
      .select("id")
      .eq("id", id)
      .eq("schema_version", 2)
      .eq("review_status", "approved")
      .not("published_at", "is", null)
      .maybeSingle();
    if (recipeError) {
      return respond.error("DEPENDENCY_NOT_READY", "조리 기록 기능을 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    if (!recipe) {
      return respond.error("NOT_FOUND", "공개된 레시피를 찾지 못했습니다.", 404);
    }

    const { data, error } = await admin
      .from("cooking_sessions")
      .upsert({
        client_session_id: input.clientSessionId,
        recipe_id: id,
        user_id: user.id,
        started_at: input.startedAt,
        completed_at: input.completedAt,
        actual_duration_minutes: input.actualDurationMinutes,
        outcome: input.outcome,
        difficulty: input.difficulty,
        taste: input.taste,
        remake_intent: input.remakeIntent,
        substitute_notes: input.substituteNotes,
        family_reaction: input.familyReaction,
        comment: input.comment,
      }, { onConflict: "user_id,client_session_id" })
      .select("id,completed_at,outcome,created_at")
      .single();
    if (error || !data) {
      return respond.error("DEPENDENCY_NOT_READY", "조리 기록을 저장하지 못했습니다.", 503, {
        retryAfter: 60,
      });
    }

    return respond.success({
      session: {
        id: data.id,
        completedAt: data.completed_at,
        outcome: data.outcome,
        createdAt: data.created_at,
      },
    }, 201);
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return respond.error("DEPENDENCY_NOT_READY", "조리 기록 기능을 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    return respond.error("INTERNAL_ERROR", "조리 기록을 처리하지 못했습니다.", 500);
  }
}
