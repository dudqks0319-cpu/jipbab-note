export const BEGINNER_RECIPE_POSTER_PATH_PREFIX = "/images/recipes/beginner-posters/";

export function isBeginnerRecipePosterImage(imageUrl: string | null | undefined): boolean {
  return typeof imageUrl === "string" && imageUrl.startsWith(BEGINNER_RECIPE_POSTER_PATH_PREFIX);
}
