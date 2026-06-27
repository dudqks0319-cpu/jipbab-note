import {
  hardDeleteLocalShoppingItem,
  listLocalShoppingItems,
  replaceScopedLocalShoppingItems,
  upsertLocalShoppingItem,
} from "../local-db/shopping-repository.ts";
import {
  LOCAL_DB_STORES,
  type LocalDataScopeContext,
  type LocalShoppingItem,
  type PendingSyncQueueEntry,
} from "../local-db/schema.ts";
import { mergeShoppingItems } from "../shopping-sync.ts";
import { getSupabaseClient } from "../supabase.ts";
import { withTimeout } from "../ingredient-sync.ts";
import {
  clearPendingSync,
  listPendingSyncEntries,
  markPendingSyncFailed,
} from "./sync-engine.ts";
import type {
  IngredientCategory,
} from "../../types/index.ts";

const SHOPPING_SYNC_TIMEOUT_MS = 3500;

type ScopedSupabaseQuery = PromiseLike<{
  data: unknown;
  error: unknown;
}> & {
  eq: (column: string, value: string) => ScopedSupabaseQuery;
  is: (column: string, value: null) => ScopedSupabaseQuery;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
};

type RawShoppingRow = {
  id: string;
  device_id: string;
  user_id: string | null;
  family_group_id?: string | null;
  name: string;
  quantity: string | null;
  category: IngredientCategory | null;
  checked: boolean;
  source_recipe_id: string | null;
  source_recipe_name: string | null;
  created_at: string;
  updated_at: string;
};

type RemoteShoppingPayload = {
  id: string;
  device_id: string;
  user_id: string | null;
  family_group_id?: string | null;
  name: string;
  quantity: string | null;
  category: IngredientCategory | null;
  checked: boolean;
  source_recipe_id: string | null;
  source_recipe_name: string | null;
  updated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasMissingFamilyScopeColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("family_group_id") && /column|schema cache|does not exist/i.test(message);
}

function applyShoppingScope(
  query: ScopedSupabaseQuery,
  scopeContext: LocalDataScopeContext,
): ScopedSupabaseQuery {
  return scopeContext.scope === "family" && scopeContext.familyGroupId
    ? query.eq("family_group_id", scopeContext.familyGroupId)
    : query.is("family_group_id", null);
}

function rowToItem(row: RawShoppingRow, syncedAt = new Date().toISOString()): LocalShoppingItem {
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    familyGroupId: row.family_group_id ?? null,
    name: row.name,
    quantity: row.quantity,
    category: row.category,
    checked: row.checked,
    sourceRecipeId: row.source_recipe_id,
    sourceRecipeName: row.source_recipe_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: null,
    syncStatus: "synced",
    lastSyncedAt: syncedAt,
  };
}

function parseQueuePayload(entry: PendingSyncQueueEntry): LocalShoppingItem | null {
  try {
    const parsed = JSON.parse(entry.payloadJson) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.deviceId !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.checked !== "boolean" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return parsed as unknown as LocalShoppingItem;
  } catch {
    return null;
  }
}

function recordScope(record: LocalShoppingItem): LocalDataScopeContext {
  return record.familyGroupId
    ? { scope: "family", familyGroupId: record.familyGroupId }
    : { scope: "personal", familyGroupId: null };
}

function toRemotePayload(item: LocalShoppingItem, userId: string | null): RemoteShoppingPayload {
  return {
    id: item.id,
    device_id: item.deviceId,
    user_id: userId ?? item.userId,
    ...(item.familyGroupId ? { family_group_id: item.familyGroupId } : {}),
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    checked: item.checked,
    source_recipe_id: item.sourceRecipeId,
    source_recipe_name: item.sourceRecipeName,
    updated_at: item.updatedAt,
  };
}

async function getCurrentUserId(deviceId: string): Promise<string | null> {
  const client = getSupabaseClient({ deviceId });
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

async function upsertRemoteShoppingItem(
  item: LocalShoppingItem,
  userId: string | null,
): Promise<LocalShoppingItem> {
  const client = getSupabaseClient({ deviceId: item.deviceId });
  const payload = toRemotePayload(item, userId);
  const { data, error } = await client
    .from("shopping_items")
    .upsert(payload)
    .select("*")
    .single();

  if (error) {
    if (hasMissingFamilyScopeColumnError(error) && !item.familyGroupId) {
      const legacyPayload = { ...payload };
      delete legacyPayload.family_group_id;
      const legacyResult = await client
        .from("shopping_items")
        .upsert(legacyPayload)
        .select("*")
        .single();
      if (legacyResult.error) {
        throw legacyResult.error;
      }
      return rowToItem(legacyResult.data as RawShoppingRow);
    }

    throw error;
  }

  return rowToItem(data as RawShoppingRow);
}

async function deleteRemoteShoppingItem(item: LocalShoppingItem): Promise<void> {
  const client = getSupabaseClient({ deviceId: item.deviceId });
  const scopedQuery = applyShoppingScope(
    client.from("shopping_items").delete().eq("id", item.id) as unknown as ScopedSupabaseQuery,
    recordScope(item),
  );
  const { error } = await scopedQuery;

  if (error) {
    if (hasMissingFamilyScopeColumnError(error) && !item.familyGroupId) {
      const legacyResult = await client.from("shopping_items").delete().eq("id", item.id);
      if (legacyResult.error) {
        throw legacyResult.error;
      }
      return;
    }

    throw error;
  }
}

async function syncShoppingQueue(deviceId: string): Promise<void> {
  const entries = await listPendingSyncEntries(LOCAL_DB_STORES.shoppingItems);
  if (entries.length === 0) {
    return;
  }

  const userId = await getCurrentUserId(deviceId);
  let firstError: unknown = null;

  for (const entry of entries) {
    const item = parseQueuePayload(entry);
    if (!item) {
      await markPendingSyncFailed(entry, new Error("동기화 payload를 해석할 수 없습니다."));
      firstError ??= new Error("동기화 payload를 해석할 수 없습니다.");
      continue;
    }

    try {
      if (entry.action === "delete") {
        await deleteRemoteShoppingItem(item);
        await hardDeleteLocalShoppingItem(entry.recordId);
      } else {
        const synced = await upsertRemoteShoppingItem(item, userId);
        await upsertLocalShoppingItem(synced);
      }
      await clearPendingSync(LOCAL_DB_STORES.shoppingItems, entry.recordId);
    } catch (caught) {
      await markPendingSyncFailed(entry, caught);
      firstError ??= caught;
    }
  }

  if (firstError) {
    throw firstError;
  }
}

async function fetchRemoteShoppingItems(
  deviceId: string,
  scopeContext: LocalDataScopeContext,
): Promise<LocalShoppingItem[]> {
  const client = getSupabaseClient({ deviceId });
  const scopedQuery = applyShoppingScope(
    client
      .from("shopping_items")
      .select("*")
      .order("created_at", { ascending: false }) as unknown as ScopedSupabaseQuery,
    scopeContext,
  );
  const { data, error } = await withTimeout(
    Promise.resolve(scopedQuery),
    SHOPPING_SYNC_TIMEOUT_MS,
    "장보기 목록 동기화 시간이 초과되었습니다.",
  );

  if (error) {
    if (scopeContext.scope === "personal" && hasMissingFamilyScopeColumnError(error)) {
      const legacyResult = await withTimeout(
        Promise.resolve(client.from("shopping_items").select("*").order("created_at", { ascending: false })),
        SHOPPING_SYNC_TIMEOUT_MS,
        "장보기 목록 동기화 시간이 초과되었습니다.",
      );
      if (legacyResult.error) {
        throw legacyResult.error;
      }
      return (legacyResult.data ?? [])
        .map((row) => rowToItem(row as RawShoppingRow))
        .filter((item) => !item.familyGroupId);
    }

    throw error;
  }

  return (Array.isArray(data) ? data : []).map((row: unknown) => rowToItem(row as RawShoppingRow));
}

export async function syncShoppingWithSupabase(
  deviceId: string,
  scopeContext: LocalDataScopeContext,
): Promise<LocalShoppingItem[]> {
  await syncShoppingQueue(deviceId);
  const [localItems, remoteItems] = await Promise.all([
    listLocalShoppingItems(deviceId, scopeContext, { includeDeleted: true }),
    fetchRemoteShoppingItems(deviceId, scopeContext),
  ]);
  const merged = mergeShoppingItems(localItems, remoteItems) as LocalShoppingItem[];
  return await replaceScopedLocalShoppingItems(deviceId, scopeContext, merged);
}
