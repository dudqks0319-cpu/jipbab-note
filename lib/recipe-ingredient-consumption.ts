import type { IngredientFormPayload, IngredientRecord } from "../types/index.ts";
import { calculateRecipeIngredientMatch } from "./matching.ts";

export function selectConsumableRecipeIngredients(
  ingredients: IngredientRecord[],
  recipeIngredientNames: string[],
): IngredientRecord[] {
  const recipeIngredients = recipeIngredientNames.map((name) => name.trim()).filter(Boolean).join(", ");
  if (!recipeIngredients) return [];

  return ingredients.filter((ingredient) => {
    if (ingredient.deletedAt || ingredient.consumedAt || ingredient.discardedAt) return false;
    return calculateRecipeIngredientMatch([ingredient.name], recipeIngredients).matchedIngredients.length > 0;
  });
}

export function buildConsumedIngredientPayload(
  ingredient: IngredientRecord,
  recipeName: string,
  consumedAt: string,
): IngredientFormPayload {
  const consumptionNote = `${recipeName.trim() || "레시피"} 조리 후 소진`;
  const currentMemo = ingredient.memo?.trim() || null;

  return {
    name: ingredient.name,
    category: ingredient.category,
    storageType: ingredient.storageType,
    quantity: ingredient.quantity,
    expiryDate: ingredient.expiryDate,
    purchaseDate: ingredient.purchaseDate,
    openedAt: ingredient.openedAt,
    storageLocation: ingredient.storageLocation,
    unitPrice: ingredient.unitPrice,
    purchasePlace: ingredient.purchasePlace,
    consumedAt,
    discardedAt: null,
    repeatPurchase: ingredient.repeatPurchase,
    barcode: ingredient.barcode,
    imageUrl: ingredient.imageUrl,
    memo: currentMemo ? `${currentMemo} · ${consumptionNote}` : consumptionNote,
  };
}
