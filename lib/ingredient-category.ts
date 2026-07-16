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

export function normalizeLegacyIngredientCategory(
  ingredientName: string,
  category: IngredientCategory | null,
): IngredientCategory | null {
  const name = normalizedLookupText(ingredientName);
  if (name === "계란" || name === "달걀") {
    return "육류";
  }
  if (name === "두부") {
    return "통조림/가공식품";
  }

  return category;
}

export function getIngredientCategoryDisplayLabel(
  ingredientName: string,
  category: IngredientCategory | null,
): string {
  const name = normalizedLookupText(ingredientName);
  if ((name === "계란" || name === "달걀") && category === "육류") {
    return "계란·난류";
  }
  if (name === "두부" && category === "통조림/가공식품") {
    return "콩·두부";
  }

  return category ?? "기타";
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
