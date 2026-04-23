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
    quantity: payload.quantity?.trim() || null,
    expiryDate: toDateOnlyString(payload.expiryDate) ?? null,
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
): IngredientInsertPayload {
  const normalized = normalizeFormPayload(payload);

  return {
    device_id: deviceId,
    user_id: userId,
    family_fridge_id: normalized.familyFridgeId ?? null,
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
    family_fridge_id: normalized.familyFridgeId ?? null,
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
): IngredientRecord {
  const normalized = normalizeFormPayload(payload);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
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

function makeError(message: string, source: IngredientQueryError["source"]): IngredientQueryError {
  return { message, source };
}

export interface UseIngredientsResult {
  ingredients: IngredientRecord[];
  loading: boolean;
  error: IngredientQueryError | null;
  listIngredients: () => Promise<IngredientRecord[]>;
  fetchIngredient: (ingredientId: string) => Promise<IngredientRecord | null>;
  addIngredient: (payload: IngredientFormPayload) => Promise<IngredientRecord>;
  updateIngredient: (ingredientId: string, payload: IngredientFormPayload) => Promise<IngredientRecord | null>;
  deleteIngredient: (ingredientId: string) => Promise<boolean>;
  consumeIngredients: (recipeIngredientTexts: string[]) => Promise<number>;
}

export function useIngredients(): UseIngredientsResult {
  const deviceId = useMemo(() => getDeviceId(), []);
  const familyFridgeId = useMemo(() => getActiveFamilyFridgeId(), []);
  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<IngredientQueryError | null>(null);

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
      return mapped;
    } catch (caught) {
      const fallback = safeReadLocalIngredients(deviceId, familyFridgeId);
      setIngredients(fallback);
      const message = caught instanceof Error ? caught.message : "재료 목록 조회 실패";
      setError(message.includes("환경변수") ? null : makeError(message, "supabase"));
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

      try {
        const client = getSupabaseClient({ deviceId });
        const { data: authData } = await client.auth.getUser();
        userId = authData.user?.id ?? null;

        const insertPayload = toInsertPayload(deviceId, { ...payload, familyFridgeId }, userId);
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
        upsertLocalIngredient(nextRecord);
        return nextRecord;
      } catch {
        const nextLocal = makeLocalRecord(deviceId, { ...payload, familyFridgeId }, userId);
        const nextItems = upsertLocalIngredient(nextLocal);
        setIngredients(nextItems);
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

      try {
        const client = getSupabaseClient({ deviceId });
        const updatePayload = toUpdatePayload({
          ...payload,
          familyFridgeId: payload.familyFridgeId ?? familyFridgeId,
        });

        const { data, error: queryError } = await client
          .from("ingredients")
          .update(updatePayload)
          .eq("id", ingredientId)
          .select("*")
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        if (!data) {
          return null;
        }

        const nextRecord = rowToRecord(data as RawIngredientRow);
        setIngredients((prev) => prev.map((item) => (item.id === ingredientId ? nextRecord : item)));
        upsertLocalIngredient(nextRecord);
        return nextRecord;
      } catch (caught) {
        const current = safeReadLocalIngredients(deviceId, familyFridgeId);
        const target = current.find((item) => item.id === ingredientId);
        if (!target) {
          setError(makeError(caught instanceof Error ? caught.message : "재료 수정 실패", "supabase"));
          return null;
        }

        const normalized = normalizeFormPayload(payload);
        const nextRecord: IngredientRecord = {
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

        const nextItems = upsertLocalIngredient(nextRecord);
        setIngredients(nextItems);
        return nextRecord;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, familyFridgeId],
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
        return true;
      } catch {
        const nextItems = removeLocalIngredient(deviceId, familyFridgeId, ingredientId);
        setIngredients(nextItems);
        return true;
      } finally {
        setLoading(false);
      }
    },
    [deviceId, familyFridgeId],
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
    listIngredients,
    fetchIngredient,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    consumeIngredients,
  };
}
