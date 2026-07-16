// 레시피 목록 화면의 초보자 필터와 정렬 기준을 한곳에서 관리합니다.
import type { RecipeWithMatch } from "@/types";

export type RecipeDifficultyListFilter = "all" | "level-1" | "level-2";
export type RecipeTimeListFilter = "all" | "10" | "15" | "20";
export type RecipeToolListFilter = "all" | "no-fire" | "microwave" | "pan";
export type RecipeFridgeListFilter = "all" | "ready" | "almost";
export type RecipeListSortMode = "recommended" | "missing" | "beginner-score" | "time";

export type RecipeListFilterState = {
  difficulty: RecipeDifficultyListFilter;
  time: RecipeTimeListFilter;
  tool: RecipeToolListFilter;
  fridge: RecipeFridgeListFilter;
};

export const RECIPE_DIFFICULTY_FILTERS: Array<{ id: RecipeDifficultyListFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "level-1", label: "1단계" },
  { id: "level-2", label: "2단계 이하" },
];

export const RECIPE_TIME_FILTERS: Array<{ id: RecipeTimeListFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "10", label: "10분 이하" },
  { id: "15", label: "15분 이하" },
  { id: "20", label: "20분 이하" },
];

export const RECIPE_TOOL_FILTERS: Array<{ id: RecipeToolListFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "no-fire", label: "불 없음" },
  { id: "microwave", label: "전자레인지" },
  { id: "pan", label: "팬 1개" },
];

export const RECIPE_FRIDGE_FILTERS: Array<{ id: RecipeFridgeListFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "ready", label: "지금 가능" },
  { id: "almost", label: "2개 이하 부족" },
];

export const RECIPE_LIST_SORT_OPTIONS: Array<{ id: RecipeListSortMode; label: string }> = [
  { id: "recommended", label: "추천순" },
  { id: "missing", label: "부족 재료 적은 순" },
  { id: "beginner-score", label: "초보 점수 높은 순" },
  { id: "time", label: "빠른 순" },
];

function getTotalMinutes(recipe: RecipeWithMatch): number | null {
  return typeof recipe.totalMinutes === "number" && Number.isFinite(recipe.totalMinutes)
    ? recipe.totalMinutes
    : null;
}

function getBeginnerScore(recipe: RecipeWithMatch): number {
  return typeof recipe.beginnerScore === "number" && Number.isFinite(recipe.beginnerScore)
    ? recipe.beginnerScore
    : 0;
}

function getDifficultyLevel(recipe: RecipeWithMatch): number | null {
  return typeof recipe.difficultyLevel === "number" && Number.isFinite(recipe.difficultyLevel)
    ? recipe.difficultyLevel
    : null;
}

function usesSinglePan(recipe: RecipeWithMatch): boolean {
  const tools = recipe.requiredTools ?? [];
  return tools.some((tool) => tool.includes("프라이팬") || tool === "팬" || tool.includes("팬 1개"));
}

function compareNullableNumber(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function compareName(left: RecipeWithMatch, right: RecipeWithMatch): number {
  return left.name.localeCompare(right.name, "ko");
}

export function matchesRecipeListFilters(recipe: RecipeWithMatch, filters: RecipeListFilterState): boolean {
  const difficultyLevel = getDifficultyLevel(recipe);
  if (filters.difficulty === "level-1" && difficultyLevel !== 1) {
    return false;
  }
  if (filters.difficulty === "level-2" && (difficultyLevel === null || difficultyLevel > 2)) {
    return false;
  }

  const maxMinutes = filters.time === "all" ? null : Number(filters.time);
  if (maxMinutes !== null) {
    const totalMinutes = getTotalMinutes(recipe);
    if (totalMinutes === null || totalMinutes > maxMinutes) {
      return false;
    }
  }

  if (filters.tool === "no-fire" && recipe.noFire !== true) {
    return false;
  }
  if (filters.tool === "microwave" && recipe.microwave !== true) {
    return false;
  }
  if (filters.tool === "pan" && !usesSinglePan(recipe)) {
    return false;
  }

  if (filters.fridge === "ready" && recipe.missingIngredients.length !== 0) {
    return false;
  }
  if (filters.fridge === "almost" && recipe.missingIngredients.length > 2) {
    return false;
  }

  return true;
}

export function sortRecipeListRecipes<TRecipe extends RecipeWithMatch>(
  recipes: TRecipe[],
  sortMode: RecipeListSortMode,
  favoriteIds: ReadonlySet<string> = new Set(),
): TRecipe[] {
  return [...recipes].sort((left, right) => {
    if (sortMode === "recommended") {
      const favoriteDelta = Number(favoriteIds.has(right.id)) - Number(favoriteIds.has(left.id));
      if (favoriteDelta !== 0) return favoriteDelta;
      if (right.matchRate !== left.matchRate) return right.matchRate - left.matchRate;
      if (right.matchedIngredients.length !== left.matchedIngredients.length) {
        return right.matchedIngredients.length - left.matchedIngredients.length;
      }
      const missingDelta = left.missingIngredients.length - right.missingIngredients.length;
      if (missingDelta !== 0) return missingDelta;
      const beginnerDelta = getBeginnerScore(right) - getBeginnerScore(left);
      if (beginnerDelta !== 0) return beginnerDelta;
      return compareName(left, right);
    }

    if (sortMode === "missing") {
      const missingDelta = left.missingIngredients.length - right.missingIngredients.length;
      if (missingDelta !== 0) return missingDelta;
      if (right.matchRate !== left.matchRate) return right.matchRate - left.matchRate;
      const beginnerDelta = getBeginnerScore(right) - getBeginnerScore(left);
      if (beginnerDelta !== 0) return beginnerDelta;
      return compareName(left, right);
    }

    if (sortMode === "beginner-score") {
      const beginnerDelta = getBeginnerScore(right) - getBeginnerScore(left);
      if (beginnerDelta !== 0) return beginnerDelta;
      const difficultyDelta = compareNullableNumber(getDifficultyLevel(left), getDifficultyLevel(right));
      if (difficultyDelta !== 0) return difficultyDelta;
      const timeDelta = compareNullableNumber(getTotalMinutes(left), getTotalMinutes(right));
      if (timeDelta !== 0) return timeDelta;
      return compareName(left, right);
    }

    const timeDelta = compareNullableNumber(getTotalMinutes(left), getTotalMinutes(right));
    if (timeDelta !== 0) return timeDelta;
    const missingDelta = left.missingIngredients.length - right.missingIngredients.length;
    if (missingDelta !== 0) return missingDelta;
    const beginnerDelta = getBeginnerScore(right) - getBeginnerScore(left);
    if (beginnerDelta !== 0) return beginnerDelta;
    return compareName(left, right);
  });
}
