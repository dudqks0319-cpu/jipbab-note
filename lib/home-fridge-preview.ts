import { getIngredientDisplayName } from "./ingredient-display.ts";

export const HOME_FRIDGE_PREVIEW_COLUMNS = 6;
export const HOME_FRIDGE_PREVIEW_MAX_VISIBLE = 12;
export const HOME_FRIDGE_PREVIEW_CELL_SIZE_PX = 32;
export const HOME_FRIDGE_PREVIEW_COLUMN_GAP_PX = 2;

export type HomeFridgePreviewIngredient = {
  id: string;
  name: string;
};

export type HomeFridgePreviewCell<TIngredient extends HomeFridgePreviewIngredient> =
  | { kind: "ingredient"; ingredient: TIngredient }
  | { kind: "overflow"; count: number };

export function buildHomeFridgePreviewCells<TIngredient extends HomeFridgePreviewIngredient>(
  ingredients: TIngredient[],
  maxVisible = HOME_FRIDGE_PREVIEW_MAX_VISIBLE,
): HomeFridgePreviewCell<TIngredient>[] {
  const normalizedMaxVisible = Number.isInteger(maxVisible) && maxVisible > 0
    ? maxVisible
    : HOME_FRIDGE_PREVIEW_MAX_VISIBLE;

  if (ingredients.length <= normalizedMaxVisible) {
    return ingredients.map((ingredient) => ({ kind: "ingredient", ingredient }));
  }

  const visibleIngredientCount = Math.max(0, normalizedMaxVisible - 1);
  const visibleIngredients = ingredients.slice(0, visibleIngredientCount);
  const overflowCount = ingredients.length - visibleIngredientCount;

  return [
    ...visibleIngredients.map((ingredient) => ({
      kind: "ingredient" as const,
      ingredient,
    })),
    { kind: "overflow", count: overflowCount },
  ];
}

export function getHomeFridgePreviewWidth(
  columns = HOME_FRIDGE_PREVIEW_COLUMNS,
  cellSize = HOME_FRIDGE_PREVIEW_CELL_SIZE_PX,
  columnGap = HOME_FRIDGE_PREVIEW_COLUMN_GAP_PX,
): number {
  return columns * cellSize + Math.max(0, columns - 1) * columnGap;
}

export function getHomeFridgeIngredientDisplayName(name: string): string {
  const displayName = getIngredientDisplayName(name).replace(/\s+/g, "");
  const compactName = displayName.startsWith("냉동") && displayName.length > 4
    ? displayName.replace(/^냉동/, "")
    : displayName;

  return compactName.length > 4 ? `${compactName.slice(0, 3)}…` : compactName;
}
