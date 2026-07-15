import type {
  RecipeIngredientDetail,
  RecipeServingOption,
} from "../types/index.ts";

export function applyRecipeServingOption(
  ingredients: readonly RecipeIngredientDetail[],
  option: RecipeServingOption,
): RecipeIngredientDetail[] | null {
  if (ingredients.length === 0 || option.ingredientQuantities.length !== ingredients.length) {
    return null;
  }

  const quantities = new Map(
    option.ingredientQuantities.map((quantity) => [quantity.recipeIngredientId, quantity]),
  );
  if (quantities.size !== ingredients.length) return null;

  const result: RecipeIngredientDetail[] = [];
  for (const ingredient of ingredients) {
    const id = ingredient.id?.trim();
    if (!id) return null;
    const quantity = quantities.get(id);
    if (!quantity?.display.trim()) return null;
    result.push({
      ...ingredient,
      display: quantity.display,
      amount: quantity.amount,
      unit: quantity.unit,
    });
  }
  return result;
}
