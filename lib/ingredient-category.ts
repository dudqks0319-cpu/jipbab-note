import { getIngredientCatalog } from "./ingredient-catalog.ts";
import type { IngredientCategory } from "../types/index.ts";

const TRAILING_HANGUL_CONSONANT_PATTERN = /(?<=[가-힣])[\u1100-\u1112ㄱ-ㅎ]$/u;

const normalizedLookupText = (value: string) =>
  normalizeIngredientInput(value).toLowerCase().replace(/\s+/g, "");

export function normalizeIngredientInput(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(TRAILING_HANGUL_CONSONANT_PATTERN, "");
}

export function suggestIngredientCategory(
  ingredientName: string,
  fallback: IngredientCategory,
): IngredientCategory {
  const keyword = normalizedLookupText(ingredientName);
  if (!keyword) {
    return fallback;
  }

  const catalog = getIngredientCatalog();
  const exactMatch = catalog.find((item) => normalizedLookupText(item.name) === keyword);
  if (exactMatch) {
    return exactMatch.category;
  }

  const aliasMatch = catalog.find((item) =>
    (item.aliases ?? []).some((alias) => normalizedLookupText(alias) === keyword),
  );
  if (aliasMatch) {
    return aliasMatch.category;
  }

  const partialMatch = catalog.find((item) => {
    const itemName = normalizedLookupText(item.name);
    return itemName.includes(keyword) || keyword.includes(itemName);
  });

  return partialMatch?.category ?? fallback;
}
