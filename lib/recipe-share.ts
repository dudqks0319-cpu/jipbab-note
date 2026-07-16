export type RecipeShareRoute = "detail" | "preview";

const SAFE_RECIPE_ID_PATTERN = /^[a-zA-Z0-9-]+$/;

export function buildRecipeSharePath(
  recipeId: string,
  route: RecipeShareRoute = "detail",
): string {
  const normalizedId = recipeId.trim();
  if (!SAFE_RECIPE_ID_PATTERN.test(normalizedId)) {
    throw new Error("공유할 레시피 ID가 올바르지 않습니다.");
  }

  return route === "preview"
    ? `/recipe/preview/${normalizedId}`
    : `/recipe/${normalizedId}`;
}

export function buildRecipeShareUrl(
  origin: string,
  recipeId: string,
  route: RecipeShareRoute = "detail",
): string {
  const baseUrl = new URL(origin);
  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    throw new Error("공유 주소는 http 또는 https만 사용할 수 있습니다.");
  }

  return new URL(buildRecipeSharePath(recipeId, route), baseUrl).toString();
}
