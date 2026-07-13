import { ApiV1ValidationError } from "@/lib/api-v1-contract";
import {
  apiV1Error,
  apiV1Success,
  createApiRequestId,
} from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  listPublicRecipesV1,
  RecipeApiDependencyError,
} from "@/lib/recipe-api-v1-repository";
import {
  parseRecipeRecommendationV1Input,
  rankRecipeRecommendationsV1,
} from "@/lib/recipe-recommendation-v1";
import { readBoundedJsonObject } from "@/lib/request-security";
import {
  listPhase6E2EFixtureRecipes,
  shouldUsePhase6E2EFixture,
} from "@/lib/phase-6-e2e-fixture";

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const requestId = createApiRequestId();
  const useFixture = shouldUsePhase6E2EFixture(request.headers);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return apiV1Error("INVALID_BODY", "요청 본문이 너무 큽니다.", 413, requestId);
  }

  if (!useFixture) {
    const rateLimit = await consumeDistributedRateLimit(request, "recipes:recommendations", {
      limit: 30,
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
        "추천 API를 준비 중입니다.",
        503,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }
  }

  try {
    const bodyResult = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (bodyResult.status === "too_large") {
      return apiV1Error("INVALID_BODY", "요청 본문이 너무 큽니다.", 413, requestId);
    }
    if (bodyResult.status === "invalid") {
      throw new ApiV1ValidationError("INVALID_BODY", "요청 본문을 확인해 주세요.");
    }
    const input = parseRecipeRecommendationV1Input(bodyResult.value);
    const candidateInput = {
      query: null,
      categoryId: null,
      difficulty: input.difficulty,
      maxTotalTime: input.maxTime,
      maxMissingIngredients: input.maxMissingIngredients,
      ingredientIds: input.ingredientIds,
      excludeIngredientIds: input.excludedIngredientIds,
      sort: "recommended",
      cursor: null,
      limit: 200,
    } as const;
    const candidates = useFixture
      ? listPhase6E2EFixtureRecipes(candidateInput)
      : await listPublicRecipesV1(candidateInput);
    const recommendations = rankRecipeRecommendationsV1(candidates.recipes, input);
    return apiV1Success(
      {
        recommendations,
        candidateCount: candidates.recipes.length,
      },
      requestId,
    );
  } catch (error) {
    if (error instanceof ApiV1ValidationError) {
      return apiV1Error("INVALID_BODY", error.message, 400, requestId);
    }
    if (error instanceof RecipeApiDependencyError) {
      return apiV1Error(
        "DEPENDENCY_NOT_READY",
        "레시피 데이터 계약을 준비 중입니다.",
        503,
        requestId,
        { retryAfter: 60 },
      );
    }
    return apiV1Error("INTERNAL_ERROR", "추천을 만들지 못했습니다.", 500, requestId);
  }
}
