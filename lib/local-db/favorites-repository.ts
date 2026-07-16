import {
  clearLocalStore,
  deleteLocalRecord,
  putLocalRecord,
  putLocalRecords,
  readAllFromStore,
} from "./index.ts";
import {
  LOCAL_DB_STORES,
  type FavoriteRecipeRecord,
} from "./schema.ts";

const LEGACY_FAVORITES_STORAGE_KEY = "jipbab-note-favorite-recipes";

let migrationPromise: Promise<void> | null = null;

function toTime(value: string | null | undefined): number {
  const time = Date.parse(value ?? "");
  return Number.isNaN(time) ? 0 : time;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function coerceLegacyFavorite(value: unknown): FavoriteRecipeRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = stringOrNull(value.id);
  const name = stringOrNull(value.name);
  const category = stringOrNull(value.category);
  const savedAt = stringOrNull(value.savedAt);

  if (!id || !name || !category || !savedAt) {
    return null;
  }

  return {
    id,
    name,
    category,
    thumbnailUrl: stringOrNull(value.thumbnailUrl),
    savedAt,
    deletedAt: stringOrNull(value.deletedAt),
    syncStatus: "pending_update",
    lastSyncedAt: stringOrNull(value.lastSyncedAt),
  };
}

async function migrateLegacyFavorites(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const raw = window.localStorage.getItem(LEGACY_FAVORITES_STORAGE_KEY);
  if (!raw) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return;
  }

  if (!Array.isArray(parsed)) {
    return;
  }

  const migrated = parsed
    .map(coerceLegacyFavorite)
    .filter((item): item is FavoriteRecipeRecord => Boolean(item));

  if (migrated.length === 0) {
    window.localStorage.removeItem(LEGACY_FAVORITES_STORAGE_KEY);
    return;
  }

  const current = await readAllFromStore<FavoriteRecipeRecord>(LOCAL_DB_STORES.favoriteRecipes);
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of migrated) {
    const currentItem = byId.get(item.id);
    if (!currentItem || toTime(item.savedAt) >= toTime(currentItem.savedAt)) {
      byId.set(item.id, item);
    }
  }

  await putLocalRecords(LOCAL_DB_STORES.favoriteRecipes, Array.from(byId.values()));
  window.localStorage.removeItem(LEGACY_FAVORITES_STORAGE_KEY);
}

export async function ensureFavoritesMigrated(): Promise<void> {
  migrationPromise ??= migrateLegacyFavorites();
  await migrationPromise;
}

export async function listFavoriteRecipes(): Promise<FavoriteRecipeRecord[]> {
  await ensureFavoritesMigrated();
  const favorites = await readAllFromStore<FavoriteRecipeRecord>(LOCAL_DB_STORES.favoriteRecipes);
  return favorites
    .filter((item) => !item.deletedAt)
    .sort((left, right) => toTime(right.savedAt) - toTime(left.savedAt));
}

export async function upsertFavoriteRecipe(record: FavoriteRecipeRecord): Promise<void> {
  await ensureFavoritesMigrated();
  await putLocalRecord(LOCAL_DB_STORES.favoriteRecipes, record);
}

export async function removeFavoriteRecipe(recipeId: string): Promise<void> {
  await ensureFavoritesMigrated();
  await deleteLocalRecord(LOCAL_DB_STORES.favoriteRecipes, recipeId);
}

export async function clearFavoriteRecipes(): Promise<void> {
  await ensureFavoritesMigrated();
  await clearLocalStore(LOCAL_DB_STORES.favoriteRecipes);
}
