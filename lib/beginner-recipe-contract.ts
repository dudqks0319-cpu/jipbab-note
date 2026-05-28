// 이 파일은 출시 홈 추천에 올릴 수 있는 초보자 레시피 계약을 검증합니다.
import type { RecipeDetailRecord, RecipeRecord, RecipeSafetyLevel } from "@/types";

export const BEGINNER_HOME_CONTRACT = {
  minBeginnerScore: 80,
  maxDifficultyLevel: 2,
  maxRequiredIngredients: 7,
  maxRequiredTools: 3,
  maxTotalMinutes: 20,
  maxSteps: 6,
  allowedSafetyLevels: ["A", "B"] satisfies RecipeSafetyLevel[],
  allowedSourceTypes: ["original", "original-general-principle", "public-data", "licensed-kogl"] as const,
} as const;

export type BeginnerRecipeContractIssue = {
  field: string;
  message: string;
};

type BeginnerContractCandidate = RecipeRecord | RecipeDetailRecord;

const getRequiredIngredientCount = (recipe: BeginnerContractCandidate): number => {
  if ("ingredientList" in recipe && Array.isArray(recipe.ingredientList)) {
    return recipe.ingredientList.length;
  }
  return recipe.ingredients
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean).length;
};

const getStepCount = (recipe: BeginnerContractCandidate): number => {
  if ("steps" in recipe && Array.isArray(recipe.steps)) {
    return recipe.steps.length;
  }
  return 0;
};

export function getRecipeSafetyLevel(recipe: BeginnerContractCandidate): RecipeSafetyLevel | null {
  return recipe.safety?.safetyLevel ?? null;
}

export function isRecipeRightsSafeForApp(recipe: BeginnerContractCandidate): boolean {
  const safetyLevel = getRecipeSafetyLevel(recipe);
  const sourceType = recipe.source?.sourceType;
  const adaptedByJipbabNote =
    recipe.source?.adaptedByJipbabNote === true || recipe.safety?.adaptedByJipbabNote === true;
  const imageUsageAllowed =
    recipe.source?.imageUsageAllowed === true || recipe.safety?.imageUsageAllowed === true;
  return (
    safetyLevel !== null &&
    BEGINNER_HOME_CONTRACT.allowedSafetyLevels.some((allowedLevel) => allowedLevel === safetyLevel) &&
    Boolean(sourceType && BEGINNER_HOME_CONTRACT.allowedSourceTypes.some((allowed) => allowed === sourceType)) &&
    adaptedByJipbabNote &&
    imageUsageAllowed &&
    Boolean(recipe.source?.licenseOrUsageNote?.trim()) &&
    Boolean(recipe.source?.rightsNote?.trim())
  );
}

export function validateBeginnerRecipeContract(
  recipe: BeginnerContractCandidate,
): BeginnerRecipeContractIssue[] {
  const issues: BeginnerRecipeContractIssue[] = [];

  if (typeof recipe.beginnerScore !== "number") {
    issues.push({ field: "beginnerScore", message: "beginnerScore가 없습니다." });
  } else if (recipe.beginnerScore < BEGINNER_HOME_CONTRACT.minBeginnerScore) {
    issues.push({ field: "beginnerScore", message: "홈 추천 기준보다 낮습니다." });
  }

  if (typeof recipe.difficultyLevel !== "number") {
    issues.push({ field: "difficultyLevel", message: "difficultyLevel이 없습니다." });
  } else if (recipe.difficultyLevel > BEGINNER_HOME_CONTRACT.maxDifficultyLevel) {
    issues.push({ field: "difficultyLevel", message: "홈 추천 난이도 기준보다 높습니다." });
  }

  if ((recipe.totalMinutes ?? Number.POSITIVE_INFINITY) > BEGINNER_HOME_CONTRACT.maxTotalMinutes) {
    issues.push({ field: "totalMinutes", message: "20분 이내 홈 추천 기준을 넘습니다." });
  }

  if ((recipe.requiredTools?.length ?? Number.POSITIVE_INFINITY) > BEGINNER_HOME_CONTRACT.maxRequiredTools) {
    issues.push({ field: "requiredTools", message: "필요 도구가 3개를 넘습니다." });
  }

  if (getRequiredIngredientCount(recipe) > BEGINNER_HOME_CONTRACT.maxRequiredIngredients) {
    issues.push({ field: "ingredients.required", message: "필수 재료가 7개를 넘습니다." });
  }

  const stepCount = getStepCount(recipe);
  if (stepCount > BEGINNER_HOME_CONTRACT.maxSteps) {
    issues.push({ field: "steps", message: "조리 단계가 6단계를 넘습니다." });
  }

  if (!recipe.fallbackMeal) {
    issues.push({ field: "fallbackMeal", message: "실패했을 때 살릴 메뉴가 없습니다." });
  }

  if (!recipe.source || !recipe.safety) {
    issues.push({ field: "source/safety", message: "출처와 safety 메타데이터가 없습니다." });
  } else if (!isRecipeRightsSafeForApp(recipe)) {
    issues.push({ field: "source/safety", message: "앱 본문 노출 안전 기준을 통과하지 못했습니다." });
  }

  if (recipe.publishStatus && recipe.publishStatus !== "published") {
    issues.push({ field: "publishStatus", message: "홈 추천은 published 레시피만 사용할 수 있습니다." });
  }

  return issues;
}

export function isBeginnerHomeRecommendation(recipe: BeginnerContractCandidate): boolean {
  return validateBeginnerRecipeContract(recipe).length === 0;
}

export function filterBeginnerHomeRecipes<TRecipe extends BeginnerContractCandidate>(
  recipes: TRecipe[],
): TRecipe[] {
  return recipes.filter(isBeginnerHomeRecommendation);
}
