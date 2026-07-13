import {
  apiV1Error,
  apiV1Success,
  createApiRequestId,
} from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  getPublicRecipeDetailV1,
  RecipeApiDependencyError,
} from "@/lib/recipe-api-v1-repository";
import { isUuidLike } from "@/lib/request-security";
import {
  getPhase6E2EFixtureDetail,
  shouldUsePhase6E2EFixture,
} from "@/lib/phase-6-e2e-fixture";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = createApiRequestId();
  const useFixture = shouldUsePhase6E2EFixture(request.headers);
  if (!useFixture) {
    const rateLimit = await consumeDistributedRateLimit(request, "recipes:detail", {
      limit: 120,
      windowSeconds: 60,
    });
    if (rateLimit.status === "limited") {
      return apiV1Error(
        "RATE_LIMITED",
        "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }
    if (rateLimit.status === "unavailable") {
      return apiV1Error(
        "DEPENDENCY_NOT_READY",
        "레시피 API를 준비 중입니다.",
        503,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }
  }

  const { id } = await context.params;
  if (!isUuidLike(id)) {
    return apiV1Error("INVALID_FILTER", "레시피 ID를 확인해 주세요.", 400, requestId);
  }

  try {
    const recipe = useFixture
      ? getPhase6E2EFixtureDetail(id)
      : await getPublicRecipeDetailV1(id);
    if (!recipe) {
      return apiV1Error("NOT_FOUND", "공개된 레시피를 찾을 수 없습니다.", 404, requestId);
    }
    return apiV1Success(recipe, requestId);
  } catch (error) {
    if (error instanceof RecipeApiDependencyError) {
      return apiV1Error(
        "DEPENDENCY_NOT_READY",
        "레시피 데이터 계약을 준비 중입니다.",
        503,
        requestId,
        { retryAfter: 60 },
      );
    }
    return apiV1Error("INTERNAL_ERROR", "레시피를 조회하지 못했습니다.", 500, requestId);
  }
}
