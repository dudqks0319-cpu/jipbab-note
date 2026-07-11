import { getDeviceId } from "./device-id.ts";
import { putLocalRecords, readAllFromStore } from "./local-db/index.ts";
import {
  LOCAL_DB_STORES,
  type FavoriteRecipeRecord,
  type FridgeEventRecord,
  type LocalIngredientRecord,
  type LocalShoppingItem,
  type PendingSyncQueueEntry,
} from "./local-db/schema.ts";
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

async function migrateLocalDatabase(deviceId: string, userId: string): Promise<number> {
  let migratedCount = 0;

  const ingredientRows = await readAllFromStore<LocalIngredientRecord>(LOCAL_DB_STORES.ingredients);
  const nextIngredients = ingredientRows.map((row) => {
    const result = withOwnedUserId(row, deviceId, userId);
    migratedCount += Number(result.migrated);
    return result.record;
  });
  await putLocalRecords(LOCAL_DB_STORES.ingredients, nextIngredients);

  const shoppingRows = await readAllFromStore<LocalShoppingItem>(LOCAL_DB_STORES.shoppingItems);
  const nextShoppingRows = shoppingRows.map((row) => {
    const result = withOwnedUserId(row, deviceId, userId);
    migratedCount += Number(result.migrated);
    return result.record;
  });
  await putLocalRecords(LOCAL_DB_STORES.shoppingItems, nextShoppingRows);

  const favoriteRows = await readAllFromStore<FavoriteRecipeRecord>(LOCAL_DB_STORES.favoriteRecipes);
  const nextFavoriteRows = favoriteRows.map((row) => {
    const result = withOwnedUserId(row, deviceId, userId);
    migratedCount += Number(result.migrated);
    return result.record;
  });
  await putLocalRecords(LOCAL_DB_STORES.favoriteRecipes, nextFavoriteRows);

  const eventRows = await readAllFromStore<FridgeEventRecord>(LOCAL_DB_STORES.fridgeEvents);
  const nextEventRows = eventRows.map((row) => {
    const result = withOwnedUserId(row, deviceId, userId);
    migratedCount += Number(result.migrated);
    return result.record;
  });
  await putLocalRecords(LOCAL_DB_STORES.fridgeEvents, nextEventRows);

  const queueRows = await readAllFromStore<PendingSyncQueueEntry>(LOCAL_DB_STORES.pendingSyncQueue);
  const nextQueueRows = queueRows.map((entry) => {
    try {
      const payload = JSON.parse(entry.payloadJson) as Record<string, unknown>;
      if (payload.deviceId !== deviceId || (typeof payload.userId === "string" && payload.userId.trim())) {
        return entry;
      }
      migratedCount += 1;
      return { ...entry, payloadJson: JSON.stringify({ ...payload, userId }) };
    } catch {
      return entry;
    }
  });
  await putLocalRecords(LOCAL_DB_STORES.pendingSyncQueue, nextQueueRows);

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
