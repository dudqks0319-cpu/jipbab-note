// 이 파일은 장보기 목록 CRUD를 Supabase 우선 + localStorage 폴백으로 제공합니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import { canonicalizeIngredientName } from "@/lib/ingredient-aliases";
import { mergeShoppingItems } from "@/lib/shopping-sync";
import { getSupabaseClient } from "@/lib/supabase";
import type { IngredientCategory, ShoppingItem, ShoppingItemDraft } from "@/types";

const STORAGE_KEY = "jipbab-note-shopping-items";

type ShoppingQuerySource = "supabase" | "local";

type ShoppingQueryError = {
  message: string;
  source: ShoppingQuerySource;
};

type RawShoppingRow = {
  id: string;
  device_id: string;
  user_id: string | null;
  name: string;
  quantity: string | null;
  category: IngredientCategory | null;
  checked: boolean;
  source_recipe_id: string | null;
  source_recipe_name: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeDraft(draft: ShoppingItemDraft): ShoppingItemDraft {
  return {
    name: draft.name.trim(),
    quantity: draft.quantity?.trim() || null,
    category: draft.category ?? null,
    sourceRecipeId: draft.sourceRecipeId?.trim() || null,
    sourceRecipeName: draft.sourceRecipeName?.trim() || null,
  };
}

function normalizeShoppingNameKey(name: string): string {
  return canonicalizeIngredientName(name).replace(/\s+/g, "");
}

function rowToItem(row: RawShoppingRow): ShoppingItem {
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    name: row.name,
    quantity: row.quantity,
    category: row.category,
    checked: row.checked,
    sourceRecipeId: row.source_recipe_id,
    sourceRecipeName: row.source_recipe_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeReadLocalItems(deviceId: string): ShoppingItem[] {
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
      .filter((item): item is ShoppingItem => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const record = item as Record<string, unknown>;
        return (
          typeof record.id === "string" &&
          typeof record.name === "string" &&
          typeof record.checked === "boolean" &&
          typeof record.createdAt === "string"
        );
      })
      .filter((item) => !item.deviceId || item.deviceId === deviceId);
  } catch {
    return [];
  }
}

function safeWriteLocalItems(nextItems: ShoppingItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

function upsertLocalItems(nextItems: ShoppingItem[], deviceId: string): ShoppingItem[] {
  const current = safeReadLocalItems(deviceId);
  const nextMap = new Map(current.map((item) => [item.id, item]));
  nextItems.forEach((item) => {
    nextMap.set(item.id, item);
  });
  const merged = Array.from(nextMap.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  safeWriteLocalItems(merged);
  return merged;
}

function replaceLocalItems(nextItems: ShoppingItem[]): ShoppingItem[] {
  safeWriteLocalItems(nextItems);
  return nextItems;
}

function removeLocalItem(deviceId: string, itemId: string): ShoppingItem[] {
  const nextItems = safeReadLocalItems(deviceId).filter((item) => item.id !== itemId);
  safeWriteLocalItems(nextItems);
  return nextItems;
}

function removeLocalCheckedItems(deviceId: string): ShoppingItem[] {
  const nextItems = safeReadLocalItems(deviceId).filter((item) => !item.checked);
  safeWriteLocalItems(nextItems);
  return nextItems;
}

function makeLocalItem(
  deviceId: string,
  userId: string | null,
  draft: ShoppingItemDraft,
): ShoppingItem {
  const normalized = normalizeDraft(draft);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    deviceId,
    userId,
    name: normalized.name,
    quantity: normalized.quantity ?? null,
    category: normalized.category ?? null,
    checked: false,
    sourceRecipeId: normalized.sourceRecipeId ?? null,
    sourceRecipeName: normalized.sourceRecipeName ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function toInsertPayload(deviceId: string, userId: string | null, draft: ShoppingItemDraft) {
  const normalized = normalizeDraft(draft);

  return {
    device_id: deviceId,
    user_id: userId,
    name: normalized.name,
    quantity: normalized.quantity,
    category: normalized.category,
    checked: false,
    source_recipe_id: normalized.sourceRecipeId,
    source_recipe_name: normalized.sourceRecipeName,
  };
}

function makeError(message: string, source: ShoppingQuerySource): ShoppingQueryError {
  return { message, source };
}

export interface UseShoppingResult {
  items: ShoppingItem[];
  uncheckedCount: number;
  checkedCount: number;
  loading: boolean;
  error: ShoppingQueryError | null;
  source: ShoppingQuerySource;
  addItem: (draft: ShoppingItemDraft) => Promise<void>;
  addItems: (drafts: ShoppingItemDraft[]) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
  listItems: () => Promise<ShoppingItem[]>;
}

export function useShopping(): UseShoppingResult {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ShoppingQueryError | null>(null);
  const [source, setSource] = useState<ShoppingQuerySource>("local");

  const listItems = useCallback(async (): Promise<ShoppingItem[]> => {
    setLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient({ deviceId });
      const { data, error: queryError } = await client
        .from("shopping_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      const localFallback = safeReadLocalItems(deviceId);
      const mapped = (data ?? []).map((row) => rowToItem(row as RawShoppingRow));
      const merged = mergeShoppingItems(localFallback, mapped);
      setItems(merged);
      setSource("supabase");
      replaceLocalItems(merged);
      return merged;
    } catch (caught) {
      const fallback = safeReadLocalItems(deviceId);
      setItems(fallback);
      setSource("local");
      if (fallback.length > 0) {
        console.warn("장보기 목록 로컬 표시로 전환", caught);
        setError(null);
      } else {
        setError(makeError(caught instanceof Error ? caught.message : "장보기 목록 조회 실패", "supabase"));
      }
      return fallback;
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const addItems = useCallback(
    async (drafts: ShoppingItemDraft[]): Promise<void> => {
      const cleanedDrafts = drafts
        .map(normalizeDraft)
        .filter((draft) => draft.name.length > 0);
      if (cleanedDrafts.length === 0) {
        return;
      }

      setLoading(true);
      setError(null);
      let userId: string | null = null;

      try {
        const client = getSupabaseClient({ deviceId });
        const { data: authData } = await client.auth.getUser();
        userId = authData.user?.id ?? null;

        const existingNames = new Set(items.map((item) => normalizeShoppingNameKey(item.name)));
        const insertDrafts = cleanedDrafts.filter((draft) => !existingNames.has(normalizeShoppingNameKey(draft.name)));
        if (insertDrafts.length === 0) {
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await client
          .from("shopping_items")
          .insert(insertDrafts.map((draft) => toInsertPayload(deviceId, userId, draft)))
          .select("*");

        if (queryError) {
          throw queryError;
        }

        const inserted = (data ?? []).map((row) => rowToItem(row as RawShoppingRow));
        setItems((prev) => {
          const nextItems = [...prev, ...inserted].sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          );
          replaceLocalItems(nextItems);
          return nextItems;
        });
        setSource("supabase");
      } catch (caught) {
        const nextLocalItems = cleanedDrafts.map((draft) => makeLocalItem(deviceId, userId, draft));
        setItems((prev) => {
          const nextItems = upsertLocalItems(
            nextLocalItems.filter(
              (draft) => !prev.some(
                (item) => normalizeShoppingNameKey(item.name) === normalizeShoppingNameKey(draft.name),
              ),
            ),
            deviceId,
          );
          return nextItems;
        });
        setSource("local");
        console.warn("장보기 항목 로컬 저장으로 전환", caught);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    [deviceId, items],
  );

  const addItem = useCallback(
    async (draft: ShoppingItemDraft) => {
      await addItems([draft]);
    },
    [addItems],
  );

  const toggleItem = useCallback(
    async (itemId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const target = items.find((item) => item.id === itemId);
        if (!target) {
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await client
          .from("shopping_items")
          .update({ checked: !target.checked })
          .eq("id", itemId)
          .select("*")
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        if (!data) {
          setLoading(false);
          return;
        }

        const nextItem = rowToItem(data as RawShoppingRow);
        setItems((prev) => {
          const nextItems = prev.map((item) => (item.id === itemId ? nextItem : item));
          replaceLocalItems(nextItems);
          return nextItems;
        });
        setSource("supabase");
      } catch (caught) {
        setItems((prev) => {
          const nextItems = prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  checked: !item.checked,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          );
          replaceLocalItems(nextItems);
          return nextItems;
        });
        setSource("local");
        console.warn("장보기 항목 업데이트 로컬 저장으로 전환", caught);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    [deviceId, items],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const { error: queryError } = await client.from("shopping_items").delete().eq("id", itemId);
        if (queryError) {
          throw queryError;
        }

        setItems((prev) => {
          const nextItems = prev.filter((item) => item.id !== itemId);
          replaceLocalItems(nextItems);
          return nextItems;
        });
        setSource("supabase");
      } catch (caught) {
        const nextItems = removeLocalItem(deviceId, itemId);
        setItems(nextItems);
        setSource("local");
        console.warn("장보기 항목 삭제 로컬 저장으로 전환", caught);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    [deviceId],
  );

  const clearCheckedItems = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient({ deviceId });
      const checkedIds = items.filter((item) => item.checked).map((item) => item.id);
      if (checkedIds.length === 0) {
        setLoading(false);
        return;
      }

      const { error: queryError } = await client.from("shopping_items").delete().in("id", checkedIds);
      if (queryError) {
        throw queryError;
      }

      setItems((prev) => {
        const nextItems = prev.filter((item) => !item.checked);
        replaceLocalItems(nextItems);
        return nextItems;
      });
      setSource("supabase");
    } catch (caught) {
      const nextItems = removeLocalCheckedItems(deviceId);
      setItems(nextItems);
      setSource("local");
      console.warn("완료 항목 정리 로컬 저장으로 전환", caught);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [deviceId, items]);

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
