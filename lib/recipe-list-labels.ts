// 이 파일은 레시피 목록에서 쓰는 준비 상태/초보 검수 표시 로직을 제공합니다.
import type { CuratedRecipe } from "@/lib/curated-recipes";
import type { RecipeWithMatch } from "@/types";

export type RecipeQuickFilter = "all" | "ready" | "one-more" | "beginner" | "quick" | "no-fire" | "microwave";

export const RECIPE_QUICK_FILTERS: Array<{ id: RecipeQuickFilter; label: string }> = [
  { id: "all", label: "추천" },
  { id: "ready", label: "바로 가능" },
  { id: "one-more", label: "1개만 사면" },
  { id: "no-fire", label: "불 없이" },
  { id: "microwave", label: "전자레인지" },
];

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
  if (quickFilter === "no-fire") {
    return recipe.noFire === true || curated?.noFire === true;
  }
  if (quickFilter === "microwave") {
    return recipe.microwave === true || curated?.microwave === true;
  }
  return true;
}
