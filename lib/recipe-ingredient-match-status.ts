// 이 파일은 검수된 재료 ID만으로 레시피와 냉장고 재료의 관계를 판정합니다.
import { getIngredientCatalog } from "./ingredient-catalog.ts";
import type {
  RecipeIngredientDetail,
  RecipeIngredientSubstitution,
} from "../types/index.ts";

export type RecipeIngredientMatchStatus =
  | "exact"
  | "alias"
  | "substitute"
  | "missing"
  | "unknown";

export interface RecipeIngredientInventoryMatch {
  recipeIngredient: RecipeIngredientDetail;
  status: RecipeIngredientMatchStatus;
  inventoryName: string | null;
  inventoryIngredientId: string | null;
  substitution: RecipeIngredientSubstitution | null;
}

type ResolvedInventoryIngredient = {
  name: string;
  ingredientId: string;
  kind: "exact" | "alias";
};

function normalizeExactName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function uniqueNameIndex(entries: Array<[string, string]>): Map<string, string | null> {
  const index = new Map<string, string | null>();
  for (const [name, ingredientId] of entries) {
    const key = normalizeExactName(name);
    if (!key) continue;
    const previous = index.get(key);
    index.set(key, previous === undefined || previous === ingredientId ? ingredientId : null);
  }
  return index;
}

const ingredientCatalog = getIngredientCatalog();
const ingredientById = new Map(ingredientCatalog.map((item) => [item.id, item]));
const canonicalIdByName = uniqueNameIndex(
  ingredientCatalog.map((item): [string, string] => [item.name, item.id]),
);
const aliasIdByName = uniqueNameIndex(
  ingredientCatalog.flatMap((item) =>
    (item.aliases ?? []).map((alias): [string, string] => [alias, item.id])),
);

function resolveInventoryName(name: string): ResolvedInventoryIngredient | null {
  const key = normalizeExactName(name);
  if (!key) return null;

  const canonicalId = canonicalIdByName.get(key);
  if (canonicalId) {
    return { name, ingredientId: canonicalId, kind: "exact" };
  }

  const aliasId = aliasIdByName.get(key);
  if (aliasId) {
    return { name, ingredientId: aliasId, kind: "alias" };
  }

  return null;
}

function unresolvedMatch(
  recipeIngredient: RecipeIngredientDetail,
  status: "missing" | "unknown",
): RecipeIngredientInventoryMatch {
  return {
    recipeIngredient,
    status,
    inventoryName: null,
    inventoryIngredientId: null,
    substitution: null,
  };
}

export function matchRecipeIngredientsToInventory(
  recipeIngredients: readonly RecipeIngredientDetail[],
  inventoryIngredients: readonly { name: string }[],
): RecipeIngredientInventoryMatch[] {
  const resolvedInventory = inventoryIngredients
    .map((item) => resolveInventoryName(item.name))
    .filter((item): item is ResolvedInventoryIngredient => item !== null);

  return recipeIngredients.map((recipeIngredient) => {
    const requiredIngredientId = recipeIngredient.ingredientId?.trim();
    if (!requiredIngredientId || !ingredientById.has(requiredIngredientId)) {
      return unresolvedMatch(recipeIngredient, "unknown");
    }

    const exact = resolvedInventory.find(
      (item) => item.ingredientId === requiredIngredientId && item.kind === "exact",
    );
    const alias = resolvedInventory.find(
      (item) => item.ingredientId === requiredIngredientId && item.kind === "alias",
    );
    const direct = exact ?? alias;
    if (direct) {
      return {
        recipeIngredient,
        status: direct.kind,
        inventoryName: direct.name,
        inventoryIngredientId: direct.ingredientId,
        substitution: null,
      };
    }

    for (const substitution of recipeIngredient.substitutions ?? []) {
      const substituteIngredientId = substitution.ingredientId?.trim();
      if (!substituteIngredientId || !ingredientById.has(substituteIngredientId)) continue;
      const substitute = resolvedInventory.find(
        (item) => item.ingredientId === substituteIngredientId,
      );
      if (substitute) {
        return {
          recipeIngredient,
          status: "substitute",
          inventoryName: substitute.name,
          inventoryIngredientId: substitute.ingredientId,
          substitution,
        };
      }
    }

    return unresolvedMatch(recipeIngredient, "missing");
  });
}
