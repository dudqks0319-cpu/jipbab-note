// 이 파일은 최근 조리 메뉴를 기기에 보존하고 추천 반복을 줄이는 순위 보정을 제공합니다.
export const RECENT_RECIPE_STORAGE_KEY = "jipbab:recent-recipes:v1";
export const RECENT_RECIPE_CHANGE_EVENT = "jipbab:recent-recipes-changed";

export type RecentRecipeEntry = {
  recipeId: string;
  category: string;
  cookedAt: string;
};

const MAX_HISTORY = 20;
const DIVERSITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeRecentRecipeHistory(value: unknown): RecentRecipeEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is RecentRecipeEntry => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const record = item as Record<string, unknown>;
      return typeof record.recipeId === "string"
        && record.recipeId.length <= 80
        && typeof record.category === "string"
        && record.category.length <= 80
        && typeof record.cookedAt === "string"
        && Number.isFinite(Date.parse(record.cookedAt));
    })
    .map((item) => ({ ...item, cookedAt: new Date(item.cookedAt).toISOString() }))
    .sort((left, right) => Date.parse(right.cookedAt) - Date.parse(left.cookedAt))
    .slice(0, MAX_HISTORY);
}

export function readRecentRecipeHistory(): RecentRecipeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeRecentRecipeHistory(JSON.parse(window.localStorage.getItem(RECENT_RECIPE_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function recordRecentRecipe(recipeId: string, category: string, cookedAt = new Date()): void {
  if (typeof window === "undefined" || !recipeId.trim()) return;
  const next = normalizeRecentRecipeHistory([
    { recipeId: recipeId.trim(), category: category.trim(), cookedAt: cookedAt.toISOString() },
    ...readRecentRecipeHistory().filter((item) => item.recipeId !== recipeId),
  ]);
  window.localStorage.setItem(RECENT_RECIPE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(RECENT_RECIPE_CHANGE_EVENT));
}

export function prioritizeRecipeDiversity<
  T extends { recipe: { id: string; category?: string | null }; score: { total: number } },
>(ranked: T[], history: RecentRecipeEntry[], now = new Date()): T[] {
  const threshold = now.getTime() - DIVERSITY_WINDOW_MS;
  const recent = history.filter((item) => Date.parse(item.cookedAt) >= threshold);
  const recentRecipeIds = new Set(recent.map((item) => item.recipeId));
  const categoryCounts = new Map<string, number>();
  for (const item of recent) categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);

  return ranked
    .map((item, index) => ({
      item,
      index,
      adjustedScore: item.score.total
        - (recentRecipeIds.has(item.recipe.id) ? 40 : 0)
        - (categoryCounts.get(item.recipe.category ?? "") ?? 0) * 4,
    }))
    .sort((left, right) => right.adjustedScore - left.adjustedScore || left.index - right.index)
    .map(({ item }) => item);
}
