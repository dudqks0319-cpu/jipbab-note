// 재료 목록 CRUD를 Supabase 우선 + localStorage 폴백으로 제공하는 훅입니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import { consumeQuantityText } from "@/lib/ingredient-quantity";
import { getSupabaseClient } from "@/lib/supabase";
import { toDateOnlyString } from "@/lib/utils";
import { getActiveFamilyFridgeId } from "@/hooks/useFamilyFridge";
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RawIngredientRow = {
  id: string;
  device_id: string;
  user_id: string | null;
  family_fridge_id: string | null;
  name: string;
  category: IngredientRecord["category"];
  storage_type: IngredientStorageType;
  quantity: string | null;
  expiry_date: string | null;
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
    familyFridgeId: payload.familyFridgeId?.trim() || null,
    quantity: payload.quantity?.trim() || null,
    expiryDate: toDateOnlyString(payload.expiryDate) ?? null,
    barcode: payload.barcode?.trim() || null,
    imageUrl: payload.imageUrl?.trim() || null,
    memo: payload.memo?.trim() || null,
  };
}

function toSupabaseFamilyFridgeId(familyFridgeId: string | null | undefined): string | null {
  if (!familyFridgeId) {
    return null;
  }

  return UUID_PATTERN.test(familyFridgeId) ? familyFridgeId : null;
}

function rowToRecord(row: RawIngredientRow): IngredientRecord {
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    familyFridgeId: row.family_fridge_id,
    name: row.name,
    category: row.category,
    storageType: row.storage_type,
    quantity: row.quantity,
    expiryDate: row.expiry_date,
    barcode: row.barcode,
    imageUrl: row.image_url,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeReadLocalIngredients(deviceId: string, familyFridgeId: string | null): IngredientRecord[] {
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
      })
      .filter((item) => item.deviceId === deviceId || (!!familyFridgeId && item.familyFridgeId === familyFridgeId));
  } catch {
    return [];
  }
}

function safeWriteLocalIngredients(nextItems: IngredientRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

function upsertLocalIngredient(nextItem: IngredientRecord): IngredientRecord[] {
  const current = safeReadLocalIngredients(nextItem.deviceId, nextItem.familyFridgeId ?? null);
  const index = current.findIndex((item) => item.id === nextItem.id);
  if (index === -1) {
    const next = [nextItem, ...current];
    safeWriteLocalIngredients(next);
    return next;
  }

  const next = [...current];
  next[index] = nextItem;
  safeWriteLocalIngredients(next);
  return next;
}

function removeLocalIngredient(deviceId: string, familyFridgeId: string | null, ingredientId: string): IngredientRecord[] {
  const current = safeReadLocalIngredients(deviceId, familyFridgeId);
  const next = current.filter((item) => item.id !== ingredientId);
  safeWriteLocalIngredients(next);
  return next;
}

function toInsertPayload(
  deviceId: string,
  payload: IngredientFormPayload,
  userId: string | null,
  id?: string,
): IngredientInsertPayload {
  const normalized = normalizeFormPayload(payload);

  return {
    id,
    device_id: deviceId,
    user_id: userId,
    family_fridge_id: toSupabaseFamilyFridgeId(normalized.familyFridgeId),
    name: normalized.name,
    category: normalized.category,
    storage_type: normalized.storageType,
    quantity: normalized.quantity,
    expiry_date: normalized.expiryDate,
    barcode: normalized.barcode,
    image_url: normalized.imageUrl,
    memo: normalized.memo,
  };
}

function toUpdatePayload(payload: IngredientFormPayload): IngredientUpdatePayload {
  const normalized = normalizeFormPayload(payload);

  return {
    family_fridge_id: toSupabaseFamilyFridgeId(normalized.familyFridgeId),
    name: normalized.name,
    category: normalized.category,
    storage_type: normalized.storageType,
    quantity: normalized.quantity,
    expiry_date: normalized.expiryDate,
    barcode: normalized.barcode,
    image_url: normalized.imageUrl,
    memo: normalized.memo,
  };
}

function makeLocalRecord(
  deviceId: string,
  payload: IngredientFormPayload,
  userId: string | null,
  id = uuidv4(),
): IngredientRecord {
  const normalized = normalizeFormPayload(payload);
  const now = new Date().toISOString();

  return {
    id,
    deviceId,
    userId,
    familyFridgeId: normalized.familyFridgeId ?? null,
    name: normalized.name,
    category: normalized.category ?? null,
    storageType: normalized.storageType ?? DEFAULT_STORAGE_TYPE,
    quantity: normalized.quantity ?? null,
    expiryDate: normalized.expiryDate ?? null,
    barcode: normalized.barcode ?? null,
    imageUrl: normalized.imageUrl ?? null,
    memo: normalized.memo ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function applyFormPayloadToRecord(target: IngredientRecord, payload: IngredientFormPayload): IngredientRecord {
  const normalized = normalizeFormPayload(payload);

  return {
    ...target,
    familyFridgeId: normalized.familyFridgeId ?? target.familyFridgeId ?? null,
    name: normalized.name,
    category: normalized.category ?? null,
    storageType: normalized.storageType ?? DEFAULT_STORAGE_TYPE,
    quantity: normalized.quantity ?? null,
    expiryDate: normalized.expiryDate ?? null,
    barcode: normalized.barcode ?? null,
    imageUrl: normalized.imageUrl ?? null,
    memo: normalized.memo ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function makeError(message: string, source: IngredientQueryError["source"]): IngredientQueryError {
  return { message, source };
}

function toRestorePayload(record: IngredientRecord, fallbackDeviceId: string): IngredientInsertPayload {
  return {
    id: record.id,
    device_id: record.deviceId || fallbackDeviceId,
    user_id: record.userId,
    family_fridge_id: toSupabaseFamilyFridgeId(record.familyFridgeId),
    name: record.name,
    category: record.category,
    storage_type: record.storageType,
    quantity: record.quantity,
    expiry_date: record.expiryDate,
    barcode: record.barcode,
    image_url: record.imageUrl,
    memo: record.memo,
  };
}

export interface UseIngredientsResult {
  ingredients: IngredientRecord[];
  loading: boolean;
  error: IngredientQueryError | null;
  syncStatus: "synced" | "local";
  syncNotice: string | null;
  listIngredients: () => Promise<IngredientRecord[]>;
  fetchIngredient: (ingredientId: string) => Promise<IngredientRecord | null>;
  addIngredient: (payload: IngredientFormPayload) => Promise<IngredientRecord>;
  updateIngredient: (ingredientId: string, payload: IngredientFormPayload) => Promise<IngredientRecord | null>;
  deleteIngredient: (ingredientId: string) => Promise<boolean>;
  consumeIngredients: (recipeIngredientTexts: string[]) => Promise<number>;
  restoreIngredientsSnapshot: (snapshot: IngredientRecord[]) => Promise<boolean>;
}

export function useIngredients(): UseIngredientsResult {
  const deviceId = useMemo(() => getDeviceId(), []);
  const familyFridgeId = useMemo(() => getActiveFamilyFridgeId(), []);
  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<IngredientQueryError | null>(null);
  const [syncStatus, setSyncStatus] = useState<"synced" | "local">("synced");
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const listIngredients = useCallback(async (): Promise<IngredientRecord[]> => {
    setLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient({ deviceId });
      const { data, error: queryError } = await client
        .from("ingredients")
        .select("*")
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      const mapped = (data ?? []).map((row) => rowToRecord(row as RawIngredientRow));
      setIngredients(mapped);
      safeWriteLocalIngredients(mapped);
      setSyncStatus("synced");
      setSyncNotice(null);
      return mapped;
    } catch (caught) {
      const fallback = safeReadLocalIngredients(deviceId, familyFridgeId);
      setIngredients(fallback);
      const message = caught instanceof Error ? caught.message : "재료 목록 조회 실패";
      setError(message.includes("환경변수") ? null : makeError(message, "supabase"));
      setSyncStatus("local");
      setSyncNotice(message.includes("환경변수") ? null : "클라우드 동기화가 지연되어 이 기기의 임시 데이터를 보여드립니다.");
      return fallback;
    } finally {
      setLoading(false);
    }
  }, [deviceId, familyFridgeId]);

  const fetchIngredient = useCallback(
    async (ingredientId: string): Promise<IngredientRecord | null> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const { data, error: queryError } = await client
          .from("ingredients")
          .select("*")
          .eq("id", ingredientId)
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        return data ? rowToRecord(data as RawIngredientRow) : null;
      } catch (caught) {
        const fallback = safeReadLocalIngredients(deviceId, familyFridgeId).find((item) => item.id === ingredientId) ?? null;
        setError(makeError(caught instanceof Error ? caught.message : "재료 단건 조회 실패", "supabase"));
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, familyFridgeId],
  );

  const addIngredient = useCallback(
    async (payload: IngredientFormPayload): Promise<IngredientRecord> => {
      setLoading(true);
      setError(null);
      let userId: string | null = null;
      let nextRecord: IngredientRecord | null = null;

      try {
        const client = getSupabaseClient({ deviceId });
        const { data: authData } = await client.auth.getUser();
        userId = authData.user?.id ?? null;

        nextRecord = makeLocalRecord(deviceId, { ...payload, familyFridgeId }, userId);
        const insertPayload = toInsertPayload(deviceId, { ...payload, familyFridgeId }, userId, nextRecord.id);
        const { error: queryError } = await client
          .from("ingredients")
          .insert(insertPayload);

        if (queryError) {
          throw queryError;
        }

        const savedRecord = nextRecord;
        setIngredients((prev) => [savedRecord, ...prev.filter((item) => item.id !== savedRecord.id)]);
        upsertLocalIngredient(savedRecord);
        setSyncStatus("synced");
        setSyncNotice(null);
        return savedRecord;
      } catch {
        const nextLocal = nextRecord ?? makeLocalRecord(deviceId, { ...payload, familyFridgeId }, userId);
        const nextItems = upsertLocalIngredient(nextLocal);
        setIngredients(nextItems);
        setSyncStatus("local");
        setSyncNotice("클라우드 저장이 지연되어 이 기기에 임시 저장했습니다.");
        return nextLocal;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, familyFridgeId],
  );

  const updateIngredient = useCallback(
    async (ingredientId: string, payload: IngredientFormPayload): Promise<IngredientRecord | null> => {
      setLoading(true);
      setError(null);
      const target =
        ingredients.find((item) => item.id === ingredientId) ??
        safeReadLocalIngredients(deviceId, familyFridgeId).find((item) => item.id === ingredientId) ??
        null;

      try {
        const client = getSupabaseClient({ deviceId });
        const updatePayload = toUpdatePayload({
          ...payload,
          familyFridgeId: payload.familyFridgeId ?? familyFridgeId,
        });

        const { error: queryError } = await client
          .from("ingredients")
          .update(updatePayload)
          .eq("id", ingredientId);

        if (queryError) {
          throw queryError;
        }

        if (!target) {
          return null;
        }

        const nextRecord = applyFormPayloadToRecord(target, {
          ...payload,
          familyFridgeId: payload.familyFridgeId ?? familyFridgeId,
        });
        setIngredients((prev) => prev.map((item) => (item.id === ingredientId ? nextRecord : item)));
        upsertLocalIngredient(nextRecord);
        setSyncStatus("synced");
        setSyncNotice(null);
        return nextRecord;
      } catch (caught) {
        if (!target) {
          setError(makeError(caught instanceof Error ? caught.message : "재료 수정 실패", "supabase"));
          return null;
        }

        const nextRecord = applyFormPayloadToRecord(target, payload);

        const nextItems = upsertLocalIngredient(nextRecord);
        setIngredients(nextItems);
        setSyncStatus("local");
        setSyncNotice("클라우드 수정이 지연되어 이 기기에 먼저 반영했습니다.");
        return nextRecord;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, familyFridgeId, ingredients],
  );

  const deleteIngredient = useCallback(
    async (ingredientId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const { error: queryError } = await client.from("ingredients").delete().eq("id", ingredientId);

        if (queryError) {
          throw queryError;
        }

        setIngredients((prev) => prev.filter((item) => item.id !== ingredientId));
        removeLocalIngredient(deviceId, familyFridgeId, ingredientId);
        setSyncStatus("synced");
        setSyncNotice(null);
        return true;
      } catch {
        const nextItems = removeLocalIngredient(deviceId, familyFridgeId, ingredientId);
        setIngredients(nextItems);
        setSyncStatus("local");
        setSyncNotice("클라우드 삭제가 지연되어 이 기기에서 먼저 제거했습니다.");
        return true;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, familyFridgeId],
  );

  const restoreIngredientsSnapshot = useCallback(
    async (snapshot: IngredientRecord[]): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const payloads = snapshot.map((record) => toRestorePayload(record, deviceId));

        if (payloads.length > 0) {
          const { error: restoreError } = await client.from("ingredients").upsert(payloads, { onConflict: "id" });
          if (restoreError) {
            throw restoreError;
          }
        }

        setIngredients(snapshot);
        safeWriteLocalIngredients(snapshot);
        setSyncStatus("synced");
        setSyncNotice(null);
        return true;
      } catch {
        setIngredients(snapshot);
        safeWriteLocalIngredients(snapshot);
        setSyncStatus("local");
        setSyncNotice("되돌리기를 이 기기에 먼저 반영했습니다. 클라우드 동기화는 나중에 다시 시도해 주세요.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [deviceId],
  );

  const consumeIngredients = useCallback(
    async (recipeIngredientTexts: string[]): Promise<number> => {
      let changedCount = 0;

      for (const recipeIngredientText of recipeIngredientTexts) {
        const normalizedRecipeText = recipeIngredientText.replace(/\s+/g, "").toLowerCase();
        const target = ingredients.find((ingredient) => {
          const normalizedName = ingredient.name.replace(/\s+/g, "").toLowerCase();
          return normalizedRecipeText.includes(normalizedName) || normalizedName.includes(normalizedRecipeText);
        });

        if (!target) {
          continue;
        }

        const nextQuantity = consumeQuantityText(target.quantity, recipeIngredientText);
        if (nextQuantity.depleted) {
          await deleteIngredient(target.id);
        } else {
          await updateIngredient(target.id, {
            name: target.name,
            category: target.category,
            storageType: target.storageType,
            quantity: nextQuantity.quantity,
            expiryDate: target.expiryDate,
            barcode: target.barcode,
            imageUrl: target.imageUrl,
            memo: target.memo,
            familyFridgeId: target.familyFridgeId ?? familyFridgeId,
          });
        }

        changedCount += 1;
      }

      return changedCount;
    },
    [deleteIngredient, familyFridgeId, ingredients, updateIngredient],
  );

  useEffect(() => {
    void listIngredients();
  }, [listIngredients]);

  return {
    ingredients,
    loading,
    error,
    syncStatus,
    syncNotice,
    listIngredients,
    fetchIngredient,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    consumeIngredients,
    restoreIngredientsSnapshot,
  };
}
