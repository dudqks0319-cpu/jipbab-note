// 이 파일은 공개 레시피의 로그인 사용자 오류 신고를 비공개 운영 큐에 저장합니다.
import { createApiV1Responder } from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { parseRecipeIssueReportInput } from "@/lib/recipe-issue-report";
import { readBoundedJsonObject, isUuidLike } from "@/lib/request-security";
import { isPermanentSupabaseUser } from "@/lib/supabase-session";
import {
  getAuthenticatedServerUser,
  getServerSupabaseAdminClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

const MAX_BODY_BYTES = 4 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const respond = createApiV1Responder("POST /api/v1/recipes/:id/issue-reports");
  const rateLimit = await consumeDistributedRateLimit(request, "recipes:issue-reports", {
    limit: 6,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") {
    return respond.error("RATE_LIMITED", "신고 요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, {
      retryAfter: rateLimit.retryAfter,
    });
  }
  if (rateLimit.status === "unavailable") {
    return respond.error("DEPENDENCY_NOT_READY", "오류 신고 기능을 준비 중입니다.", 503, {
      retryAfter: rateLimit.retryAfter,
    });
  }

  try {
    const user = await getAuthenticatedServerUser(request.headers.get("authorization"));
    if (!isPermanentSupabaseUser(user)) {
      return respond.error("UNAUTHORIZED", "로그인하면 오류를 신고할 수 있습니다.", 401);
    }

    const { id } = await context.params;
    if (!isUuidLike(id)) {
      return respond.error("INVALID_BODY", "레시피 정보를 확인해 주세요.", 400);
    }
    const body = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (body.status === "too_large") {
      return respond.error("INVALID_BODY", "신고 내용이 너무 깁니다.", 413);
    }
    if (body.status !== "ok") {
      return respond.error("INVALID_BODY", "신고 내용을 확인해 주세요.", 400);
    }

    let input;
    try {
      input = parseRecipeIssueReportInput(body.value);
    } catch {
      return respond.error("INVALID_BODY", "신고 유형과 내용을 확인해 주세요.", 400);
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
      return respond.error("DEPENDENCY_NOT_READY", "오류 신고 기능을 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    if (!recipe) {
      return respond.error("NOT_FOUND", "공개된 레시피를 찾지 못했습니다.", 404);
    }

    const { data, error } = await admin
      .from("recipe_issue_reports")
      .insert({
        recipe_id: id,
        user_id: user.id,
        issue_type: input.issueType,
        details: input.details,
        status: "open",
      })
      .select("id,status,created_at")
      .single();
    if (error || !data) {
      return respond.error("DEPENDENCY_NOT_READY", "오류 신고를 저장하지 못했습니다.", 503, {
        retryAfter: 60,
      });
    }

    return respond.success(
      { report: { id: data.id, status: data.status, createdAt: data.created_at } },
      201,
    );
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return respond.error("DEPENDENCY_NOT_READY", "오류 신고 기능을 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    return respond.error("INTERNAL_ERROR", "오류 신고를 처리하지 못했습니다.", 500);
  }
}
