import { getIngredientCatalog } from "./ingredient-catalog.ts";
import type { ShoppingItem, ShoppingItemDraft } from "../types/index.ts";

type MergedShoppingItemFields = Pick<
  ShoppingItem,
  "quantity" | "category" | "checked" | "sourceRecipeId" | "sourceRecipeName"
>;

function normalizeShoppingIngredientName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

const catalogIdentityByName = (() => {
  const identities = new Map<string, string | null>();

  for (const item of getIngredientCatalog()) {
    for (const value of [item.name, ...(item.aliases ?? [])]) {
      const normalizedName = normalizeShoppingIngredientName(value);
      const existingIdentity = identities.get(normalizedName);
      if (existingIdentity && existingIdentity !== item.id) {
        identities.set(normalizedName, null);
      } else if (existingIdentity === undefined) {
        identities.set(normalizedName, item.id);
      }
    }
  }

  return identities;
})();

export function getShoppingIngredientIdentity(name: string): string {
  const normalizedName = normalizeShoppingIngredientName(name);
  const catalogIdentity = catalogIdentityByName.get(normalizedName);
  return catalogIdentity
    ? `catalog:${catalogIdentity}`
    : `name:${normalizedName}`;
}

function formatMergedNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function parseQuantityNumber(value: string): number | null {
  if (!value.includes("/")) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const [numerator, denominator] = value.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

export function mergeShoppingQuantityDisplay(
  currentQuantity: string | null,
  nextQuantity: string | null,
): string | null {
  if (!nextQuantity) {
    return currentQuantity;
  }
  if (!currentQuantity) {
    return nextQuantity;
  }

  const current = currentQuantity.trim().match(/^(\d+\/\d+|\d+(?:\.\d+)?)\s*(\S+)$/);
  const next = nextQuantity.trim().match(/^(\d+\/\d+|\d+(?:\.\d+)?)\s*(\S+)$/);
  if (current && next && current[2] === next[2]) {
    const currentValue = parseQuantityNumber(current[1]);
    const nextValue = parseQuantityNumber(next[1]);
    if (currentValue !== null && nextValue !== null) {
      return `${formatMergedNumber(currentValue + nextValue)}${current[2]}`;
    }
  }

  if (currentQuantity === nextQuantity) {
    return currentQuantity;
  }
  return `${currentQuantity} + ${nextQuantity}`;
}

function mergeSourceDisplay(currentValue: string | null, nextValue: string | null): string | null {
  const parts = [currentValue, nextValue].filter((item): item is string => Boolean(item?.trim()));
  return Array.from(new Set(parts)).join(" · ") || null;
}

export function buildMergedShoppingItemFields(
  item: ShoppingItem,
  draft: ShoppingItemDraft,
): MergedShoppingItemFields {
  return {
    quantity: mergeShoppingQuantityDisplay(item.quantity, draft.quantity ?? null),
    category: item.category ?? draft.category ?? null,
    checked: false,
    sourceRecipeId: mergeSourceDisplay(item.sourceRecipeId, draft.sourceRecipeId ?? null),
    sourceRecipeName: mergeSourceDisplay(item.sourceRecipeName, draft.sourceRecipeName ?? null),
  };
}
