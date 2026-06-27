import {
  deleteLocalRecord,
  putLocalRecord,
  putLocalRecords,
  readAllFromStore,
} from "./index.ts";
import {
  LOCAL_DB_STORES,
  type LocalDataScopeContext,
  type LocalShoppingItem,
  type PendingSyncAction,
  type SyncStatus,
} from "./schema.ts";
import type {
  IngredientCategory,
  ShoppingItem,
} from "../../types/index.ts";
import { INGREDIENT_CATEGORIES } from "../../types/index.ts";

const LEGACY_SHOPPING_STORAGE_KEY = "jipbab-note-shopping-items";

let migrationPromise: Promise<void> | null = null;

function toTime(value: string | null | undefined): number {
  const time = Date.parse(value ?? "");
  return Number.isNaN(time) ? 0 : time;
}

function compareNewestFirst(left: ShoppingItem, right: ShoppingItem): number {
  const updatedDiff = toTime(right.updatedAt) - toTime(left.updatedAt);
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  const createdDiff = toTime(right.createdAt) - toTime(left.createdAt);
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return left.id.localeCompare(right.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function categoryOrNull(value: unknown): IngredientCategory | null {
  return typeof value === "string" && INGREDIENT_CATEGORIES.includes(value as IngredientCategory)
    ? value as IngredientCategory
    : null;
}

function syncStatusOrDefault(value: unknown, fallback: SyncStatus): SyncStatus {
  return value === "synced" ||
    value === "pending_create" ||
    value === "pending_update" ||
    value === "pending_delete" ||
    value === "conflict"
    ? value
    : fallback;
}

function coerceLegacyShoppingItem(value: unknown): LocalShoppingItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = stringOrNull(value.id);
  const deviceId = stringOrNull(value.deviceId);
  const name = stringOrNull(value.name);
  const createdAt = stringOrNull(value.createdAt);
  const updatedAt = stringOrNull(value.updatedAt);

  if (!id || !deviceId || !name || !createdAt || !updatedAt || typeof value.checked !== "boolean") {
    return null;
  }

  return {
    id,
    deviceId,
    userId: stringOrNull(value.userId),
    familyGroupId: stringOrNull(value.familyGroupId),
    name,
    quantity: stringOrNull(value.quantity),
    category: categoryOrNull(value.category),
    checked: value.checked,
    sourceRecipeId: stringOrNull(value.sourceRecipeId),
    sourceRecipeName: stringOrNull(value.sourceRecipeName),
    createdAt,
    updatedAt,
    deletedAt: stringOrNull(value.deletedAt),
    syncStatus: syncStatusOrDefault(value.syncStatus, "pending_update"),
    lastSyncedAt: stringOrNull(value.lastSyncedAt),
  };
}

async function migrateLegacyShoppingItems(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const raw = window.localStorage.getItem(LEGACY_SHOPPING_STORAGE_KEY);
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
    .map(coerceLegacyShoppingItem)
    .filter((item): item is LocalShoppingItem => Boolean(item));

  if (migrated.length === 0) {
    window.localStorage.removeItem(LEGACY_SHOPPING_STORAGE_KEY);
    return;
  }

  const current = await readAllFromStore<LocalShoppingItem>(LOCAL_DB_STORES.shoppingItems);
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of migrated) {
    const currentItem = byId.get(item.id);
    if (!currentItem || toTime(item.updatedAt) >= toTime(currentItem.updatedAt)) {
      byId.set(item.id, item);
    }
  }

  await putLocalRecords(LOCAL_DB_STORES.shoppingItems, Array.from(byId.values()));
  window.localStorage.removeItem(LEGACY_SHOPPING_STORAGE_KEY);
}

export async function ensureShoppingMigrated(): Promise<void> {
  migrationPromise ??= migrateLegacyShoppingItems();
  await migrationPromise;
}

export function belongsToShoppingScope(
  item: Pick<ShoppingItem, "deviceId" | "familyGroupId">,
  deviceId: string,
  scopeContext: LocalDataScopeContext,
): boolean {
  if (scopeContext.scope === "family") {
    return item.familyGroupId === scopeContext.familyGroupId;
  }

  return item.deviceId === deviceId && !item.familyGroupId;
}

export async function listLocalShoppingItems(
  deviceId: string,
  scopeContext: LocalDataScopeContext,
  options: { includeDeleted?: boolean } = {},
): Promise<LocalShoppingItem[]> {
  await ensureShoppingMigrated();
  const records = await readAllFromStore<LocalShoppingItem>(LOCAL_DB_STORES.shoppingItems);
  return records
    .filter((item) => belongsToShoppingScope(item, deviceId, scopeContext))
    .filter((item) => options.includeDeleted || !item.deletedAt)
    .sort(compareNewestFirst);
}

export async function getLocalShoppingItem(itemId: string): Promise<LocalShoppingItem | null> {
  await ensureShoppingMigrated();
  const records = await readAllFromStore<LocalShoppingItem>(LOCAL_DB_STORES.shoppingItems);
  return records.find((item) => item.id === itemId) ?? null;
}

export async function replaceScopedLocalShoppingItems(
  deviceId: string,
  scopeContext: LocalDataScopeContext,
  nextScopedItems: LocalShoppingItem[],
): Promise<LocalShoppingItem[]> {
  await ensureShoppingMigrated();
  const current = await readAllFromStore<LocalShoppingItem>(LOCAL_DB_STORES.shoppingItems);
  const nextItems = [
    ...nextScopedItems,
    ...current.filter((item) => !belongsToShoppingScope(item, deviceId, scopeContext)),
  ];
  await putLocalRecords(LOCAL_DB_STORES.shoppingItems, nextItems);
  return nextScopedItems.filter((item) => !item.deletedAt).sort(compareNewestFirst);
}

export async function upsertLocalShoppingItem(record: LocalShoppingItem): Promise<LocalShoppingItem> {
  await ensureShoppingMigrated();
  await putLocalRecord(LOCAL_DB_STORES.shoppingItems, record);
  return record;
}

export async function upsertLocalShoppingItems(records: LocalShoppingItem[]): Promise<LocalShoppingItem[]> {
  await ensureShoppingMigrated();
  await putLocalRecords(LOCAL_DB_STORES.shoppingItems, records);
  return records;
}

export async function hardDeleteLocalShoppingItem(itemId: string): Promise<void> {
  await ensureShoppingMigrated();
  await deleteLocalRecord(LOCAL_DB_STORES.shoppingItems, itemId);
}

export async function markLocalShoppingItemDeleted(
  itemId: string,
  syncStatus: SyncStatus,
): Promise<LocalShoppingItem | null> {
  const target = await getLocalShoppingItem(itemId);
  if (!target) {
    return null;
  }

  const now = new Date().toISOString();
  const nextItem: LocalShoppingItem = {
    ...target,
    deletedAt: now,
    syncStatus,
    updatedAt: now,
  };
  await upsertLocalShoppingItem(nextItem);
  return nextItem;
}

export function nextShoppingSyncStatus(
  currentStatus: SyncStatus | undefined,
  action: PendingSyncAction,
): SyncStatus {
  if (action === "delete") {
    return "pending_delete";
  }

  if (currentStatus === "pending_create") {
    return "pending_create";
  }

  return action === "create" ? "pending_create" : "pending_update";
}
