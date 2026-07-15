import { v5 as uuidv5 } from "uuid";

import { getIngredientCatalog } from "./ingredient-catalog.ts";
import type { RecipeV1Detail } from "./recipe-api-v1-repository.ts";
import { isUuidLike } from "./request-security.ts";
import {
  getShoppingIngredientIdentity,
  mergeShoppingQuantityDisplay,
} from "./shopping-item-utils.ts";
import type { IngredientCategory } from "../types/index.ts";

const INPUT_KEYS = ["recipeId", "servings", "selectedIngredientIds"] as const;
const INPUT_KEY_SET = new Set<string>(INPUT_KEYS);
const MAX_SELECTED_INGREDIENTS = 50;
const MAX_SERVINGS = 20;
const SHOPPING_ITEM_NAMESPACE = "5cf84db8-94b5-5aca-bb86-c31bdf750e13";

export type ShoppingFromRecipeV1Input = {
  recipeId: string;
  servings: number;
  selectedIngredientIds: string[];
};

export type ShoppingFromRecipeCandidate = {
  recipeIngredientId: string;
  ingredientIdentity: string;
  name: string;
  quantity: string;
  category: IngredientCategory | null;
  sourceRecipeId: string;
  sourceRecipeName: string;
};

export type ShoppingFromRecipeDatabaseRow = {
  id: string;
  device_id: string;
  user_id: string;
  family_group_id: string | null;
  name: string;
  quantity: string | null;
  category: IngredientCategory | null;
  checked: boolean;
  source_recipe_id: string | null;
  source_recipe_name: string | null;
};

export type ShoppingFromRecipeUpsertRow = ShoppingFromRecipeDatabaseRow;

export type ShoppingFromRecipeUpsertResult = {
  rows: ShoppingFromRecipeUpsertRow[];
  addedCount: number;
  mergedCount: number;
};

export class ShoppingFromRecipeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShoppingFromRecipeValidationError";
  }
}

function isExactInput(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === INPUT_KEYS.length && keys.every((key) => INPUT_KEY_SET.has(key));
}

export function parseShoppingFromRecipeV1Input(
  value: Record<string, unknown>,
): ShoppingFromRecipeV1Input {
  if (!isExactInput(value)) {
    throw new ShoppingFromRecipeValidationError("장보기 요청 필드를 확인해 주세요.");
  }

  const recipeId = typeof value.recipeId === "string" ? value.recipeId.trim() : "";
  if (!isUuidLike(recipeId)) {
    throw new ShoppingFromRecipeValidationError("레시피 ID를 확인해 주세요.");
  }
  if (!Number.isSafeInteger(value.servings) || Number(value.servings) < 1 || Number(value.servings) > MAX_SERVINGS) {
    throw new ShoppingFromRecipeValidationError("검수된 인분 수를 확인해 주세요.");
  }
  if (
    !Array.isArray(value.selectedIngredientIds) ||
    value.selectedIngredientIds.length < 1 ||
    value.selectedIngredientIds.length > MAX_SELECTED_INGREDIENTS
  ) {
    throw new ShoppingFromRecipeValidationError("선택한 재료를 확인해 주세요.");
  }

  const selectedIngredientIds = value.selectedIngredientIds.map((item) =>
    typeof item === "string" ? item.trim() : "",
  );
  if (
    selectedIngredientIds.some((item) => !isUuidLike(item)) ||
    new Set(selectedIngredientIds).size !== selectedIngredientIds.length
  ) {
    throw new ShoppingFromRecipeValidationError("선택한 재료 ID를 확인해 주세요.");
  }

  return {
    recipeId,
    servings: Number(value.servings),
    selectedIngredientIds,
  };
}

const catalogById = new Map(getIngredientCatalog().map((item) => [item.id, item]));

export function buildShoppingFromRecipeCandidates(
  recipe: RecipeV1Detail,
  input: ShoppingFromRecipeV1Input,
): ShoppingFromRecipeCandidate[] {
  if (recipe.id !== input.recipeId) {
    throw new ShoppingFromRecipeValidationError("장보기 대상 레시피를 확인해 주세요.");
  }

  const servingOption = recipe.servingOptions.find((option) => option.servings === input.servings);
  if (!servingOption) {
    throw new ShoppingFromRecipeValidationError("검수된 인분 옵션을 선택해 주세요.");
  }

  const selectedIds = new Set(input.selectedIngredientIds);
  const ingredientsById = new Map(recipe.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  if (input.selectedIngredientIds.some((id) => !ingredientsById.has(id))) {
    throw new ShoppingFromRecipeValidationError("레시피에 포함된 재료만 선택해 주세요.");
  }

  const quantitiesById = new Map(
    servingOption.ingredientQuantities.map((quantity) => [quantity.recipeIngredientId, quantity.quantity]),
  );

  return recipe.ingredients
    .filter((ingredient) => selectedIds.has(ingredient.id))
    .map((ingredient) => {
      const quantity = quantitiesById.get(ingredient.id)?.text.trim();
      if (!quantity) {
        throw new ShoppingFromRecipeValidationError("검수된 재료 수량을 확인해 주세요.");
      }
      const catalogItem = catalogById.get(ingredient.ingredientId);
      return {
        recipeIngredientId: ingredient.id,
        ingredientIdentity: getShoppingIngredientIdentity(ingredient.displayName),
        name: ingredient.displayName,
        quantity,
        category: catalogItem?.category ?? null,
        sourceRecipeId: recipe.id,
        sourceRecipeName: recipe.title,
      };
    });
}

function mergeSourceDisplay(current: string | null, next: string): string {
  return Array.from(
    new Set(
      [current, next]
        .flatMap((value) => value?.split(" · ") ?? [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).join(" · ");
}

function collapseCandidates(candidates: ShoppingFromRecipeCandidate[]): ShoppingFromRecipeCandidate[] {
  const collapsed = new Map<string, ShoppingFromRecipeCandidate>();
  for (const candidate of candidates) {
    const current = collapsed.get(candidate.ingredientIdentity);
    if (!current) {
      collapsed.set(candidate.ingredientIdentity, candidate);
      continue;
    }
    collapsed.set(candidate.ingredientIdentity, {
      ...current,
      quantity: mergeShoppingQuantityDisplay(current.quantity, candidate.quantity) ?? current.quantity,
      category: current.category ?? candidate.category,
    });
  }
  return [...collapsed.values()];
}

export function buildShoppingFromRecipeUpserts(
  existingRows: ShoppingFromRecipeDatabaseRow[],
  candidates: ShoppingFromRecipeCandidate[],
  userId: string,
): ShoppingFromRecipeUpsertResult {
  if (!isUuidLike(userId)) {
    throw new Error("shopping_scope_mismatch");
  }
  if (existingRows.some((row) => row.user_id !== userId || row.family_group_id !== null)) {
    throw new Error("shopping_scope_mismatch");
  }

  const existingByIdentity = new Map<string, ShoppingFromRecipeDatabaseRow>();
  for (const row of existingRows) {
    const identity = getShoppingIngredientIdentity(row.name);
    if (!existingByIdentity.has(identity)) {
      existingByIdentity.set(identity, row);
    }
  }

  let addedCount = 0;
  let mergedCount = 0;
  const rows = collapseCandidates(candidates).map((candidate): ShoppingFromRecipeUpsertRow => {
    const existing = existingByIdentity.get(candidate.ingredientIdentity);
    if (existing) {
      mergedCount += 1;
      return {
        ...existing,
        user_id: userId,
        family_group_id: null,
        quantity: mergeShoppingQuantityDisplay(existing.quantity, candidate.quantity),
        category: existing.category ?? candidate.category,
        checked: false,
        source_recipe_id: mergeSourceDisplay(existing.source_recipe_id, candidate.sourceRecipeId),
        source_recipe_name: mergeSourceDisplay(existing.source_recipe_name, candidate.sourceRecipeName),
      };
    }

    addedCount += 1;
    return {
      id: uuidv5(`${userId}\n${candidate.ingredientIdentity}`, SHOPPING_ITEM_NAMESPACE),
      device_id: `api:${userId}`,
      user_id: userId,
      family_group_id: null,
      name: candidate.name,
      quantity: candidate.quantity,
      category: candidate.category,
      checked: false,
      source_recipe_id: candidate.sourceRecipeId,
      source_recipe_name: candidate.sourceRecipeName,
    };
  });

  return { rows, addedCount, mergedCount };
}
