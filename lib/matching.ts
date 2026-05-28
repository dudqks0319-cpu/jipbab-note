// 이 파일은 레시피 재료 문자열을 정규화하고 내 재료와의 매칭률을 계산합니다.
import type { RecipeMatchResult } from "@/types";

const SPLIT_PATTERN = /[\n,;|/]+/g;
const BRACKET_PATTERN = /\([^)]*\)|\[[^\]]*]|\{[^}]*}/g;
const NOISE_PATTERN = /(약간|적당량|조금|기호에 따라|취향껏|선택|필수)/g;
const UNIT_PATTERN =
  /\d+(?:\.\d+)?\s*(kg|g|mg|ml|l|컵|큰술|작은술|술|스푼|ts|tbsp|tsp|개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌)/gi;
const NON_WORD_PATTERN = /[^0-9a-zA-Z가-힣\s]/g;

export const PANTRY_STAPLES = new Set([
  "물",
  "소금",
  "설탕",
  "후추",
  "식용유",
  "참기름",
  "간장",
  "국간장",
  "진간장",
  "양조간장",
  "고춧가루",
  "고추장",
  "된장",
  "마늘",
  "다진마늘",
]);

const INGREDIENT_ALIAS_GROUPS: Record<string, string[]> = {
  계란: ["달걀"],
  파: ["대파", "쪽파", "실파", "다진파"],
  김치: ["배추김치", "묵은지", "신김치", "익은김치"],
  돼지고기: ["앞다리살", "뒷다리살", "목살", "삼겹살", "돼지", "제육용"],
  닭고기: ["닭다리살", "닭가슴살", "닭안심", "닭봉", "닭날개"],
  두부: ["부침두부", "찌개두부"],
  멸치육수: ["육수팩", "코인육수", "다시팩", "멸치다시마육수"],
  간장: ["국간장", "진간장", "양조간장", "맛간장"],
  마늘: ["다진마늘", "간마늘"],
  고추: ["청양고추", "홍고추", "풋고추"],
};

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

export function normalizeKoreanIngredient(value: string): string {
  let normalized = value
    .normalize("NFC")
    .replace(BRACKET_PATTERN, " ")
    .replace(NOISE_PATTERN, " ")
    .replace(UNIT_PATTERN, " ")
    .replace(NON_WORD_PATTERN, " ")
    .toLowerCase()
    .trim();

  for (const [pattern, replacement] of ALIAS_RULES) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d+\s*/, "")
    .replace(/\s+\d+$/, "");

  const compact = normalized.replace(/\s+/g, "");
  for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIAS_GROUPS)) {
    if (compact === canonical || aliases.some((alias) => compact === alias || compact.includes(alias))) {
      return canonical;
    }
  }

  return normalized;
}

function normalizeIngredientName(value: string): string {
  return normalizeKoreanIngredient(value);
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
  beginnerFitPoints: number;
};

export type RecipeRecommendationRank<TRecipe extends { ingredients: string }> = {
  recipe: TRecipe;
  match: RecipeIngredientMatch;
  score: RecipeRecommendationScore;
};

type BeginnerRankableRecipe = {
  beginnerScore?: number | null;
  difficultyLevel?: number | null;
  totalMinutes?: number | null;
  requiredTools?: string[] | null;
  noFire?: boolean | null;
  microwave?: boolean | null;
  fallbackMeal?: string | null;
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

export function getEssentialMissingIngredients(missingIngredients: string[]): string[] {
  return missingIngredients.filter((ingredient) => !PANTRY_STAPLES.has(normalizeKoreanIngredient(ingredient)));
}

export function findExpiringMatchedIngredients(
  matchedIngredients: string[],
  inventory: Array<string | RecipeRecommendationIngredient>,
  today = new Date(),
): string[] {
  const normalizedInventory = inventory.map((item) => toRecommendationIngredient(item));
  const expiring = matchedIngredients
    .map((recipeIngredient) => {
      const inventoryIngredient = findMatchedInventoryIngredient(recipeIngredient, normalizedInventory);
      if (!inventoryIngredient) {
        return null;
      }
      const daysUntilExpiry = getDaysUntilExpiry(getExpiryDate(inventoryIngredient), today);
      if (daysUntilExpiry === null || daysUntilExpiry > 3) {
        return null;
      }
      return inventoryIngredient.name;
    })
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(expiring));
}

export function buildRecipeRecommendationReason(params: {
  recipeName: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  expiringIngredients?: string[];
}): string {
  const essentialMissing = getEssentialMissingIngredients(params.missingIngredients);
  const expiringIngredients = Array.from(new Set(params.expiringIngredients ?? []));

  if (essentialMissing.length === 0) {
    if (expiringIngredients.length > 0) {
      return `${expiringIngredients.slice(0, 2).join(", ")} 소진에 좋아요. ${params.recipeName}은 지금 바로 만들 수 있어요.`;
    }
    return `${params.recipeName}은 지금 바로 만들 수 있어요.`;
  }

  if (expiringIngredients.length > 0) {
    return `${expiringIngredients.slice(0, 2).join(", ")} 소진에 좋아요. 부족 재료는 ${essentialMissing.length}개입니다.`;
  }

  if (essentialMissing.length === 1) {
    return `${essentialMissing[0]} 1개만 더 있으면 만들 수 있어요.`;
  }

  return `보유 재료 ${params.matchedIngredients.length}개가 맞고, ${essentialMissing.length}개만 더 있으면 만들 수 있어요.`;
}

export function calculateRecipeRecommendationScore(
  match: RecipeIngredientMatch,
  myIngredients: Array<string | RecipeRecommendationIngredient>,
  today = new Date(),
  recipe: BeginnerRankableRecipe = {},
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
    beginnerFitPoints: calculateBeginnerFitPoints(recipe),
  };

  return {
    ...score,
    total:
      score.matchRatePoints -
      score.missingIngredientPenalty +
      score.availableIngredientPoints +
      score.freshnessUrgencyPoints +
      score.beginnerFitPoints,
  };
}

function calculateBeginnerFitPoints(recipe: BeginnerRankableRecipe): number {
  if (typeof recipe.beginnerScore !== "number") {
    return 0;
  }

  const scorePoints = Math.max(0, Math.min(5, (recipe.beginnerScore - 80) / 3));
  const difficultyPoints = typeof recipe.difficultyLevel === "number" && recipe.difficultyLevel <= 2 ? 3 : 0;
  const timePoints = typeof recipe.totalMinutes === "number" && recipe.totalMinutes <= 20 ? 2 : 0;
  const toolPoints = Array.isArray(recipe.requiredTools) && recipe.requiredTools.length <= 3 ? 2 : 0;
  const cookingModePoints = recipe.noFire || recipe.microwave ? 2 : 0;
  const rescuePoints = recipe.fallbackMeal ? 1 : 0;

  return scorePoints + difficultyPoints + timePoints + toolPoints + cookingModePoints + rescuePoints;
}

export function rankRecipeRecommendations<TRecipe extends { ingredients: string } & BeginnerRankableRecipe>(
  recipes: TRecipe[],
  myIngredients: Array<string | RecipeRecommendationIngredient>,
  today = new Date(),
): Array<RecipeRecommendationRank<TRecipe>> {
  const ingredientNames = myIngredients.map((item) => toRecommendationIngredient(item).name);

  return recipes
    .map((recipe, index) => {
      const match = calculateRecipeIngredientMatch(ingredientNames, recipe.ingredients);
      const score = calculateRecipeRecommendationScore(match, myIngredients, today, recipe);
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
