export const BEGINNER_RECIPE_POSTER_PATH_PREFIX = "/images/recipes/beginner-posters/";
export const BEGINNER_RECIPE_SCENE_PATH_PREFIX = "/images/recipes/beginner-scenes/";

export function isBeginnerRecipePosterImage(imageUrl: string | null | undefined): boolean {
  return typeof imageUrl === "string" && imageUrl.startsWith(BEGINNER_RECIPE_POSTER_PATH_PREFIX);
}

export function isBeginnerRecipeSceneImage(imageUrl: string | null | undefined): boolean {
  return typeof imageUrl === "string" && imageUrl.startsWith(BEGINNER_RECIPE_SCENE_PATH_PREFIX);
}

export function isBeginnerRecipeGeneratedImage(imageUrl: string | null | undefined): boolean {
  return isBeginnerRecipePosterImage(imageUrl) || isBeginnerRecipeSceneImage(imageUrl);
}
