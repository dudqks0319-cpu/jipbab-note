import {
  putLocalRecords,
  readAllFromStore,
} from "./index.ts";
import {
  LOCAL_DB_STORES,
  recipeToCacheRecord,
  type RecipeCacheRecord,
} from "./schema.ts";
import type { RecipeCategory, RecipeRecord } from "../../types/index.ts";

const DEFAULT_RECIPE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function toTime(value: string | null | undefined): number {
  const time = Date.parse(value ?? "");
  return Number.isNaN(time) ? 0 : time;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRecipeRecord(value: unknown): value is RecipeRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    typeof value.method === "string" &&
    typeof value.calories === "string" &&
    typeof value.ingredients === "string" &&
    typeof value.hashTag === "string" &&
    ("thumbnailUrl" in value ? typeof value.thumbnailUrl === "string" || value.thumbnailUrl === null : true)
  );
}

function cacheRecordToRecipe(record: RecipeCacheRecord): RecipeRecord | null {
  try {
    const parsed = JSON.parse(record.detailJson) as unknown;
    if (isRecipeRecord(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    category: record.category,
    method: record.method,
    calories: record.calories,
    thumbnailUrl: record.thumbnailUrl,
    ingredients: record.ingredients,
    hashTag: record.hashTag,
  };
}

function recipeMatchesQuery(recipe: RecipeRecord, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return (
    recipe.name.toLowerCase().includes(query) ||
    recipe.ingredients.toLowerCase().includes(query) ||
    recipe.hashTag.toLowerCase().includes(query)
  );
}

function recipeMatchesCategory(recipe: RecipeRecord, category: RecipeCategory): boolean {
  return category === "전체" || recipe.category === category;
}

export async function cacheRecipes(
  recipes: RecipeRecord[],
  sourceProvider = "api",
  ttlMs = DEFAULT_RECIPE_CACHE_TTL_MS,
): Promise<void> {
  if (recipes.length === 0) {
    return;
  }

  const cachedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  await putLocalRecords(
    LOCAL_DB_STORES.recipeCache,
    recipes.map((recipe) => recipeToCacheRecord(recipe, cachedAt, expiresAt, sourceProvider)),
  );
}

export async function listCachedRecipePage(options: {
  page: number;
  size: number;
  searchQuery: string;
  selectedCategory: RecipeCategory;
}): Promise<{ recipes: RecipeRecord[]; totalCount: number }> {
  const now = Date.now();
  const records = await readAllFromStore<RecipeCacheRecord>(LOCAL_DB_STORES.recipeCache);
  const recipes = records
    .filter((record) => toTime(record.expiresAt) > now)
    .map(cacheRecordToRecipe)
    .filter((recipe): recipe is RecipeRecord => Boolean(recipe))
    .filter((recipe) => recipeMatchesCategory(recipe, options.selectedCategory))
    .filter((recipe) => recipeMatchesQuery(recipe, options.searchQuery))
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));

  const start = (options.page - 1) * options.size;
  return {
    recipes: recipes.slice(start, start + options.size),
    totalCount: recipes.length,
  };
}
