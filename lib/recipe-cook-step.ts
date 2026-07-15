import type { RecipeDetailStep, RecipeIngredientDetail } from "@/types";

export type RecipeCookStepIngredient = {
  id: string;
  name: string;
  display: string;
  usageText: string | null;
};

export function resolveRecipeCookStepIngredients(
  step: Pick<RecipeDetailStep, "ingredientUsages">,
  ingredients: readonly RecipeIngredientDetail[],
): RecipeCookStepIngredient[] {
  const ingredientsById = new Map<string, RecipeIngredientDetail>();
  for (const ingredient of ingredients) {
    const id = ingredient.id?.trim();
    if (id) ingredientsById.set(id, ingredient);
  }

  const resolved: RecipeCookStepIngredient[] = [];
  const seen = new Set<string>();
  for (const usage of step.ingredientUsages ?? []) {
    const id = usage.recipeIngredientId.trim();
    if (!id || seen.has(id)) continue;
    const ingredient = ingredientsById.get(id);
    if (!ingredient) continue;
    seen.add(id);
    resolved.push({
      id,
      name: ingredient.name,
      display: ingredient.display,
      usageText: usage.usageText?.trim() || null,
    });
  }
  return resolved;
}
