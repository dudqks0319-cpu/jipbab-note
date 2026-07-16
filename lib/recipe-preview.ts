import {
  CURATED_JIPBAB_RECIPES,
  type CuratedRecipe,
} from "./curated-recipes.ts";

const RECIPE_PREVIEW_TITLES = [
  "버터간장계란밥",
  "김치볶음밥",
  "참치마요덮밥",
  "햄야채볶음밥",
  "스팸마요덮밥",
  "간장버터밥",
  "참치주먹밥",
  "두부부침",
  "두부조림",
  "어묵볶음",
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
