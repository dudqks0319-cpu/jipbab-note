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

export type RecipeRecommendationIngredient = {
  name: string;
  expiryDate?: string | null;
  expiry_date?: string | null;
};

export type RecipeRecommendationScore = {
  total: number;
  matchRatePoints: number;
  missingIngredientPenalty: number;
  availableIngredientPoints: number;
  freshnessUrgencyPoints: number;
};

export type RecipeRecommendationRank<TRecipe extends { ingredients: string }> = {
  recipe: TRecipe;
  match: RecipeIngredientMatch;
  score: RecipeRecommendationScore;
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

function toRecommendationIngredient(value: string | RecipeRecommendationIngredient): RecipeRecommendationIngredient {
  if (typeof value === "string") {
    return { name: value };
  }

  return value;
}

function getExpiryDate(value: RecipeRecommendationIngredient): string | null {
  return value.expiryDate ?? value.expiry_date ?? null;
}

function getDaysUntilExpiry(expiryDate: string | null, today: Date): number | null {
  if (!expiryDate) {
    return null;
  }

  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function getFreshnessUrgencyPoints(daysUntilExpiry: number | null): number {
  if (daysUntilExpiry === null || daysUntilExpiry > 7) {
    return 0;
  }
  if (daysUntilExpiry <= 0) {
    return 12;
  }
  if (daysUntilExpiry <= 1) {
    return 10;
  }
  if (daysUntilExpiry <= 3) {
    return 7;
  }
  return 3;
}

function findMatchedInventoryIngredient(
  recipeIngredient: string,
  inventory: RecipeRecommendationIngredient[],
): RecipeRecommendationIngredient | null {
  return inventory.find((item) => isSameIngredient(normalizeIngredientName(item.name), recipeIngredient)) ?? null;
}

export function calculateRecipeRecommendationScore(
  match: RecipeIngredientMatch,
  myIngredients: Array<string | RecipeRecommendationIngredient>,
  today = new Date(),
): RecipeRecommendationScore {
  const inventory = myIngredients.map((item) => toRecommendationIngredient(item));
  const availableIngredientCount = match.matchedIngredients.length;
  const missingIngredientCount = match.missingIngredients.length;
  const freshnessUrgencyPoints = Math.min(
    15,
    match.matchedIngredients.reduce((total, recipeIngredient) => {
      const inventoryIngredient = findMatchedInventoryIngredient(recipeIngredient, inventory);
      const daysUntilExpiry = getDaysUntilExpiry(getExpiryDate(inventoryIngredient ?? { name: "" }), today);
      return total + getFreshnessUrgencyPoints(daysUntilExpiry);
    }, 0),
  );

  const score = {
    matchRatePoints: match.matchRate * 10,
    missingIngredientPenalty: missingIngredientCount * 20,
    availableIngredientPoints: availableIngredientCount * 5,
    freshnessUrgencyPoints,
  };

  return {
    ...score,
    total:
      score.matchRatePoints -
      score.missingIngredientPenalty +
      score.availableIngredientPoints +
      score.freshnessUrgencyPoints,
  };
}

export function rankRecipeRecommendations<TRecipe extends { ingredients: string }>(
  recipes: TRecipe[],
  myIngredients: Array<string | RecipeRecommendationIngredient>,
  today = new Date(),
): Array<RecipeRecommendationRank<TRecipe>> {
  const ingredientNames = myIngredients.map((item) => toRecommendationIngredient(item).name);

  return recipes
    .map((recipe, index) => {
      const match = calculateRecipeIngredientMatch(ingredientNames, recipe.ingredients);
      const score = calculateRecipeRecommendationScore(match, myIngredients, today);
      return { recipe, match, score, index };
    })
    .sort((left, right) => {
      if (right.score.total !== left.score.total) {
        return right.score.total - left.score.total;
      }
      if (right.match.matchRate !== left.match.matchRate) {
        return right.match.matchRate - left.match.matchRate;
      }
      if (left.match.missingIngredients.length !== right.match.missingIngredients.length) {
        return left.match.missingIngredients.length - right.match.missingIngredients.length;
      }
      if (right.match.matchedIngredients.length !== left.match.matchedIngredients.length) {
        return right.match.matchedIngredients.length - left.match.matchedIngredients.length;
      }
      return left.index - right.index;
    })
    .map((rank) => ({
      recipe: rank.recipe,
      match: rank.match,
      score: rank.score,
    }));
}
