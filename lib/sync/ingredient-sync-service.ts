import { INGREDIENT_SYNC_TIMEOUT_MS, mergeIngredientRecords, withTimeout } from "../ingredient-sync.ts";
import {
  hardDeleteLocalIngredient,
  listLocalIngredients,
  replaceScopedLocalIngredients,
  upsertLocalIngredient,
} from "../local-db/ingredients-repository.ts";
import {
  LOCAL_DB_STORES,
  type LocalDataScopeContext,
  type LocalIngredientRecord,
  type PendingSyncQueueEntry,
} from "../local-db/schema.ts";
import { getSupabaseClient } from "../supabase.ts";
import { ensureSignedSupabaseUser, isAnonymousSupabaseUser } from "../supabase-session.ts";
import {
  clearPendingSync,
  listPendingSyncEntries,
  markPendingSyncFailed,
} from "./sync-engine.ts";
import type {
  IngredientInsertPayload,
  IngredientRecord,
  IngredientStorageType,
  IngredientUpdatePayload,
} from "../../types/index.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

type ScopedSupabaseQuery = PromiseLike<{
  data: unknown;
  error: unknown;
}> & {
  eq: (column: string, value: string) => ScopedSupabaseQuery;
  is: (column: string, value: null) => ScopedSupabaseQuery;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
};

type RawIngredientRow = {
  id: string;
  device_id: string;
  user_id: string | null;
  family_group_id?: string | null;
  name: string;
  category: IngredientRecord["category"];
  storage_type: IngredientStorageType;
  quantity: string | null;
  expiry_date: string | null;
  purchase_date: string | null;
  opened_at: string | null;
  storage_location: string | null;
  unit_price: number | null;
  purchase_place: string | null;
  consumed_at: string | null;
  discarded_at: string | null;
  repeat_purchase: boolean | null;
  barcode: string | null;
  image_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type RemoteIngredientPayload = IngredientInsertPayload & IngredientUpdatePayload & {
  id: string;
  updated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasMissingFamilyScopeColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("family_group_id") && /column|schema cache|does not exist/i.test(message);
}

function applyIngredientScope(
  query: ScopedSupabaseQuery,
  scopeContext: LocalDataScopeContext,
): ScopedSupabaseQuery {
  return scopeContext.scope === "family" && scopeContext.familyGroupId
    ? query.eq("family_group_id", scopeContext.familyGroupId)
    : query.is("family_group_id", null);
}

function rowToRecord(row: RawIngredientRow, syncedAt = new Date().toISOString()): LocalIngredientRecord {
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    familyGroupId: row.family_group_id ?? null,
    name: row.name,
    category: row.category,
    storageType: row.storage_type,
    quantity: row.quantity,
    expiryDate: row.expiry_date,
    purchaseDate: row.purchase_date,
    openedAt: row.opened_at,
    storageLocation: row.storage_location,
    unitPrice: row.unit_price,
    purchasePlace: row.purchase_place,
    consumedAt: row.consumed_at,
    discardedAt: row.discarded_at,
    repeatPurchase: row.repeat_purchase ?? false,
    barcode: row.barcode,
    imageUrl: row.image_url,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: null,
    syncStatus: "synced",
    lastSyncedAt: syncedAt,
  };
}

function parseQueuePayload(entry: PendingSyncQueueEntry): LocalIngredientRecord | null {
  try {
    const parsed = JSON.parse(entry.payloadJson) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.deviceId !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return parsed as unknown as LocalIngredientRecord;
  } catch {
    return null;
  }
}

function recordScope(record: LocalIngredientRecord): LocalDataScopeContext {
  return record.familyGroupId
    ? { scope: "family", familyGroupId: record.familyGroupId }
    : { scope: "personal", familyGroupId: null };
}

function toRemotePayload(record: LocalIngredientRecord, userId: string): RemoteIngredientPayload {
  return {
    id: record.id,
    device_id: record.deviceId,
    user_id: userId,
    ...(record.familyGroupId ? { family_group_id: record.familyGroupId } : {}),
    name: record.name,
    category: record.category,
    storage_type: record.storageType,
    quantity: record.quantity,
    expiry_date: record.expiryDate,
    purchase_date: record.purchaseDate ?? null,
    opened_at: record.openedAt ?? null,
    storage_location: record.storageLocation ?? null,
    unit_price: record.unitPrice ?? null,
    purchase_place: record.purchasePlace ?? null,
    consumed_at: record.consumedAt ?? null,
    discarded_at: record.discardedAt ?? null,
    repeat_purchase: record.repeatPurchase ?? false,
    barcode: record.barcode,
    image_url: record.imageUrl,
    memo: record.memo,
    updated_at: record.updatedAt,
  };
}

async function upsertRemoteIngredient(
  client: SupabaseClient,
  record: LocalIngredientRecord,
  userId: string,
): Promise<LocalIngredientRecord> {
  const payload = toRemotePayload(record, userId);
  const { data, error } = await client
    .from("ingredients")
    .upsert(payload)
    .select("*")
    .single();

  if (error) {
    if (hasMissingFamilyScopeColumnError(error) && !record.familyGroupId) {
      const legacyPayload = { ...payload };
      delete legacyPayload.family_group_id;
      const legacyResult = await client
        .from("ingredients")
        .upsert(legacyPayload)
        .select("*")
        .single();
      if (legacyResult.error) {
        throw legacyResult.error;
      }
      return rowToRecord(legacyResult.data as RawIngredientRow);
    }

    throw error;
  }

  return rowToRecord(data as RawIngredientRow);
}

async function deleteRemoteIngredient(client: SupabaseClient, record: LocalIngredientRecord): Promise<void> {
  const scopedQuery = applyIngredientScope(
    client.from("ingredients").delete().eq("id", record.id) as unknown as ScopedSupabaseQuery,
    recordScope(record),
  );
  const { error } = await scopedQuery;

  if (error) {
    if (hasMissingFamilyScopeColumnError(error) && !record.familyGroupId) {
      const legacyResult = await client.from("ingredients").delete().eq("id", record.id);
      if (legacyResult.error) {
        throw legacyResult.error;
      }
      return;
    }

    throw error;
  }
}

async function syncIngredientQueue(
  client: SupabaseClient,
  userId: string,
  allowFamilyScope: boolean,
): Promise<void> {
  const entries = await listPendingSyncEntries(LOCAL_DB_STORES.ingredients);
  if (entries.length === 0) {
    return;
  }

  let firstError: unknown = null;

  for (const entry of entries) {
    const record = parseQueuePayload(entry);
    if (!record) {
      await markPendingSyncFailed(entry, new Error("동기화 payload를 해석할 수 없습니다."));
      firstError ??= new Error("동기화 payload를 해석할 수 없습니다.");
      continue;
    }
    if (record.familyGroupId && !allowFamilyScope) {
      continue;
    }

    try {
      if (entry.action === "delete") {
        await deleteRemoteIngredient(client, record);
        await hardDeleteLocalIngredient(entry.recordId);
      } else {
        const synced = await upsertRemoteIngredient(client, record, userId);
        await upsertLocalIngredient(synced);
      }
      await clearPendingSync(LOCAL_DB_STORES.ingredients, entry.recordId);
    } catch (caught) {
      await markPendingSyncFailed(entry, caught);
      firstError ??= caught;
    }
  }

  if (firstError) {
    throw firstError;
  }
}

async function fetchRemoteIngredients(
  client: SupabaseClient,
  scopeContext: LocalDataScopeContext,
): Promise<LocalIngredientRecord[]> {
  const scopedQuery = applyIngredientScope(
    client.from("ingredients").select("*").order("created_at", { ascending: false }) as unknown as ScopedSupabaseQuery,
    scopeContext,
  );
  const { data, error } = await withTimeout(
    Promise.resolve(scopedQuery),
    INGREDIENT_SYNC_TIMEOUT_MS,
    "재료 목록 동기화 시간이 초과되었습니다.",
  );

  if (error) {
    if (scopeContext.scope === "personal" && hasMissingFamilyScopeColumnError(error)) {
      const legacyResult = await withTimeout(
        Promise.resolve(client.from("ingredients").select("*").order("created_at", { ascending: false })),
        INGREDIENT_SYNC_TIMEOUT_MS,
        "재료 목록 동기화 시간이 초과되었습니다.",
      );
      if (legacyResult.error) {
        throw legacyResult.error;
      }
      return (legacyResult.data ?? [])
        .map((row) => rowToRecord(row as RawIngredientRow))
        .filter((item) => !item.familyGroupId);
    }

    throw error;
  }

  return (Array.isArray(data) ? data : []).map((row: unknown) => rowToRecord(row as RawIngredientRow));
}

export async function syncIngredientsWithSupabase(
  deviceId: string,
  scopeContext: LocalDataScopeContext,
): Promise<LocalIngredientRecord[]> {
  const client = getSupabaseClient();
  let signedUser;
  try {
    signedUser = await ensureSignedSupabaseUser(client);
  } catch {
    return await listLocalIngredients(deviceId, scopeContext, { includeDeleted: true });
  }

  if (!signedUser || (scopeContext.scope === "family" && isAnonymousSupabaseUser(signedUser))) {
    return await listLocalIngredients(deviceId, scopeContext, { includeDeleted: true });
  }

  await syncIngredientQueue(client, signedUser.id, !isAnonymousSupabaseUser(signedUser));
  const [localRecords, remoteRecords] = await Promise.all([
    listLocalIngredients(deviceId, scopeContext, { includeDeleted: true }),
    fetchRemoteIngredients(client, scopeContext),
  ]);
  const merged = mergeIngredientRecords(localRecords, remoteRecords) as LocalIngredientRecord[];
  return await replaceScopedLocalIngredients(deviceId, scopeContext, merged);
}
