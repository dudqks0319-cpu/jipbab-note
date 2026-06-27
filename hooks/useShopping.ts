// 이 파일은 장보기 목록 CRUD를 IndexedDB local-first 저장소와 Supabase 백그라운드 동기화로 제공합니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import { subscribeLocalDb } from "@/lib/local-db";
import {
  getLocalShoppingItem,
  listLocalShoppingItems,
  markLocalShoppingItemDeleted,
  nextShoppingSyncStatus,
  upsertLocalShoppingItem,
  upsertLocalShoppingItems,
} from "@/lib/local-db/shopping-repository";
import {
  LOCAL_DB_STORES,
  type LocalDataScopeContext,
  type LocalShoppingItem,
  type PendingSyncAction,
} from "@/lib/local-db/schema";
import { syncShoppingWithSupabase } from "@/lib/sync/shopping-sync-service";
import { enqueuePendingSync } from "@/lib/sync/sync-engine";
import type { ShoppingItem, ShoppingItemDraft } from "@/types";

const SHOPPING_SYNC_UNAVAILABLE_MESSAGE = "장보기 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";

type ShoppingQuerySource = "supabase" | "local";
type ShoppingScope = "personal" | "family";

type ShoppingScopeOptions = {
  scope?: ShoppingScope;
  familyGroupId?: string | null;
};

type ShoppingScopeContext = LocalDataScopeContext;

type ShoppingQueryError = {
  message: string;
  source: ShoppingQuerySource;
};

type ShoppingAddOptions = {
  mergeDuplicates?: boolean;
};

type ShoppingAddResult = {
  addedCount: number;
  mergedCount: number;
  skippedDuplicates: string[];
  source: ShoppingQuerySource;
};

export interface UseShoppingResult {
  items: ShoppingItem[];
  uncheckedCount: number;
  checkedCount: number;
  loading: boolean;
  error: ShoppingQueryError | null;
  source: ShoppingQuerySource;
  addItem: (draft: ShoppingItemDraft, options?: ShoppingAddOptions) => Promise<ShoppingAddResult>;
  addItems: (drafts: ShoppingItemDraft[], options?: ShoppingAddOptions) => Promise<ShoppingAddResult>;
  toggleItem: (itemId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
  listItems: () => Promise<ShoppingItem[]>;
}

function normalizeDraft(draft: ShoppingItemDraft): ShoppingItemDraft {
  return {
    name: draft.name.trim(),
    quantity: draft.quantity?.trim() || null,
    category: draft.category ?? null,
    sourceRecipeId: draft.sourceRecipeId?.trim() || null,
    sourceRecipeName: draft.sourceRecipeName?.trim() || null,
  };
}

function buildScopeContext(options?: ShoppingScopeOptions): ShoppingScopeContext {
  const familyGroupId = options?.familyGroupId?.trim() || null;
  return {
    scope: options?.scope === "family" && familyGroupId ? "family" : "personal",
    familyGroupId,
  };
}

function makeLocalItem(
  deviceId: string,
  draft: ShoppingItemDraft,
  familyGroupId: string | null,
): LocalShoppingItem {
  const normalized = normalizeDraft(draft);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    deviceId,
    userId: null,
    familyGroupId,
    name: normalized.name,
    quantity: normalized.quantity ?? null,
    category: normalized.category ?? null,
    checked: false,
    sourceRecipeId: normalized.sourceRecipeId ?? null,
    sourceRecipeName: normalized.sourceRecipeName ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending_create",
    lastSyncedAt: null,
  };
}

function makeError(message: string, source: ShoppingQuerySource): ShoppingQueryError {
  return { message, source };
}

function normalizeShoppingName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function formatMergedNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function mergeQuantityDisplay(currentQuantity: string | null, nextQuantity: string | null): string | null {
  if (!nextQuantity) {
    return currentQuantity;
  }
  if (!currentQuantity) {
    return nextQuantity;
  }

  const current = currentQuantity.trim().match(/^(\d+(?:\.\d+)?)\s*(\S+)$/);
  const next = nextQuantity.trim().match(/^(\d+(?:\.\d+)?)\s*(\S+)$/);
  if (current && next && current[2] === next[2]) {
    return `${formatMergedNumber(Number(current[1]) + Number(next[1]))}${current[2]}`;
  }

  if (currentQuantity.includes(nextQuantity)) {
    return currentQuantity;
  }
  return `${currentQuantity} + ${nextQuantity}`;
}

function mergeSourceDisplay(currentValue: string | null, nextValue: string | null): string | null {
  const parts = [currentValue, nextValue].filter((item): item is string => Boolean(item?.trim()));
  return Array.from(new Set(parts)).join(" · ") || null;
}

function mergeItemWithDraft(item: LocalShoppingItem, draft: ShoppingItemDraft): LocalShoppingItem {
  const normalized = normalizeDraft(draft);
  const syncAction: PendingSyncAction = item.syncStatus === "pending_create" ? "create" : "update";
  return {
    ...item,
    quantity: mergeQuantityDisplay(item.quantity, normalized.quantity ?? null),
    category: item.category ?? normalized.category ?? null,
    sourceRecipeId: mergeSourceDisplay(item.sourceRecipeId, normalized.sourceRecipeId ?? null),
    sourceRecipeName: mergeSourceDisplay(item.sourceRecipeName, normalized.sourceRecipeName ?? null),
    deletedAt: null,
    syncStatus: nextShoppingSyncStatus(item.syncStatus, syncAction),
    updatedAt: new Date().toISOString(),
  };
}

function applyItemSyncStatus(item: LocalShoppingItem, action: PendingSyncAction): LocalShoppingItem {
  return {
    ...item,
    syncStatus: nextShoppingSyncStatus(item.syncStatus, action),
    updatedAt: new Date().toISOString(),
  };
}

export function useShopping(options?: ShoppingScopeOptions): UseShoppingResult {
  const deviceId = useMemo(() => getDeviceId(), []);
  const requestedScope = options?.scope ?? "personal";
  const requestedFamilyGroupId = options?.familyGroupId ?? null;
  const scopeContext = useMemo(
    () => buildScopeContext({ scope: requestedScope, familyGroupId: requestedFamilyGroupId }),
    [requestedFamilyGroupId, requestedScope],
  );
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ShoppingQueryError | null>(null);
  const [source, setSource] = useState<ShoppingQuerySource>("local");

  const loadLocalItems = useCallback(async (): Promise<LocalShoppingItem[]> => {
    const localItems = await listLocalShoppingItems(deviceId, scopeContext);
    setItems(localItems);
    setSource("local");
    return localItems;
  }, [deviceId, scopeContext]);

  const syncInBackground = useCallback(async (): Promise<LocalShoppingItem[]> => {
    const synced = await syncShoppingWithSupabase(deviceId, scopeContext);
    setItems(synced);
    setSource("supabase");
    setError(null);
    return synced;
  }, [deviceId, scopeContext]);

  const queueRecordsAndSync = useCallback(
    async (records: Array<{ record: LocalShoppingItem; action: PendingSyncAction }>): Promise<void> => {
      for (const item of records) {
        await enqueuePendingSync({
          tableName: LOCAL_DB_STORES.shoppingItems,
          recordId: item.record.id,
          action: item.action,
          payload: item.record,
        });
      }

      void syncInBackground().catch(() => {
        setSource("local");
      });
    },
    [syncInBackground],
  );

  const listItems = useCallback(async (): Promise<ShoppingItem[]> => {
    setLoading(true);
    setError(null);

    const localItems = await loadLocalItems();
    setLoading(localItems.length === 0);

    try {
      return await syncInBackground();
    } catch {
      setSource("local");
      if (localItems.length === 0) {
        setError(makeError(SHOPPING_SYNC_UNAVAILABLE_MESSAGE, "supabase"));
      }
      return localItems;
    } finally {
      setLoading(false);
    }
  }, [loadLocalItems, syncInBackground]);

  const addItems = useCallback(
    async (drafts: ShoppingItemDraft[], options: ShoppingAddOptions = {}): Promise<ShoppingAddResult> => {
      const cleanedDrafts = drafts
        .map(normalizeDraft)
        .filter((draft) => draft.name.length > 0);
      if (cleanedDrafts.length === 0) {
        return { addedCount: 0, mergedCount: 0, skippedDuplicates: [], source };
      }

      setLoading(true);
      setError(null);

      const nextItems = await listLocalShoppingItems(deviceId, scopeContext);
      const skippedDuplicates: string[] = [];
      const changed: Array<{ record: LocalShoppingItem; action: PendingSyncAction }> = [];
      let addedCount = 0;
      let mergedCount = 0;

      for (const draft of cleanedDrafts) {
        const existingIndex = nextItems.findIndex(
          (item) => normalizeShoppingName(item.name) === normalizeShoppingName(draft.name),
        );

        if (existingIndex >= 0) {
          if (!options.mergeDuplicates) {
            skippedDuplicates.push(draft.name);
            continue;
          }

          const existing = nextItems[existingIndex];
          if (!existing) {
            continue;
          }
          const merged = mergeItemWithDraft(existing, draft);
          nextItems[existingIndex] = merged;
          changed.push({
            record: merged,
            action: existing.syncStatus === "pending_create" ? "create" : "update",
          });
          mergedCount += 1;
          continue;
        }

        const created = makeLocalItem(
          deviceId,
          draft,
          scopeContext.scope === "family" ? scopeContext.familyGroupId : null,
        );
        nextItems.unshift(created);
        changed.push({ record: created, action: "create" });
        addedCount += 1;
      }

      if (changed.length === 0) {
        setLoading(false);
        return { addedCount: 0, mergedCount: 0, skippedDuplicates, source };
      }

      nextItems.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
      await upsertLocalShoppingItems(changed.map((item) => item.record));
      const latestItems = await loadLocalItems();
      setItems(latestItems);
      setSource("local");
      setLoading(false);
      await queueRecordsAndSync(changed);
      return { addedCount, mergedCount, skippedDuplicates, source: "local" };
    },
    [deviceId, loadLocalItems, queueRecordsAndSync, scopeContext, source],
  );

  const addItem = useCallback(
    async (draft: ShoppingItemDraft, options?: ShoppingAddOptions) => {
      return addItems([draft], options);
    },
    [addItems],
  );

  const toggleItem = useCallback(
    async (itemId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      const target = await getLocalShoppingItem(itemId);
      if (!target || target.deletedAt) {
        setLoading(false);
        return;
      }

      const action: PendingSyncAction = target.syncStatus === "pending_create" ? "create" : "update";
      const nextItem = applyItemSyncStatus({
        ...target,
        checked: !target.checked,
      }, action);
      await upsertLocalShoppingItem(nextItem);
      const nextItems = await loadLocalItems();
      setItems(nextItems);
      setSource("local");
      setLoading(false);
      await queueRecordsAndSync([{ record: nextItem, action }]);
    },
    [loadLocalItems, queueRecordsAndSync],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      const nextItem = await markLocalShoppingItemDeleted(itemId, "pending_delete");
      if (!nextItem) {
        setLoading(false);
        return;
      }

      const nextItems = await loadLocalItems();
      setItems(nextItems);
      setSource("local");
      setLoading(false);
      await queueRecordsAndSync([{ record: nextItem, action: "delete" }]);
    },
    [loadLocalItems, queueRecordsAndSync],
  );

  const clearCheckedItems = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const currentItems = await listLocalShoppingItems(deviceId, scopeContext);
    const checkedItems = currentItems.filter((item) => item.checked);
    if (checkedItems.length === 0) {
      setLoading(false);
      return;
    }

    const now = new Date().toISOString();
    const deletedItems = checkedItems.map((item): LocalShoppingItem => ({
      ...item,
      deletedAt: now,
      syncStatus: "pending_delete",
      updatedAt: now,
    }));
    await upsertLocalShoppingItems(deletedItems);
    const nextItems = await loadLocalItems();
    setItems(nextItems);
    setSource("local");
    setLoading(false);
    await queueRecordsAndSync(deletedItems.map((record) => ({ record, action: "delete" })));
  }, [deviceId, loadLocalItems, queueRecordsAndSync, scopeContext]);

  useEffect(() => {
    return subscribeLocalDb(LOCAL_DB_STORES.shoppingItems, () => {
      void loadLocalItems();
    });
  }, [loadLocalItems]);

  useEffect(() => {
    void listItems();
  }, [listItems]);

  const uncheckedCount = useMemo(
    () => items.filter((item) => !item.checked).length,
    [items],
  );
  const checkedCount = useMemo(
    () => items.filter((item) => item.checked).length,
    [items],
  );

  return {
    items,
    uncheckedCount,
    checkedCount,
    loading,
    error,
    source,
    addItem,
    addItems,
    toggleItem,
    removeItem,
    clearCheckedItems,
    listItems,
  };
}
