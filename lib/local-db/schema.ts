import type {
  FavoriteRecipeSummary,
  IngredientRecord,
  RecipeRecord,
  ShoppingItem,
} from "../../types/index.ts";

export const LOCAL_DB_NAME = "jipbab-note-local-first";
export const LOCAL_DB_VERSION = 1;

export const LOCAL_DB_STORES = {
  ingredients: "ingredients",
  shoppingItems: "shopping_items",
  favoriteRecipes: "favorite_recipes",
  recipeCache: "recipe_cache",
  fridgeEvents: "fridge_events",
  pendingSyncQueue: "pending_sync_queue",
} as const;

export type LocalDbStoreName = (typeof LOCAL_DB_STORES)[keyof typeof LOCAL_DB_STORES];

export type SyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "conflict";

export type PendingSyncTableName =
  | typeof LOCAL_DB_STORES.ingredients
  | typeof LOCAL_DB_STORES.shoppingItems;

export type PendingSyncAction = "create" | "update" | "delete";

export type LocalDataScope = "personal" | "family";

export interface LocalDataScopeContext {
  scope: LocalDataScope;
  familyGroupId: string | null;
}

export interface LocalSyncMetadata {
  deletedAt?: string | null;
  syncStatus?: SyncStatus;
  lastSyncedAt?: string | null;
}

export type LocalIngredientRecord = IngredientRecord & LocalSyncMetadata;

export type LocalShoppingItem = ShoppingItem & LocalSyncMetadata;

export type FavoriteRecipeRecord = FavoriteRecipeSummary & LocalSyncMetadata & {
  deviceId?: string | null;
  userId?: string | null;
};

export interface RecipeCacheRecord {
  id: string;
  name: string;
  category: string;
  method: string;
  calories: string;
  thumbnailUrl: string | null;
  ingredients: string;
  hashTag: string;
  detailJson: string;
  sourceProvider: string | null;
  cachedAt: string;
  expiresAt: string;
}

export interface FridgeEventRecord {
  id: string;
  deviceId: string;
  userId: string | null;
  ingredientId: string;
  action: "create" | "update" | "delete" | "consume" | "restore";
  payloadJson: string;
  createdAt: string;
}

export interface PendingSyncQueueEntry {
  id: string;
  tableName: PendingSyncTableName;
  recordId: string;
  action: PendingSyncAction;
  payloadJson: string;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export function recipeToCacheRecord(
  recipe: RecipeRecord,
  cachedAt: string,
  expiresAt: string,
  sourceProvider: string | null,
): RecipeCacheRecord {
  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    method: recipe.method,
    calories: recipe.calories,
    thumbnailUrl: recipe.thumbnailUrl,
    ingredients: recipe.ingredients,
    hashTag: recipe.hashTag,
    detailJson: JSON.stringify(recipe),
    sourceProvider,
    cachedAt,
    expiresAt,
  };
}
