// 이 파일은 레시피 목록에서 쓰는 준비 상태/초보 검수 표시 로직을 제공합니다.
import type { CuratedRecipe } from "@/lib/curated-recipes";
import {
  DISPLAY_RECIPE_CATEGORIES,
  type DisplayRecipeCategory,
  type RecipeWithMatch,
} from "../types/index.ts";

export type RecipeQuickFilter =
  | "all"
  | "ready"
  | "one-more"
  | "beginner"
  | "quick"
  | "few-ingredients"
  | "few-tools"
  | "no-fire"
  | "microwave";

export const RECIPE_QUICK_FILTERS: Array<{ id: RecipeQuickFilter; label: string }> = [
  { id: "quick", label: "10분 이내" },
  { id: "few-ingredients", label: "재료 5개 이하" },
  { id: "few-tools", label: "설거지 적음" },
];

export function getPreviewDisplayCategory(
  recipe: Pick<CuratedRecipe, "category" | "name">,
): DisplayRecipeCategory {
  const { category, name } = recipe;
  if (category === "밥" || category === "일품" || category.includes("밥") || name.includes("덮밥")) {
    return "밥·한 그릇";
  }
  if (category === "국·찌개" || category === "국&찌개" || category.includes("국/찌개")) {
    return "찌개·전골";
  }
  if (category.includes("두부")) return "두부";
  if (DISPLAY_RECIPE_CATEGORIES.includes(category as DisplayRecipeCategory)) {
    return category as DisplayRecipeCategory;
  }
  return "기타";
}

export function getReadinessBadge(
  missingCount: number,
  matchedCount: number,
  fallbackLabel?: string,
): { text: string; tone: string } {
  if (missingCount === 0) {
    return { text: "바로 가능", tone: "bg-[#eef6df] text-[#3d7b38]" };
  }
  if (missingCount === 1) {
    return { text: "1개만 사면 가능", tone: "bg-[#fff0e4] text-[#d94d19]" };
  }
  if (matchedCount > 0) {
    return { text: `${missingCount}개 필요`, tone: "bg-[#fff7ed] text-[#a66a17]" };
  }
  return { text: fallbackLabel ?? "레시피 탐색", tone: "bg-[#f1e4d7] text-[#7d6d5f]" };
}

export function isBeginnerVerifiedRecipe(curated: CuratedRecipe | undefined): boolean {
  return Boolean(curated?.ingredientDetails?.length) &&
    Boolean(curated?.measurementTips?.length) &&
    Boolean(curated?.steps.every((step) => step.beginnerTip && step.visualCue));
}

function getRequiredIngredientCount(curated: CuratedRecipe | undefined, fallbackCount: number): number {
  if (!curated?.ingredientDetails?.length) return fallbackCount;
  return curated.ingredientDetails.filter((ingredient) => ingredient.required !== false).length;
}

function hasLowCleanupToolCount(requiredTools: string[] | undefined): boolean {
  return Boolean(requiredTools?.length) && (requiredTools?.length ?? 0) <= 3;
}

export function matchesRecipeQuickFilter(
  recipe: RecipeWithMatch,
  curated: CuratedRecipe | undefined,
  quickFilter: RecipeQuickFilter,
): boolean {
  if (quickFilter === "ready") {
    return recipe.missingIngredients.length === 0;
  }
  if (quickFilter === "one-more") {
    return recipe.missingIngredients.length === 1;
  }
  if (quickFilter === "beginner") {
    return recipe.publicationEvidence?.reviewedForBeginner === true || isBeginnerVerifiedRecipe(curated);
  }
  if (quickFilter === "quick") {
    return (
      (typeof recipe.totalMinutes === "number" && recipe.totalMinutes <= 10) ||
      (typeof curated?.cookingTime === "number" && curated.cookingTime <= 10)
    );
  }
  if (quickFilter === "few-ingredients") {
    const ingredientCount = getRequiredIngredientCount(curated, recipe.totalRecipeIngredients);
    return ingredientCount <= 5;
  }
  if (quickFilter === "few-tools") {
    return hasLowCleanupToolCount(recipe.requiredTools ?? curated?.requiredTools);
  }
  if (quickFilter === "no-fire") {
    return recipe.noFire === true || curated?.noFire === true;
  }
  if (quickFilter === "microwave") {
    return recipe.microwave === true || curated?.microwave === true;
  }
  return true;
}

export function matchesPreviewQuickFilter(
  recipe: CuratedRecipe,
  quickFilter: RecipeQuickFilter,
): boolean {
  if (quickFilter === "quick") {
    return typeof recipe.cookingTime === "number" && recipe.cookingTime <= 10;
  }
  if (quickFilter === "few-ingredients") {
    return getRequiredIngredientCount(recipe, 0) <= 5;
  }
  if (quickFilter === "few-tools") {
    return hasLowCleanupToolCount(recipe.requiredTools);
  }
  if (quickFilter === "beginner") {
    return isBeginnerVerifiedRecipe(recipe);
  }
  if (quickFilter === "no-fire") {
    return recipe.noFire === true;
  }
  if (quickFilter === "microwave") {
    return recipe.microwave === true;
  }
  if (quickFilter === "ready" || quickFilter === "one-more") {
    return false;
  }
  return true;
}
