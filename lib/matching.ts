// 이 파일은 레시피 재료 문자열을 정규화하고 내 재료와의 매칭률을 계산합니다.
import type { RecipeMatchResult } from "@/types";

const SPLIT_PATTERN = /[\n,;|/]+/g;
const BRACKET_PATTERN = /\([^)]*\)|\[[^\]]*]|\{[^}]*}/g;
const NOISE_PATTERN = /(약간|적당량|조금|기호에 따라|취향껏|선택|필수)/g;
const UNIT_PATTERN =
  /\d+(?:\.\d+)?\s*(kg|g|mg|ml|l|컵|큰술|작은술|술|스푼|ts|tbsp|tsp|개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌)/gi;
const NON_WORD_PATTERN = /[^0-9a-zA-Z가-힣\s]/g;

const ALIAS_RULES: Array<[RegExp, string]> = [
  [/다진\s*마늘/g, "마늘"],
  [/다진\s*파/g, "파"],
  [/대파/g, "파"],
  [/쪽파/g, "파"],
  [/(청양|홍)\s*고추/g, "고추"],
  [/(진|국|양조)\s*간장/g, "간장"],
  [/설탕\s*대체/g, "설탕"],
];

const MIN_MATCH_LENGTH = 2;

function normalizeIngredientName(value: string): string {
  let normalized = value
    .replace(BRACKET_PATTERN, " ")
    .replace(NOISE_PATTERN, " ")
    .replace(UNIT_PATTERN, " ")
    .replace(NON_WORD_PATTERN, " ")
    .toLowerCase()
    .trim();

  for (const [pattern, replacement] of ALIAS_RULES) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d+\s*/, "")
    .replace(/\s+\d+$/, "");
}

function isSameIngredient(base: string, target: string): boolean {
  if (!base || !target) {
    return false;
  }
  if (base === target) {
    return true;
  }
  if (base.length < MIN_MATCH_LENGTH || target.length < MIN_MATCH_LENGTH) {
    return false;
  }
  return base.includes(target) || target.includes(base);
}

export function extractRecipeIngredients(rawIngredients: string): string[] {
  if (!rawIngredients) {
    return [];
  }

  const parsed = rawIngredients
    .split(SPLIT_PATTERN)
    .map((item) => item.replace(/^[-•·*]\s*/, " ").trim())
    .map((item) => {
      const colonIndex = item.lastIndexOf(":");
      return colonIndex === -1 ? item : item.slice(colonIndex + 1);
    })
    .map((item) => normalizeIngredientName(item))
    .filter((item) => item.length > 0);

  return Array.from(new Set(parsed));
}

export type RecipeIngredientMatch = RecipeMatchResult & {
  ingredientList: string[];
};

export function calculateRecipeIngredientMatch(
  myIngredientNames: string[],
  recipeIngredientsRaw: string,
): RecipeIngredientMatch {
  const ingredientList = extractRecipeIngredients(recipeIngredientsRaw);
  const normalizedMine = Array.from(
    new Set(myIngredientNames.map((name) => normalizeIngredientName(name)).filter((name) => name.length > 0)),
  );

  if (ingredientList.length === 0) {
    return {
      ingredientList: [],
      matchRate: 0,
      matchedIngredients: [],
      missingIngredients: [],
      totalRecipeIngredients: 0,
    };
  }

  const matchedIngredients: string[] = [];
  const missingIngredients: string[] = [];

  for (const ingredient of ingredientList) {
    const matched = normalizedMine.some((mine) => isSameIngredient(mine, ingredient));
    if (matched) {
      matchedIngredients.push(ingredient);
    } else {
      missingIngredients.push(ingredient);
    }
  }

  const totalRecipeIngredients = ingredientList.length;
  const matchRate = Math.round((matchedIngredients.length / totalRecipeIngredients) * 100);

  return {
    ingredientList,
    matchRate,
    matchedIngredients,
    missingIngredients,
    totalRecipeIngredients,
  };
}
