// 재료 목록 CRUD를 Supabase 우선 + localStorage 폴백으로 제공하는 훅입니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import { INGREDIENT_SYNC_TIMEOUT_MS, mergeIngredientRecords, withTimeout } from "@/lib/ingredient-sync";
import { getSupabaseClient } from "@/lib/supabase";
import { toDateOnlyString } from "@/lib/utils";
import type {
  IngredientFormPayload,
  IngredientInsertPayload,
  IngredientQueryError,
  IngredientRecord,
  IngredientStorageType,
  IngredientUpdatePayload,
} from "@/types";

const STORAGE_KEY = "jipbab-note-ingredients";
const DEFAULT_STORAGE_TYPE: IngredientStorageType = "냉장";
const INGREDIENT_SYNC_UNAVAILABLE_MESSAGE = "재료 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
type IngredientDataSource = "supabase" | "local";
type IngredientScope = "personal" | "family";

type IngredientScopeOptions = {
  scope?: IngredientScope;
  familyGroupId?: string | null;
  enabled?: boolean;
};

type IngredientScopeContext = {
  scope: IngredientScope;
  familyGroupId: string | null;
};

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

function rowToRecord(row: RawIngredientRow): IngredientRecord {
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
  };
}

function buildScopeContext(options?: IngredientScopeOptions): IngredientScopeContext {
  const familyGroupId = options?.familyGroupId?.trim() || null;
  return {
    scope: options?.scope === "family" && familyGroupId ? "family" : "personal",
    familyGroupId,
  };
}

function belongsToScope(item: IngredientRecord, deviceId: string, scopeContext: IngredientScopeContext): boolean {
  if (scopeContext.scope === "family") {
    return item.familyGroupId === scopeContext.familyGroupId;
  }

  return item.deviceId === deviceId && !item.familyGroupId;
}

function safeReadAllLocalIngredients(): IngredientRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is IngredientRecord => {
        return (
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          "deviceId" in item &&
          "name" in item &&
          typeof item.id === "string" &&
          typeof item.deviceId === "string" &&
          typeof item.name === "string"
        );
      });
  } catch {
    return [];
  }
}

function safeReadLocalIngredients(deviceId: string, scopeContext: IngredientScopeContext): IngredientRecord[] {
  return safeReadAllLocalIngredients().filter((item) => belongsToScope(item, deviceId, scopeContext));
}

function safeWriteLocalIngredients(nextItems: IngredientRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

function replaceScopedLocalIngredients(
  deviceId: string,
  scopeContext: IngredientScopeContext,
  nextScopedItems: IngredientRecord[],
): IngredientRecord[] {
  const nextItems = [
    ...nextScopedItems,
    ...safeReadAllLocalIngredients().filter((item) => !belongsToScope(item, deviceId, scopeContext)),
  ];
  safeWriteLocalIngredients(nextItems);
  return nextScopedItems;
}

function upsertLocalIngredient(nextItem: IngredientRecord, scopeContext: IngredientScopeContext): IngredientRecord[] {
  const current = safeReadAllLocalIngredients();
  const index = current.findIndex((item) => item.id === nextItem.id);
  if (index === -1) {
    const next = [nextItem, ...current];
    safeWriteLocalIngredients(next);
    return next.filter((item) => belongsToScope(item, nextItem.deviceId, scopeContext));
  }

  const next = [...current];
  next[index] = nextItem;
  safeWriteLocalIngredients(next);
  return next.filter((item) => belongsToScope(item, nextItem.deviceId, scopeContext));
}

function removeLocalIngredient(
  deviceId: string,
  scopeContext: IngredientScopeContext,
  ingredientId: string,
): IngredientRecord[] {
  const current = safeReadAllLocalIngredients();
  const next = current.filter((item) => item.id !== ingredientId);
  safeWriteLocalIngredients(next);
  return next.filter((item) => belongsToScope(item, deviceId, scopeContext));
}

function toInsertPayload(
  deviceId: string,
  payload: IngredientFormPayload,
  userId: string | null,
  familyGroupId: string | null,
): IngredientInsertPayload {
  const normalized = normalizeFormPayload(payload);

  return {
    device_id: deviceId,
    user_id: userId,
    ...(familyGroupId ? { family_group_id: familyGroupId } : {}),
    name: normalized.name,
    category: normalized.category,
    storage_type: normalized.storageType,
    quantity: normalized.quantity,
    expiry_date: normalized.expiryDate,
    purchase_date: normalized.purchaseDate,
    opened_at: normalized.openedAt,
    storage_location: normalized.storageLocation,
    unit_price: normalized.unitPrice,
    purchase_place: normalized.purchasePlace,
    consumed_at: normalized.consumedAt,
    discarded_at: normalized.discardedAt,
    repeat_purchase: normalized.repeatPurchase,
    barcode: normalized.barcode,
    image_url: normalized.imageUrl,
    memo: normalized.memo,
  };
}

function toUpdatePayload(payload: IngredientFormPayload): IngredientUpdatePayload {
  const normalized = normalizeFormPayload(payload);

  return {
    name: normalized.name,
    category: normalized.category,
    storage_type: normalized.storageType,
    quantity: normalized.quantity,
    expiry_date: normalized.expiryDate,
    purchase_date: normalized.purchaseDate,
    opened_at: normalized.openedAt,
    storage_location: normalized.storageLocation,
    unit_price: normalized.unitPrice,
    purchase_place: normalized.purchasePlace,
    consumed_at: normalized.consumedAt,
    discarded_at: normalized.discardedAt,
    repeat_purchase: normalized.repeatPurchase,
    barcode: normalized.barcode,
    image_url: normalized.imageUrl,
    memo: normalized.memo,
  };
}

function makeLocalRecord(
  deviceId: string,
  payload: IngredientFormPayload,
  userId: string | null,
  familyGroupId: string | null,
): IngredientRecord {
  const normalized = normalizeFormPayload(payload);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    deviceId,
    userId,
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
  };
}

function makeError(message: string, source: IngredientQueryError["source"]): IngredientQueryError {
  return { message, source };
}

function hasMissingFamilyScopeColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("family_group_id") && /column|schema cache|does not exist/i.test(message);
}

function applyIngredientScope(
  query: ScopedSupabaseQuery,
  scopeContext: IngredientScopeContext,
): ScopedSupabaseQuery {
  return scopeContext.scope === "family" && scopeContext.familyGroupId
    ? query.eq("family_group_id", scopeContext.familyGroupId)
    : query.is("family_group_id", null);
}

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

function normalizeIngredientKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
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

  const listIngredients = useCallback(async (): Promise<IngredientRecord[]> => {
    if (!enabled) {
      setIngredients([]);
      setLoading(false);
      setError(null);
      setSource("local");
      return [];
    }

    const localFallback = safeReadLocalIngredients(deviceId, scopeContext);
    if (localFallback.length > 0) {
      setIngredients(localFallback);
    }
    setLoading(localFallback.length === 0);
    setError(null);

    try {
      const client = getSupabaseClient({ deviceId });
      const scopedQuery = applyIngredientScope(
        client.from("ingredients").select("*").order("created_at", { ascending: false }) as unknown as ScopedSupabaseQuery,
        scopeContext,
      );
      const { data, error: queryError } = await withTimeout(
        Promise.resolve(scopedQuery),
        INGREDIENT_SYNC_TIMEOUT_MS,
        "재료 목록 동기화 시간이 초과되었습니다.",
      );

      if (queryError) {
        throw queryError;
      }

      const mapped = (Array.isArray(data) ? data : []).map((row: unknown) => rowToRecord(row as RawIngredientRow));
      const merged = mergeIngredientRecords(localFallback, mapped);
      setIngredients(merged);
      setSource("supabase");
      replaceScopedLocalIngredients(deviceId, scopeContext, merged);
      return merged;
    } catch (caught) {
      if (scopeContext.scope === "personal" && hasMissingFamilyScopeColumnError(caught)) {
        try {
          const client = getSupabaseClient({ deviceId });
          const { data, error: legacyQueryError } = await withTimeout(
            Promise.resolve(client.from("ingredients").select("*").order("created_at", { ascending: false })),
            INGREDIENT_SYNC_TIMEOUT_MS,
            "재료 목록 동기화 시간이 초과되었습니다.",
          );
          if (legacyQueryError) {
            throw legacyQueryError;
          }

          const mapped = (data ?? []).map((row) => rowToRecord(row as RawIngredientRow));
          const merged = mergeIngredientRecords(localFallback, mapped.filter((item) => !item.familyGroupId));
          setIngredients(merged);
          setSource("supabase");
          replaceScopedLocalIngredients(deviceId, scopeContext, merged);
          return merged;
        } catch (legacyCaught) {
          console.warn("재료 목록 legacy 동기화도 실패", legacyCaught);
        }
      }

      const fallback = safeReadLocalIngredients(deviceId, scopeContext);
      setIngredients(fallback);
      setSource("local");
      if (fallback.length > 0) {
        console.warn("재료 목록 로컬 표시로 전환", caught);
        setError(null);
      } else {
        setError(makeError(INGREDIENT_SYNC_UNAVAILABLE_MESSAGE, "supabase"));
      }
      return fallback;
    } finally {
      setLoading(false);
    }
  }, [deviceId, enabled, scopeContext]);

  const fetchIngredient = useCallback(
    async (ingredientId: string): Promise<IngredientRecord | null> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const scopedQuery = applyIngredientScope(
          client
          .from("ingredients")
          .select("*")
          .eq("id", ingredientId) as unknown as ScopedSupabaseQuery,
          scopeContext,
        );
        const { data, error: queryError } = await scopedQuery.maybeSingle();

        if (queryError) {
          throw queryError;
        }

        return data ? rowToRecord(data as RawIngredientRow) : null;
      } catch {
        const fallback = safeReadLocalIngredients(deviceId, scopeContext).find((item) => item.id === ingredientId) ?? null;
        setError(makeError(INGREDIENT_SYNC_UNAVAILABLE_MESSAGE, "supabase"));
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, scopeContext],
  );

  const addIngredient = useCallback(
    async (payload: IngredientFormPayload): Promise<IngredientRecord> => {
      setLoading(true);
      setError(null);
      let userId: string | null = null;

      try {
        const client = getSupabaseClient({ deviceId });
        const { data: authData } = await client.auth.getUser();
        userId = authData.user?.id ?? null;

        const insertPayload = toInsertPayload(
          deviceId,
          payload,
          userId,
          scopeContext.scope === "family" ? scopeContext.familyGroupId : null,
        );
        const { data, error: queryError } = await client
          .from("ingredients")
          .insert(insertPayload)
          .select("*")
          .single();

        if (queryError) {
          throw queryError;
        }

        const nextRecord = rowToRecord(data as RawIngredientRow);
        setIngredients((prev) => [nextRecord, ...prev]);
        setSource("supabase");
        upsertLocalIngredient(nextRecord, scopeContext);
        return nextRecord;
      } catch (caught) {
        const nextLocal = makeLocalRecord(
          deviceId,
          payload,
          userId,
          scopeContext.scope === "family" ? scopeContext.familyGroupId : null,
        );
        const nextItems = upsertLocalIngredient(nextLocal, scopeContext);
        setIngredients(nextItems);
        setSource("local");
        // Supabase가 지연되어도 로컬 저장이 성공하면 사용자는 성공 플로우를 유지합니다.
        console.warn("재료 로컬 저장으로 전환", caught);
        setError(null);
        return nextLocal;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, scopeContext],
  );

  const updateIngredient = useCallback(
    async (ingredientId: string, payload: IngredientFormPayload): Promise<IngredientRecord | null> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const updatePayload = toUpdatePayload(payload);

        const scopedQuery = applyIngredientScope(
          client
          .from("ingredients")
          .update(updatePayload)
          .eq("id", ingredientId)
          .select("*") as unknown as ScopedSupabaseQuery,
          scopeContext,
        );
        const { data, error: queryError } = await scopedQuery.maybeSingle();

        if (queryError) {
          throw queryError;
        }

        if (!data) {
          return null;
        }

        const nextRecord = rowToRecord(data as RawIngredientRow);
        setIngredients((prev) => prev.map((item) => (item.id === ingredientId ? nextRecord : item)));
        setSource("supabase");
        upsertLocalIngredient(nextRecord, scopeContext);
        return nextRecord;
      } catch (caught) {
        const current = safeReadLocalIngredients(deviceId, scopeContext);
        const target = current.find((item) => item.id === ingredientId);
        if (!target) {
          setError(makeError("재료를 수정하지 못했습니다. 잠시 후 다시 시도해주세요.", "supabase"));
          return null;
        }

        const normalized = normalizeFormPayload(payload);
        const nextRecord: IngredientRecord = {
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
          updatedAt: new Date().toISOString(),
        };

        const nextItems = upsertLocalIngredient(nextRecord, scopeContext);
        setIngredients(nextItems);
        setSource("local");
        console.warn("재료 수정 로컬 저장으로 전환", caught);
        setError(null);
        return nextRecord;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, scopeContext],
  );

  const deleteIngredient = useCallback(
    async (ingredientId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const scopedQuery = applyIngredientScope(
          client.from("ingredients").delete().eq("id", ingredientId) as unknown as ScopedSupabaseQuery,
          scopeContext,
        );
        const { error: queryError } = await scopedQuery;

        if (queryError) {
          throw queryError;
        }

        setIngredients((prev) => prev.filter((item) => item.id !== ingredientId));
        setSource("supabase");
        removeLocalIngredient(deviceId, scopeContext, ingredientId);
        return true;
      } catch (caught) {
        const nextItems = removeLocalIngredient(deviceId, scopeContext, ingredientId);
        setIngredients(nextItems);
        setSource("local");
        console.warn("재료 삭제 로컬 저장으로 전환", caught);
        setError(null);
        return true;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, scopeContext],
  );

  useEffect(() => {
    void listIngredients();
  }, [listIngredients]);

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
