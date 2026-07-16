// 재료 목록 CRUD를 IndexedDB local-first 저장소와 Supabase 백그라운드 동기화로 제공하는 훅입니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import {
  getLocalIngredient,
  listLocalIngredients,
  nextIngredientSyncStatus,
  recordFridgeEvent,
  upsertLocalIngredient,
  markLocalIngredientDeleted,
} from "@/lib/local-db/ingredients-repository";
import { subscribeLocalDb } from "@/lib/local-db";
import {
  LOCAL_DB_STORES,
  type LocalDataScopeContext,
  type LocalIngredientRecord,
  type PendingSyncAction,
} from "@/lib/local-db/schema";
import { syncIngredientsWithSupabase } from "@/lib/sync/ingredient-sync-service";
import { enqueuePendingSync } from "@/lib/sync/sync-engine";
import { toDateOnlyString } from "@/lib/utils";
import type {
  IngredientFormPayload,
  IngredientQueryError,
  IngredientRecord,
  IngredientStorageType,
} from "@/types";

const DEFAULT_STORAGE_TYPE: IngredientStorageType = "냉장";
const INGREDIENT_SYNC_UNAVAILABLE_MESSAGE = "재료 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";

type IngredientDataSource = "supabase" | "local";
type IngredientScope = "personal" | "family";

type IngredientScopeOptions = {
  scope?: IngredientScope;
  familyGroupId?: string | null;
  enabled?: boolean;
};

type IngredientScopeContext = LocalDataScopeContext;

export interface UseIngredientsResult {
  ingredients: IngredientRecord[];
  loading: boolean;
  error: IngredientQueryError | null;
  source: IngredientDataSource;
  listIngredients: () => Promise<IngredientRecord[]>;
  fetchIngredient: (ingredientId: string) => Promise<IngredientRecord | null>;
  addIngredient: (payload: IngredientFormPayload) => Promise<IngredientRecord>;
  updateIngredient: (ingredientId: string, payload: IngredientFormPayload) => Promise<IngredientRecord | null>;
  deleteIngredient: (ingredientId: string) => Promise<boolean>;
}

function normalizeFormPayload(payload: IngredientFormPayload): IngredientFormPayload {
  return {
    name: payload.name.trim(),
    category: payload.category ?? null,
    storageType: payload.storageType ?? DEFAULT_STORAGE_TYPE,
    quantity: payload.quantity?.trim() || null,
    expiryDate: toDateOnlyString(payload.expiryDate) ?? null,
    purchaseDate: toDateOnlyString(payload.purchaseDate) ?? null,
    openedAt: payload.openedAt?.trim() || null,
    storageLocation: payload.storageLocation?.trim() || null,
    unitPrice: typeof payload.unitPrice === "number" && Number.isFinite(payload.unitPrice) && payload.unitPrice >= 0
      ? payload.unitPrice
      : null,
    purchasePlace: payload.purchasePlace?.trim() || null,
    consumedAt: payload.consumedAt?.trim() || null,
    discardedAt: payload.discardedAt?.trim() || null,
    repeatPurchase: payload.repeatPurchase ?? false,
    barcode: payload.barcode?.trim() || null,
    imageUrl: payload.imageUrl?.trim() || null,
    memo: payload.memo?.trim() || null,
  };
}

function buildScopeContext(options?: IngredientScopeOptions): IngredientScopeContext {
  const familyGroupId = options?.familyGroupId?.trim() || null;
  return {
    scope: options?.scope === "family" && familyGroupId ? "family" : "personal",
    familyGroupId,
  };
}

function makeLocalRecord(
  deviceId: string,
  payload: IngredientFormPayload,
  familyGroupId: string | null,
): LocalIngredientRecord {
  const normalized = normalizeFormPayload(payload);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    deviceId,
    userId: null,
    familyGroupId,
    name: normalized.name,
    category: normalized.category ?? null,
    storageType: normalized.storageType ?? DEFAULT_STORAGE_TYPE,
    quantity: normalized.quantity ?? null,
    expiryDate: normalized.expiryDate ?? null,
    purchaseDate: normalized.purchaseDate ?? null,
    openedAt: normalized.openedAt ?? null,
    storageLocation: normalized.storageLocation ?? null,
    unitPrice: normalized.unitPrice ?? null,
    purchasePlace: normalized.purchasePlace ?? null,
    consumedAt: normalized.consumedAt ?? null,
    discardedAt: normalized.discardedAt ?? null,
    repeatPurchase: normalized.repeatPurchase ?? false,
    barcode: normalized.barcode ?? null,
    imageUrl: normalized.imageUrl ?? null,
    memo: normalized.memo ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending_create",
    lastSyncedAt: null,
  };
}

function applyPayloadToRecord(
  target: LocalIngredientRecord,
  payload: IngredientFormPayload,
  syncAction: PendingSyncAction,
): LocalIngredientRecord {
  const normalized = normalizeFormPayload(payload);

  return {
    ...target,
    name: normalized.name,
    category: normalized.category ?? null,
    storageType: normalized.storageType ?? DEFAULT_STORAGE_TYPE,
    quantity: normalized.quantity ?? null,
    expiryDate: normalized.expiryDate ?? null,
    purchaseDate: normalized.purchaseDate ?? null,
    openedAt: normalized.openedAt ?? null,
    storageLocation: normalized.storageLocation ?? null,
    unitPrice: normalized.unitPrice ?? null,
    purchasePlace: normalized.purchasePlace ?? null,
    consumedAt: normalized.consumedAt ?? null,
    discardedAt: normalized.discardedAt ?? null,
    repeatPurchase: normalized.repeatPurchase ?? false,
    barcode: normalized.barcode ?? null,
    imageUrl: normalized.imageUrl ?? null,
    memo: normalized.memo ?? null,
    deletedAt: null,
    syncStatus: nextIngredientSyncStatus(target.syncStatus, syncAction),
    updatedAt: new Date().toISOString(),
  };
}

function makeError(message: string, source: IngredientQueryError["source"]): IngredientQueryError {
  return { message, source };
}

function normalizeIngredientKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function visibleIngredients(items: LocalIngredientRecord[]): IngredientRecord[] {
  return items.filter((item) => !item.deletedAt);
}

export function useIngredients(options?: IngredientScopeOptions): UseIngredientsResult {
  const deviceId = useMemo(() => getDeviceId(), []);
  const requestedScope = options?.scope ?? "personal";
  const requestedFamilyGroupId = options?.familyGroupId ?? null;
  const enabled = options?.enabled ?? true;
  const scopeContext = useMemo(
    () => buildScopeContext({ scope: requestedScope, familyGroupId: requestedFamilyGroupId }),
    [requestedFamilyGroupId, requestedScope],
  );
  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<IngredientQueryError | null>(null);
  const [source, setSource] = useState<IngredientDataSource>("local");

  const loadLocalIngredients = useCallback(async (): Promise<LocalIngredientRecord[]> => {
    if (!enabled) {
      setIngredients([]);
      setLoading(false);
      setError(null);
      setSource("local");
      return [];
    }

    const localItems = await listLocalIngredients(deviceId, scopeContext);
    setIngredients(localItems);
    setSource("local");
    return localItems;
  }, [deviceId, enabled, scopeContext]);

  const syncInBackground = useCallback(async (): Promise<LocalIngredientRecord[]> => {
    const synced = await syncIngredientsWithSupabase(deviceId, scopeContext);
    setIngredients(synced);
    setSource("supabase");
    setError(null);
    return synced;
  }, [deviceId, scopeContext]);

  const queueAndSync = useCallback(
    async (record: LocalIngredientRecord, action: PendingSyncAction): Promise<void> => {
      await enqueuePendingSync({
        tableName: LOCAL_DB_STORES.ingredients,
        recordId: record.id,
        action,
        payload: record,
      });

      void syncInBackground().catch(() => {
        setSource("local");
      });
    },
    [syncInBackground],
  );

  const listIngredients = useCallback(async (): Promise<IngredientRecord[]> => {
    if (!enabled) {
      setIngredients([]);
      setLoading(false);
      setError(null);
      setSource("local");
      return [];
    }

    setError(null);
    const localItems = await loadLocalIngredients();
    setLoading(localItems.length === 0);

    try {
      const synced = await syncInBackground();
      return visibleIngredients(synced);
    } catch {
      setSource("local");
      if (localItems.length === 0) {
        setError(makeError(INGREDIENT_SYNC_UNAVAILABLE_MESSAGE, "supabase"));
      }
      return visibleIngredients(localItems);
    } finally {
      setLoading(false);
    }
  }, [enabled, loadLocalIngredients, syncInBackground]);

  const fetchIngredient = useCallback(
    async (ingredientId: string): Promise<IngredientRecord | null> => {
      setLoading(true);
      setError(null);

      try {
        const local = await getLocalIngredient(ingredientId);
        if (local && !local.deletedAt) {
          return local;
        }

        const synced = await syncInBackground();
        return synced.find((item) => item.id === ingredientId && !item.deletedAt) ?? null;
      } catch {
        setError(makeError(INGREDIENT_SYNC_UNAVAILABLE_MESSAGE, "supabase"));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [syncInBackground],
  );

  const addIngredient = useCallback(
    async (payload: IngredientFormPayload): Promise<IngredientRecord> => {
      setLoading(true);
      setError(null);

      const nextRecord = makeLocalRecord(
        deviceId,
        payload,
        scopeContext.scope === "family" ? scopeContext.familyGroupId : null,
      );
      await upsertLocalIngredient(nextRecord);
      await recordFridgeEvent(deviceId, null, nextRecord.id, "create", nextRecord);
      const nextItems = await loadLocalIngredients();
      setIngredients(nextItems);
      setSource("local");
      setLoading(false);
      await queueAndSync(nextRecord, "create");
      return nextRecord;
    },
    [deviceId, loadLocalIngredients, queueAndSync, scopeContext],
  );

  const updateIngredient = useCallback(
    async (ingredientId: string, payload: IngredientFormPayload): Promise<IngredientRecord | null> => {
      setLoading(true);
      setError(null);

      const target = await getLocalIngredient(ingredientId);
      if (!target || target.deletedAt) {
        setError(makeError("재료를 수정하지 못했습니다. 잠시 후 다시 시도해주세요.", "local"));
        setLoading(false);
        return null;
      }

      const syncAction: PendingSyncAction = target.syncStatus === "pending_create" ? "create" : "update";
      const nextRecord = applyPayloadToRecord(target, payload, syncAction);
      await upsertLocalIngredient(nextRecord);
      await recordFridgeEvent(deviceId, target.userId, nextRecord.id, "update", nextRecord);
      const nextItems = await loadLocalIngredients();
      setIngredients(nextItems);
      setSource("local");
      setLoading(false);
      await queueAndSync(nextRecord, syncAction);
      return nextRecord;
    },
    [deviceId, loadLocalIngredients, queueAndSync],
  );

  const deleteIngredient = useCallback(
    async (ingredientId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      const target = await getLocalIngredient(ingredientId);
      if (!target || target.deletedAt) {
        setLoading(false);
        return false;
      }

      const nextRecord = await markLocalIngredientDeleted(ingredientId, "pending_delete");
      if (!nextRecord) {
        setLoading(false);
        return false;
      }

      await recordFridgeEvent(deviceId, target.userId, ingredientId, "delete", nextRecord);
      const nextItems = await loadLocalIngredients();
      setIngredients(nextItems);
      setSource("local");
      setLoading(false);
      await queueAndSync(nextRecord, "delete");
      return true;
    },
    [deviceId, loadLocalIngredients, queueAndSync],
  );

  useEffect(() => {
    if (!enabled) {
      setIngredients([]);
      setLoading(false);
      return undefined;
    }

    return subscribeLocalDb(LOCAL_DB_STORES.ingredients, () => {
      void loadLocalIngredients();
    });
  }, [enabled, loadLocalIngredients]);

  useEffect(() => {
    void listIngredients();
  }, [listIngredients]);

  useEffect(() => {
    if (scopeContext.scope !== "family" || !scopeContext.familyGroupId) return undefined;
    const handleFamilyDataChange = (event: Event) => {
      const detail = (event as CustomEvent<{ familyGroupId?: string; table?: string }>).detail;
      if (detail?.familyGroupId === scopeContext.familyGroupId && detail.table === "ingredients") {
        void syncInBackground().catch(() => setSource("local"));
      }
    };
    window.addEventListener("jipbab:family-data-changed", handleFamilyDataChange);
    return () => window.removeEventListener("jipbab:family-data-changed", handleFamilyDataChange);
  }, [scopeContext, syncInBackground]);

  return {
    ingredients: ingredients.filter(
      (item, index, list) =>
        list.findIndex((target) => normalizeIngredientKey(target.name) === normalizeIngredientKey(item.name)) === index,
    ),
    loading,
    error,
    source,
    listIngredients,
    fetchIngredient,
    addIngredient,
    updateIngredient,
    deleteIngredient,
  };
}
