import {
  CURATED_JIPBAB_RECIPES,
  type CuratedRecipe,
} from "./curated-recipes.ts";

const RECIPE_PREVIEW_TITLES = [
  "달걀죽",
  "버터간장계란밥",
  "양파계란덮밥",
  "김치볶음밥",
  "참치마요덮밥",
  "두부부침",
  "두부조림",
  "된장찌개",
  "햄야채볶음밥",
  "감자조림",
  "어묵볶음",
  "콩나물무침",
  "돼지고기 김치찌개",
  "미역국",
  "북엇국",
  "제육볶음",
  "간장마늘 닭조림",
  "잔치국수",
  "떡국떡달걀국",
  "순두부계란탕",
] as const;

function isPreviewReady(recipe: CuratedRecipe | undefined): recipe is CuratedRecipe {
  return Boolean(
    recipe &&
      recipe.source?.sourceName === "집밥노트 자체 작성" &&
      recipe.source.imageUsageAllowed === true &&
      recipe.thumbnailUrl?.startsWith("/images/recipes/") &&
      (recipe.ingredientDetails?.length ?? 0) >= 3 &&
      recipe.steps.length >= 3,
  );
}

export const RECIPE_PREVIEW_CATALOG: CuratedRecipe[] = RECIPE_PREVIEW_TITLES.map(
  (title) => CURATED_JIPBAB_RECIPES.find((recipe) => recipe.name === title),
).filter(isPreviewReady);

export function findRecipePreview(recipeId: string): CuratedRecipe | null {
  return RECIPE_PREVIEW_CATALOG.find((recipe) => recipe.id === recipeId) ?? null;
}
