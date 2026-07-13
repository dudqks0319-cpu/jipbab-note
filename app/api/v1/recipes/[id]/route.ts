import { createApiV1Responder } from "@/lib/api-v1-response";
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
  const respond = createApiV1Responder("GET /api/v1/recipes/:id");
  const useFixture = shouldUsePhase6E2EFixture(request.headers);
  if (!useFixture) {
    const rateLimit = await consumeDistributedRateLimit(request, "recipes:detail", {
      limit: 120,
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
        "레시피 API를 준비 중입니다.",
        503,
        { retryAfter: rateLimit.retryAfter },
      );
    }
  }

  const { id } = await context.params;
  if (!isUuidLike(id)) {
    return respond.error("INVALID_FILTER", "레시피 ID를 확인해 주세요.", 400);
  }

  try {
    const recipe = useFixture
      ? getPhase6E2EFixtureDetail(id)
      : await getPublicRecipeDetailV1(id);
    if (!recipe) {
      return respond.error("NOT_FOUND", "공개된 레시피를 찾을 수 없습니다.", 404);
    }
    return respond.success(recipe);
  } catch (error) {
    if (error instanceof RecipeApiDependencyError) {
      return respond.error(
        "DEPENDENCY_NOT_READY",
        "레시피 데이터 계약을 준비 중입니다.",
        503,
        { retryAfter: 60 },
      );
    }
    return respond.error("INTERNAL_ERROR", "레시피를 조회하지 못했습니다.", 500);
  }
}
