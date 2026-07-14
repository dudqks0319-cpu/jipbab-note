import { createApiV1Responder } from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  feedbackDifficultyForStatus,
  parseRecipeFeedbackV1Input,
  RecipeFeedbackValidationError,
} from "@/lib/recipe-feedback";
import { readBoundedJsonObject } from "@/lib/request-security";
import {
  getAuthenticatedServerUser,
  getBearerAccessToken,
  getServerSupabaseAdminClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

const MAX_BODY_BYTES = 4 * 1024;
const DEPENDENCY_ERROR_CODES = new Set(["42P01", "42501", "PGRST204", "PGRST205"]);

export async function POST(request: Request) {
  const respond = createApiV1Responder("POST /api/v1/recipe-feedback");
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return respond.error("INVALID_BODY", "요청 본문이 너무 큽니다.", 413);
  }

  const rateLimit = await consumeDistributedRateLimit(request, "recipes:feedback", {
    limit: 12,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") {
    return respond.error(
      "RATE_LIMITED",
      "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
      429,
      { retryAfter: rateLimit.retryAfter },
    );
  }
  if (rateLimit.status === "unavailable") {
    return respond.error(
      "DEPENDENCY_NOT_READY",
      "피드백 API를 준비 중입니다.",
      503,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  const authorizationHeader = request.headers.get("authorization");
  const accessToken = getBearerAccessToken(authorizationHeader);
  if (!accessToken) {
    return respond.error("UNAUTHORIZED", "서명된 세션이 필요합니다.", 401);
  }

  try {
    const user = await getAuthenticatedServerUser(authorizationHeader);
    if (!user) {
      return respond.error("UNAUTHORIZED", "서명된 세션을 확인하지 못했습니다.", 401);
    }

    const bodyResult = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (bodyResult.status === "too_large") {
      return respond.error("INVALID_BODY", "요청 본문이 너무 큽니다.", 413);
    }
    if (bodyResult.status === "invalid") {
      return respond.error("INVALID_BODY", "피드백 요청 형식을 확인해 주세요.", 400);
    }

    const input = parseRecipeFeedbackV1Input(bodyResult.value);
    const client = getServerSupabaseAdminClient();
    const { error } = await client.from("recipe_feedback").insert({
      recipe_id: input.recipeId,
      recipe_version: input.recipeVersion,
      user_id: user.id,
      client_submission_id: input.clientSubmissionId,
      completion_status: input.completionStatus,
      difficulty_feedback: feedbackDifficultyForStatus(input.completionStatus),
      failed_step_order: input.failedStepOrder,
      reason_code: input.reasonCode,
      actual_duration_seconds: input.actualDurationSeconds,
      comment: null,
    });

    if (error?.code === "23505") {
      return respond.success({
        accepted: true as const,
        duplicate: true,
        clientSubmissionId: input.clientSubmissionId,
      });
    }
    if (error?.code === "23503") {
      return respond.error("INVALID_BODY", "피드백 대상 레시피를 확인해 주세요.", 400);
    }
    if (error && DEPENDENCY_ERROR_CODES.has(error.code ?? "")) {
      return respond.error(
        "DEPENDENCY_NOT_READY",
        "피드백 저장소를 준비 중입니다.",
        503,
        { retryAfter: 60 },
      );
    }
    if (error) {
      return respond.error("INTERNAL_ERROR", "피드백을 저장하지 못했습니다.", 500);
    }

    return respond.success({
      accepted: true as const,
      duplicate: false,
      clientSubmissionId: input.clientSubmissionId,
    }, 201);
  } catch (error) {
    if (error instanceof RecipeFeedbackValidationError) {
      return respond.error("INVALID_BODY", error.message, 400);
    }
    if (isMissingServerSupabaseConfigError(error)) {
      return respond.error(
        "DEPENDENCY_NOT_READY",
        "피드백 API를 준비 중입니다.",
        503,
        { retryAfter: 60 },
      );
    }
    return respond.error("INTERNAL_ERROR", "피드백을 저장하지 못했습니다.", 500);
  }
}
