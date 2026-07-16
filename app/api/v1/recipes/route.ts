import {
  ApiV1ValidationError,
  parseApiIdList,
  parseApiIntegerFilter,
  parseApiLimit,
  parseApiQuery,
  parseApiSort,
} from "@/lib/api-v1-contract";
import {
  apiV1Error,
  apiV1Success,
  createApiRequestId,
} from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  listPublicRecipesV1,
  parseRepositoryCursor,
  RecipeApiDependencyError,
} from "@/lib/recipe-api-v1-repository";
import { isCanonicalRecipeCategoryId } from "@/lib/recipe-category-taxonomy";

export async function GET(request: Request) {
  const requestId = createApiRequestId();
  const rateLimit = await consumeDistributedRateLimit(request, "recipes:list", {
    limit: 60,
    windowSeconds: 60,
    dailyLimit: 2_000,
    globalLimit: 1_200,
    globalDailyLimit: 50_000,
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

  try {
    const { searchParams } = new URL(request.url);
    const categoryValue = searchParams.get("category")?.trim().toLowerCase() ?? "";
    if (categoryValue && !isCanonicalRecipeCategoryId(categoryValue)) {
      throw new ApiV1ValidationError("INVALID_FILTER", "category 필터를 확인해 주세요.");
    }
    const beginnerReviewed = searchParams.get("beginnerReviewed");
    if (beginnerReviewed && beginnerReviewed !== "true" && beginnerReviewed !== "1") {
      throw new ApiV1ValidationError(
        "INVALID_FILTER",
        "공개 API는 초보자 검수 완료 레시피만 반환합니다.",
      );
    }

    const sort = parseApiSort(searchParams.get("sort"));
    const result = await listPublicRecipesV1({
      query: parseApiQuery(searchParams.get("q")),
      categoryId: categoryValue && isCanonicalRecipeCategoryId(categoryValue) ? categoryValue : null,
      difficulty: parseApiIntegerFilter(searchParams.get("difficulty"), "difficulty", 1, 3),
      maxTotalTime: parseApiIntegerFilter(
        searchParams.get("maxTotalTime"),
        "maxTotalTime",
        1,
        1440,
      ),
      maxMissingIngredients: parseApiIntegerFilter(
        searchParams.get("maxMissingIngredients"),
        "maxMissingIngredients",
        0,
        50,
      ),
      ingredientIds: parseApiIdList(searchParams.get("ingredientIds"), "ingredientIds"),
      excludeIngredientIds: parseApiIdList(
        searchParams.get("excludeIngredientIds"),
        "excludeIngredientIds",
      ),
      sort,
      cursor: parseRepositoryCursor(searchParams.get("cursor"), sort),
      limit: parseApiLimit(searchParams.get("limit")),
    });

    return apiV1Success(result, requestId);
  } catch (error) {
    if (error instanceof ApiV1ValidationError) {
      return apiV1Error(
        error.code as "INVALID_QUERY" | "INVALID_FILTER" | "INVALID_CURSOR" | "INVALID_LIMIT",
        error.message,
        400,
        requestId,
      );
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
    return apiV1Error("INTERNAL_ERROR", "레시피를 조회하지 못했습니다.", 500, requestId);
  }
}
