import { v4 as uuidv4 } from "uuid";

import {
  deleteLocalRecord,
  putLocalRecord,
  putLocalRecords,
  readAllFromStore,
} from "./index.ts";
import {
  LOCAL_DB_STORES,
  type FridgeEventRecord,
  type LocalDataScopeContext,
  type LocalIngredientRecord,
  type PendingSyncAction,
  type SyncStatus,
} from "./schema.ts";
import type {
  IngredientCategory,
  IngredientRecord,
  IngredientStorageType,
} from "../../types/index.ts";
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_STORAGE_TYPES,
} from "../../types/index.ts";

const LEGACY_INGREDIENTS_STORAGE_KEY = "jipbab-note-ingredients";

let migrationPromise: Promise<void> | null = null;

function toTime(value: string | null | undefined): number {
  const time = Date.parse(value ?? "");
  return Number.isNaN(time) ? 0 : time;
}

function compareNewestFirst(left: IngredientRecord, right: IngredientRecord): number {
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

function booleanOrFalse(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function categoryOrNull(value: unknown): IngredientCategory | null {
  return typeof value === "string" && INGREDIENT_CATEGORIES.includes(value as IngredientCategory)
    ? value as IngredientCategory
    : null;
}

function storageTypeOrDefault(value: unknown): IngredientStorageType {
  return typeof value === "string" && INGREDIENT_STORAGE_TYPES.includes(value as IngredientStorageType)
    ? value as IngredientStorageType
    : "냉장";
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

function coerceLegacyIngredient(value: unknown): LocalIngredientRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = stringOrNull(value.id);
  const deviceId = stringOrNull(value.deviceId);
  const name = stringOrNull(value.name);
  const createdAt = stringOrNull(value.createdAt);
  const updatedAt = stringOrNull(value.updatedAt);

  if (!id || !deviceId || !name || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    deviceId,
    userId: stringOrNull(value.userId),
    familyGroupId: stringOrNull(value.familyGroupId),
    name,
    category: categoryOrNull(value.category),
    storageType: storageTypeOrDefault(value.storageType),
    quantity: stringOrNull(value.quantity),
    expiryDate: stringOrNull(value.expiryDate),
    purchaseDate: stringOrNull(value.purchaseDate),
    openedAt: stringOrNull(value.openedAt),
    storageLocation: stringOrNull(value.storageLocation),
    unitPrice: numberOrNull(value.unitPrice),
    purchasePlace: stringOrNull(value.purchasePlace),
    consumedAt: stringOrNull(value.consumedAt),
    discardedAt: stringOrNull(value.discardedAt),
    repeatPurchase: booleanOrFalse(value.repeatPurchase),
    barcode: stringOrNull(value.barcode),
    imageUrl: stringOrNull(value.imageUrl),
    memo: stringOrNull(value.memo),
    createdAt,
    updatedAt,
    deletedAt: stringOrNull(value.deletedAt),
    syncStatus: syncStatusOrDefault(value.syncStatus, "pending_update"),
    lastSyncedAt: stringOrNull(value.lastSyncedAt),
  };
}

async function migrateLegacyIngredients(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const raw = window.localStorage.getItem(LEGACY_INGREDIENTS_STORAGE_KEY);
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
    .map(coerceLegacyIngredient)
    .filter((item): item is LocalIngredientRecord => Boolean(item));

  if (migrated.length === 0) {
    window.localStorage.removeItem(LEGACY_INGREDIENTS_STORAGE_KEY);
    return;
  }

  const current = await readAllFromStore<LocalIngredientRecord>(LOCAL_DB_STORES.ingredients);
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of migrated) {
    const currentItem = byId.get(item.id);
    if (!currentItem || toTime(item.updatedAt) >= toTime(currentItem.updatedAt)) {
      byId.set(item.id, item);
    }
  }

  await putLocalRecords(LOCAL_DB_STORES.ingredients, Array.from(byId.values()));
  window.localStorage.removeItem(LEGACY_INGREDIENTS_STORAGE_KEY);
}

export async function ensureIngredientsMigrated(): Promise<void> {
  migrationPromise ??= migrateLegacyIngredients();
  await migrationPromise;
}

export function belongsToIngredientScope(
  item: Pick<IngredientRecord, "deviceId" | "familyGroupId">,
  deviceId: string,
  scopeContext: LocalDataScopeContext,
): boolean {
  if (scopeContext.scope === "family") {
    return item.familyGroupId === scopeContext.familyGroupId;
  }

  return item.deviceId === deviceId && !item.familyGroupId;
}

export async function listLocalIngredients(
  deviceId: string,
  scopeContext: LocalDataScopeContext,
  options: { includeDeleted?: boolean } = {},
): Promise<LocalIngredientRecord[]> {
  await ensureIngredientsMigrated();
  const records = await readAllFromStore<LocalIngredientRecord>(LOCAL_DB_STORES.ingredients);
  return records
    .filter((item) => belongsToIngredientScope(item, deviceId, scopeContext))
    .filter((item) => options.includeDeleted || !item.deletedAt)
    .sort(compareNewestFirst);
}

export async function getLocalIngredient(ingredientId: string): Promise<LocalIngredientRecord | null> {
  await ensureIngredientsMigrated();
  const records = await readAllFromStore<LocalIngredientRecord>(LOCAL_DB_STORES.ingredients);
  return records.find((item) => item.id === ingredientId) ?? null;
}

export async function replaceScopedLocalIngredients(
  deviceId: string,
  scopeContext: LocalDataScopeContext,
  nextScopedItems: LocalIngredientRecord[],
): Promise<LocalIngredientRecord[]> {
  await ensureIngredientsMigrated();
  const current = await readAllFromStore<LocalIngredientRecord>(LOCAL_DB_STORES.ingredients);
  const nextItems = [
    ...nextScopedItems,
    ...current.filter((item) => !belongsToIngredientScope(item, deviceId, scopeContext)),
  ];
  await putLocalRecords(LOCAL_DB_STORES.ingredients, nextItems);
  return nextScopedItems.filter((item) => !item.deletedAt).sort(compareNewestFirst);
}

export async function upsertLocalIngredient(
  record: LocalIngredientRecord,
): Promise<LocalIngredientRecord> {
  await ensureIngredientsMigrated();
  await putLocalRecord(LOCAL_DB_STORES.ingredients, record);
  return record;
}

export async function hardDeleteLocalIngredient(ingredientId: string): Promise<void> {
  await ensureIngredientsMigrated();
  await deleteLocalRecord(LOCAL_DB_STORES.ingredients, ingredientId);
}

export async function markLocalIngredientDeleted(
  ingredientId: string,
  syncStatus: SyncStatus,
): Promise<LocalIngredientRecord | null> {
  const target = await getLocalIngredient(ingredientId);
  if (!target) {
    return null;
  }

  const now = new Date().toISOString();
  const nextRecord: LocalIngredientRecord = {
    ...target,
    deletedAt: now,
    syncStatus,
    updatedAt: now,
  };
  await upsertLocalIngredient(nextRecord);
  return nextRecord;
}

export async function recordFridgeEvent(
  deviceId: string,
  userId: string | null,
  ingredientId: string,
  action: FridgeEventRecord["action"],
  payload: unknown,
): Promise<void> {
  const now = new Date().toISOString();
  await putLocalRecord<FridgeEventRecord>(LOCAL_DB_STORES.fridgeEvents, {
    id: uuidv4(),
    deviceId,
    userId,
    ingredientId,
    action,
    payloadJson: JSON.stringify(payload),
    createdAt: now,
  });
}

export function nextIngredientSyncStatus(
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
