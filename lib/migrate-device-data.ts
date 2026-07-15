import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "./device-id.ts";
import { ensureFavoritesMigrated } from "./local-db/favorites-repository.ts";
import { ensureIngredientsMigrated } from "./local-db/ingredients-repository.ts";
import { replaceLocalStoreRecords, readAllFromStore } from "./local-db/index.ts";
import {
  LOCAL_DB_STORES,
  type FavoriteRecipeRecord,
  type FridgeEventRecord,
  type LocalIngredientRecord,
  type LocalShoppingItem,
  type PendingSyncQueueEntry,
} from "./local-db/schema.ts";
import { ensureShoppingMigrated } from "./local-db/shopping-repository.ts";
import type { DeviceDataMigrationResult, DeviceDataMigrationTableResult } from "../types/index.ts";

interface MigrateDeviceDataOptions {
  userId: string;
  deviceId?: string;
}

const TABLES_TO_MIGRATE = [
  "ingredients",
  "shopping_items",
  "favorites",
  "community_posts",
  "community_comments",
  "community_likes",
] as const;

const LOCAL_STORAGE_KEYS = [
  "jipbab-note-ingredients",
  "jipbab-note-shopping-items",
  "jipbab-note-community-posts",
  "jipbab-note-community-comments",
  "jipbab-note-community-likes",
] as const;

function migrateLocalStorageKey(storageKey: string, deviceId: string, userId: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return 0;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return 0;
    }

    let migratedCount = 0;

    const nextItems = parsed.map((item) => {
      if (!item || typeof item !== "object") {
        return item;
      }

      const row = item as Record<string, unknown>;
      const rowDeviceId = typeof row.deviceId === "string" ? row.deviceId : null;
      const rowUserId = typeof row.userId === "string" ? row.userId : row.userId === null ? null : undefined;

      if (rowDeviceId === deviceId && (rowUserId === null || rowUserId === undefined || rowUserId === "")) {
        migratedCount += 1;
        return {
          ...row,
          userId,
        };
      }

      return row;
    });

    if (migratedCount > 0) {
      window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
    }

    return migratedCount;
  } catch {
    return 0;
  }
}

function withOwnedUserId<T extends { deviceId?: string | null; userId?: string | null }>(
  record: T,
  deviceId: string,
  userId: string,
): { record: T; migrated: boolean } {
  if (record.deviceId !== deviceId || record.userId) {
    return { record, migrated: false };
  }

  return {
    record: { ...record, userId },
    migrated: true,
  };
}

function hasOwnedGuestIdentity(
  record: { deviceId?: string | null; userId?: string | null },
  deviceId: string,
): boolean {
  return record.deviceId === deviceId && !record.userId;
}

function queueId(tableName: PendingSyncQueueEntry["tableName"], recordId: string): string {
  return `${tableName}:${recordId}`;
}

function parsePayload(payloadJson: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function rekeyGuestRecords<T extends {
  id: string;
  deviceId: string;
  userId: string | null;
  deletedAt?: string | null;
  syncStatus?: LocalIngredientRecord["syncStatus"];
  lastSyncedAt?: string | null;
}>(
  records: T[],
  deviceId: string,
  userId: string,
): { records: T[]; idMap: Map<string, string>; migratedCount: number } {
  const idMap = new Map<string, string>();
  let migratedCount = 0;

  const nextRecords = records.map((record) => {
    if (!hasOwnedGuestIdentity(record, deviceId)) {
      return record;
    }

    const nextId = uuidv4();
    idMap.set(record.id, nextId);
    migratedCount += 1;
    return {
      ...record,
      id: nextId,
      userId,
      syncStatus: record.deletedAt ? "pending_delete" : "pending_create",
      lastSyncedAt: null,
    };
  });

  return { records: nextRecords, idMap, migratedCount };
}

function findRekeyedRecord<T extends { id: string }>(
  records: T[],
  idMap: Map<string, string>,
  previousId: string,
): T | null {
  const nextId = idMap.get(previousId);
  return nextId ? records.find((record) => record.id === nextId) ?? null : null;
}

function appendMissingQueueEntries<T extends { id: string; deletedAt?: string | null }>(
  tableName: PendingSyncQueueEntry["tableName"],
  records: T[],
  idMap: Map<string, string>,
  existingQueueIds: Set<string>,
  queueRows: PendingSyncQueueEntry[],
  now: string,
): void {
  for (const [previousId, nextId] of idMap) {
    const id = queueId(tableName, nextId);
    if (existingQueueIds.has(id)) {
      continue;
    }
    const record = findRekeyedRecord(records, idMap, previousId);
    if (!record) {
      continue;
    }
    queueRows.push({
      id,
      tableName,
      recordId: nextId,
      action: record.deletedAt ? "delete" : "create",
      payloadJson: JSON.stringify(record),
      retryCount: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function migrateLocalDatabase(deviceId: string, userId: string): Promise<number> {
  await Promise.all([
    ensureIngredientsMigrated(),
    ensureShoppingMigrated(),
    ensureFavoritesMigrated(),
  ]);

  let migratedCount = 0;

  const ingredientRows = await readAllFromStore<LocalIngredientRecord>(LOCAL_DB_STORES.ingredients);
  const ingredientMigration = rekeyGuestRecords(ingredientRows, deviceId, userId);
  migratedCount += ingredientMigration.migratedCount;

  const shoppingRows = await readAllFromStore<LocalShoppingItem>(LOCAL_DB_STORES.shoppingItems);
  const shoppingMigration = rekeyGuestRecords(shoppingRows, deviceId, userId);
  migratedCount += shoppingMigration.migratedCount;

  const favoriteRows = await readAllFromStore<FavoriteRecipeRecord>(LOCAL_DB_STORES.favoriteRecipes);
  const nextFavoriteRows = favoriteRows.map((row) => {
    const result = withOwnedUserId(row, deviceId, userId);
    migratedCount += Number(result.migrated);
    return result.record;
  });

  const eventRows = await readAllFromStore<FridgeEventRecord>(LOCAL_DB_STORES.fridgeEvents);
  const nextEventRows = eventRows.map((row) => {
    const result = withOwnedUserId(row, deviceId, userId);
    const nextIngredientId = ingredientMigration.idMap.get(row.ingredientId) ?? row.ingredientId;
    const payload = parsePayload(row.payloadJson);
    const nextPayload = payload && payload.id === row.ingredientId
      ? { ...payload, id: nextIngredientId, userId }
      : payload;
    const changed = result.migrated || nextIngredientId !== row.ingredientId;
    migratedCount += Number(changed);
    return {
      ...result.record,
      ingredientId: nextIngredientId,
      payloadJson: nextPayload ? JSON.stringify(nextPayload) : row.payloadJson,
    };
  });

  const queueRows = await readAllFromStore<PendingSyncQueueEntry>(LOCAL_DB_STORES.pendingSyncQueue);
  const replacedQueueIds = new Set<string>();
  const nextQueueRows = queueRows.flatMap((entry) => {
    const idMap = entry.tableName === LOCAL_DB_STORES.ingredients
      ? ingredientMigration.idMap
      : entry.tableName === LOCAL_DB_STORES.shoppingItems
        ? shoppingMigration.idMap
        : null;
    const nextRecord = idMap && entry.recordId
      ? entry.tableName === LOCAL_DB_STORES.ingredients
        ? findRekeyedRecord(ingredientMigration.records, idMap, entry.recordId)
        : findRekeyedRecord(shoppingMigration.records, idMap, entry.recordId)
      : null;

    if (nextRecord && idMap) {
      const nextId = idMap.get(entry.recordId);
      if (!nextId) {
        return [entry];
      }
      migratedCount += 1;
      replacedQueueIds.add(queueId(entry.tableName, nextId));
      return [{
        ...entry,
        id: queueId(entry.tableName, nextId),
        recordId: nextId,
        action: nextRecord.deletedAt ? "delete" as const : "create" as const,
        payloadJson: JSON.stringify(nextRecord),
        retryCount: 0,
        lastError: null,
      }];
    }

    const payload = parsePayload(entry.payloadJson);
    if (
      !payload ||
      payload.deviceId !== deviceId ||
      (typeof payload.userId === "string" && payload.userId.trim())
    ) {
      return [entry];
    }
    migratedCount += 1;
    return [{ ...entry, payloadJson: JSON.stringify({ ...payload, userId }) }];
  });

  const now = new Date().toISOString();
  appendMissingQueueEntries(
    LOCAL_DB_STORES.ingredients,
    ingredientMigration.records,
    ingredientMigration.idMap,
    replacedQueueIds,
    nextQueueRows,
    now,
  );
  appendMissingQueueEntries(
    LOCAL_DB_STORES.shoppingItems,
    shoppingMigration.records,
    shoppingMigration.idMap,
    replacedQueueIds,
    nextQueueRows,
    now,
  );

  await replaceLocalStoreRecords([
    { storeName: LOCAL_DB_STORES.ingredients, records: ingredientMigration.records },
    { storeName: LOCAL_DB_STORES.shoppingItems, records: shoppingMigration.records },
    { storeName: LOCAL_DB_STORES.favoriteRecipes, records: nextFavoriteRows },
    { storeName: LOCAL_DB_STORES.fridgeEvents, records: nextEventRows },
    { storeName: LOCAL_DB_STORES.pendingSyncQueue, records: nextQueueRows },
  ]);

  return migratedCount;
}

export async function migrateDeviceData(options: MigrateDeviceDataOptions): Promise<DeviceDataMigrationResult> {
  const resolvedDeviceId = options.deviceId?.trim() || getDeviceId();

  if (!resolvedDeviceId || !options.userId.trim()) {
    return {
      totalMigratedCount: 0,
      localMigratedCount: 0,
      tableResults: TABLES_TO_MIGRATE.map((table) => ({
        table,
        migratedCount: 0,
        skipped: true,
        reason: "디바이스 ID 또는 사용자 ID가 없어 이전을 건너뛰었습니다.",
      })),
    };
  }

  const tableResults: DeviceDataMigrationTableResult[] = TABLES_TO_MIGRATE.map((table) => ({
    table,
    migratedCount: 0,
    skipped: true,
    reason: "원격 데이터는 서명된 세션 UID로만 동기화하며, 이 함수는 로컬 데이터만 이전합니다.",
  }));

  let localMigratedCount = await migrateLocalDatabase(resolvedDeviceId, options.userId);
  for (const key of LOCAL_STORAGE_KEYS) {
    localMigratedCount += migrateLocalStorageKey(key, resolvedDeviceId, options.userId);
  }

  return {
    totalMigratedCount: localMigratedCount,
    localMigratedCount,
    tableResults,
    remoteMigrationMode: "signed_session_sync",
  };
}
