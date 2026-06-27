import { getIngredientCatalog } from "./ingredient-catalog.ts";

const ENGLISH_INGREDIENT_ALIASES = new Map<string, string>([
  ["egg", "계란"],
  ["eggs", "계란"],
  ["tofu", "두부"],
  ["onion", "양파"],
  ["onions", "양파"],
  ["kimchi", "김치"],
  ["garlic", "마늘"],
]);

const normalizeLookupText = (value: string) => value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "");

function uniqueOrdered(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (seen.has(item)) {
      continue;
    }
    seen.add(item);
    result.push(item);
  }
  return result;
}

export function getIngredientDisplayName(name: string): string {
  const normalizedName = name.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!normalizedName) {
    return "재료";
  }

  const compactName = normalizeLookupText(normalizedName);
  const catalog = getIngredientCatalog();
  const matchedKoreanNames = catalog
    .filter((item) => {
      const itemName = normalizeLookupText(item.name);
      return compactName === itemName || compactName.includes(itemName);
    })
    .map((item) => item.name);

  const englishMatches = normalizedName
    .toLowerCase()
    .split(/[^a-z]+/u)
    .map((token) => ENGLISH_INGREDIENT_ALIASES.get(token) ?? "")
    .filter(Boolean);

  const matches = uniqueOrdered([...matchedKoreanNames, ...englishMatches]);
  if (matches.length >= 2) {
    return `${matches[0]} 외 ${matches.length - 1}`;
  }
  if (matches.length === 1 && normalizedName.toLowerCase() === normalizedName) {
    return matches[0];
  }
  if (matches.length === 1 && normalizedName.length > matches[0].length + 3) {
    return matches[0];
  }

  return normalizedName;
}
