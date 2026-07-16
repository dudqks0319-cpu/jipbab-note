import { ApiV1ValidationError } from "./api-v1-contract.ts";
import { parseRecipeAllergenIds, type RecipeAllergenId } from "./recipe-allergens.ts";
import type { RecipeV1Card } from "./recipe-api-v1-repository.ts";

const INGREDIENT_ID_PATTERN = /^[a-z0-9-]{1,80}$/;
const RECOMMENDATION_INPUT_KEYS = new Set([
  "ingredientIds",
  "expiringIngredientIds",
  "excludedIngredientIds",
  "excludedIngredients",
  "excludedAllergenIds",
  "maxTime",
  "difficulty",
  "maxMissingIngredients",
  "servings",
  "limit",
]);

export interface RecipeRecommendationV1Input {
  ingredientIds: string[];
  expiringIngredientIds: string[];
  excludedIngredientIds: string[];
  excludedAllergenIds: RecipeAllergenId[];
  maxTime: number | null;
  difficulty: number | null;
  maxMissingIngredients: number;
  servings: number;
  limit: number;
}

export interface RecipeRecommendationV1Item {
  recipe: RecipeV1Card;
  score: number;
  reasons: string[];
  requestedServings: number;
}

function integer(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
  fallback: number | null,
): number | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ApiV1ValidationError("INVALID_BODY", `${name} 값을 확인해 주세요.`);
  }
  return value;
}

function idArray(value: unknown, name: string, maximum: number, required: boolean): string[] {
  if (!Array.isArray(value)) {
    if (!required && (value === undefined || value === null)) return [];
    throw new ApiV1ValidationError("INVALID_BODY", `${name} 목록을 확인해 주세요.`);
  }
  if ((required && value.length === 0) || value.length > maximum) {
    throw new ApiV1ValidationError("INVALID_BODY", `${name} 목록을 확인해 주세요.`);
  }
  const values = value.map((item) =>
    typeof item === "string" ? item.trim().toLowerCase() : "",
  );
  if (values.some((item) => !INGREDIENT_ID_PATTERN.test(item))) {
    throw new ApiV1ValidationError("INVALID_BODY", `${name} 목록을 확인해 주세요.`);
  }
  return [...new Set(values)];
}

export function parseRecipeRecommendationV1Input(
  body: Record<string, unknown>,
): RecipeRecommendationV1Input {
  if (
    Object.keys(body).some((key) => !RECOMMENDATION_INPUT_KEYS.has(key)) ||
    (body.excludedIngredientIds !== undefined && body.excludedIngredients !== undefined)
  ) {
    throw new ApiV1ValidationError("INVALID_BODY", "지원하지 않는 추천 입력 항목이 있습니다.");
  }
  const ingredientIds = idArray(body.ingredientIds, "ingredientIds", 100, true);
  const expiringIngredientIds = idArray(
    body.expiringIngredientIds,
    "expiringIngredientIds",
    30,
    false,
  );
  const excludedIngredientIds = idArray(
    body.excludedIngredientIds ?? body.excludedIngredients,
    "excludedIngredientIds",
    30,
    false,
  );
  let excludedAllergenIds: RecipeAllergenId[];
  try {
    excludedAllergenIds = parseRecipeAllergenIds(body.excludedAllergenIds);
  } catch {
    throw new ApiV1ValidationError("INVALID_BODY", "excludedAllergenIds 목록을 확인해 주세요.");
  }
  const owned = new Set(ingredientIds);
  if (expiringIngredientIds.some((id) => !owned.has(id))) {
    throw new ApiV1ValidationError(
      "INVALID_BODY",
      "expiringIngredientIds는 보유 재료에 포함되어야 합니다.",
    );
  }

  return {
    ingredientIds,
    expiringIngredientIds,
    excludedIngredientIds,
    excludedAllergenIds,
    maxTime: integer(body.maxTime, "maxTime", 1, 1440, null),
    difficulty: integer(body.difficulty, "difficulty", 1, 3, null),
    maxMissingIngredients: integer(
      body.maxMissingIngredients,
      "maxMissingIngredients",
      0,
      50,
      5,
    ) as number,
    servings: integer(body.servings, "servings", 1, 20, 2) as number,
    limit: integer(body.limit, "limit", 1, 20, 10) as number,
  };
}

export function rankRecipeRecommendationsV1(
  recipes: RecipeV1Card[],
  input: RecipeRecommendationV1Input,
): RecipeRecommendationV1Item[] {
  const expiring = new Set(input.expiringIngredientIds);
  return recipes
    .map((recipe) => {
      const expiringMatches = recipe.matchedIngredientIds.filter((id) => expiring.has(id)).length;
      const matchRatio =
        recipe.requiredIngredientCount > 0
          ? recipe.ownedIngredientCount / recipe.requiredIngredientCount
          : 0;
      const score =
        matchRatio * 100 -
        recipe.missingIngredientIds.length * 18 +
        expiringMatches * 12 +
        Math.max(0, 4 - recipe.difficulty) * 3 +
        Math.max(0, 20 - recipe.totalTimeMinutes) * 0.25 -
        Math.abs(recipe.servings - input.servings) * 0.5;
      const reasons: string[] = [];
      if (recipe.missingIngredientIds.length === 0) {
        reasons.push("필수 재료가 모두 있어요.");
      } else if (recipe.missingIngredientIds.length === 1) {
        reasons.push("재료 1개만 더 있으면 만들 수 있어요.");
      } else {
        reasons.push(`필수 재료 ${recipe.requiredIngredientCount}개 중 ${recipe.ownedIngredientCount}개가 있어요.`);
      }
      if (expiringMatches > 0) {
        reasons.push(`소비기한이 가까운 재료 ${expiringMatches}개를 사용할 수 있어요.`);
      }
      if (recipe.difficulty === 1) {
        reasons.push("초보자가 따라가기 쉬운 난이도예요.");
      }
      return {
        recipe,
        score: Math.round(score * 100) / 100,
        reasons,
        requestedServings: input.servings,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.recipe.missingIngredientIds.length - right.recipe.missingIngredientIds.length ||
        left.recipe.totalTimeMinutes - right.recipe.totalTimeMinutes ||
        left.recipe.id.localeCompare(right.recipe.id),
    )
    .slice(0, input.limit);
}
