// 이 파일은 장보기 목록 CRUD를 Supabase 우선 + localStorage 폴백으로 제공합니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import { mergeShoppingItems } from "@/lib/shopping-sync";
import { getSupabaseClient } from "@/lib/supabase";
import type { IngredientCategory, ShoppingItem, ShoppingItemDraft } from "@/types";

const STORAGE_KEY = "jipbab-note-shopping-items";
const SHOPPING_SYNC_UNAVAILABLE_MESSAGE = "장보기 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";

type ShoppingQuerySource = "supabase" | "local";
type ShoppingScope = "personal" | "family";

type ShoppingScopeOptions = {
  scope?: ShoppingScope;
  familyGroupId?: string | null;
};

type ShoppingScopeContext = {
  scope: ShoppingScope;
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

function normalizeDraft(draft: ShoppingItemDraft): ShoppingItemDraft {
  return {
    name: draft.name.trim(),
    quantity: draft.quantity?.trim() || null,
    category: draft.category ?? null,
    sourceRecipeId: draft.sourceRecipeId?.trim() || null,
    sourceRecipeName: draft.sourceRecipeName?.trim() || null,
  };
}

function rowToItem(row: RawShoppingRow): ShoppingItem {
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
  };
}

function buildScopeContext(options?: ShoppingScopeOptions): ShoppingScopeContext {
  const familyGroupId = options?.familyGroupId?.trim() || null;
  return {
    scope: options?.scope === "family" && familyGroupId ? "family" : "personal",
    familyGroupId,
  };
}

function belongsToScope(item: ShoppingItem, deviceId: string, scopeContext: ShoppingScopeContext): boolean {
  if (scopeContext.scope === "family") {
    return item.familyGroupId === scopeContext.familyGroupId;
  }

  return item.deviceId === deviceId && !item.familyGroupId;
}

function safeReadAllLocalItems(): ShoppingItem[] {
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
      });
  } catch {
    return [];
  }
}

function safeReadLocalItems(deviceId: string, scopeContext: ShoppingScopeContext): ShoppingItem[] {
  return safeReadAllLocalItems().filter((item) => belongsToScope(item, deviceId, scopeContext));
}

function safeWriteLocalItems(nextItems: ShoppingItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

function replaceScopedLocalItems(
  deviceId: string,
  scopeContext: ShoppingScopeContext,
  nextScopedItems: ShoppingItem[],
): ShoppingItem[] {
  const nextItems = [
    ...nextScopedItems,
    ...safeReadAllLocalItems().filter((item) => !belongsToScope(item, deviceId, scopeContext)),
  ];
  safeWriteLocalItems(nextItems);
  return nextScopedItems;
}

function removeLocalItem(deviceId: string, scopeContext: ShoppingScopeContext, itemId: string): ShoppingItem[] {
  const nextItems = safeReadAllLocalItems().filter((item) => item.id !== itemId);
  safeWriteLocalItems(nextItems);
  return nextItems.filter((item) => belongsToScope(item, deviceId, scopeContext));
}

function removeLocalCheckedItems(deviceId: string, scopeContext: ShoppingScopeContext): ShoppingItem[] {
  const nextItems = safeReadAllLocalItems().filter(
    (item) => !belongsToScope(item, deviceId, scopeContext) || !item.checked,
  );
  safeWriteLocalItems(nextItems);
  return nextItems.filter((item) => belongsToScope(item, deviceId, scopeContext));
}

function makeLocalItem(
  deviceId: string,
  userId: string | null,
  draft: ShoppingItemDraft,
  familyGroupId: string | null,
): ShoppingItem {
  const normalized = normalizeDraft(draft);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    deviceId,
    userId,
    familyGroupId,
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

function toInsertPayload(
  deviceId: string,
  userId: string | null,
  draft: ShoppingItemDraft,
  familyGroupId: string | null,
) {
  const normalized = normalizeDraft(draft);

  return {
    device_id: deviceId,
    user_id: userId,
    ...(familyGroupId ? { family_group_id: familyGroupId } : {}),
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

function hasMissingFamilyScopeColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("family_group_id") && /column|schema cache|does not exist/i.test(message);
}

function applyShoppingScope(
  query: ScopedSupabaseQuery,
  scopeContext: ShoppingScopeContext,
): ScopedSupabaseQuery {
  return scopeContext.scope === "family" && scopeContext.familyGroupId
    ? query.eq("family_group_id", scopeContext.familyGroupId)
    : query.is("family_group_id", null);
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

function mergeItemWithDraft(item: ShoppingItem, draft: ShoppingItemDraft): ShoppingItem {
  const normalized = normalizeDraft(draft);
  return {
    ...item,
    quantity: mergeQuantityDisplay(item.quantity, normalized.quantity ?? null),
    category: item.category ?? normalized.category ?? null,
    sourceRecipeId: mergeSourceDisplay(item.sourceRecipeId, normalized.sourceRecipeId ?? null),
    sourceRecipeName: mergeSourceDisplay(item.sourceRecipeName, normalized.sourceRecipeName ?? null),
    updatedAt: new Date().toISOString(),
  };
}

function toUpdatePayload(item: ShoppingItem) {
  return {
    quantity: item.quantity,
    category: item.category,
    source_recipe_id: item.sourceRecipeId,
    source_recipe_name: item.sourceRecipeName,
  };
}

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

  const listItems = useCallback(async (): Promise<ShoppingItem[]> => {
    setLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient({ deviceId });
      const scopedQuery = applyShoppingScope(
        client
          .from("shopping_items")
          .select("*")
          .order("created_at", { ascending: false }) as unknown as ScopedSupabaseQuery,
        scopeContext,
      );
      const { data, error: queryError } = await scopedQuery;

      if (queryError) {
        throw queryError;
      }

      const localFallback = safeReadLocalItems(deviceId, scopeContext);
      const mapped = (Array.isArray(data) ? data : []).map((row: unknown) => rowToItem(row as RawShoppingRow));
      const merged = mergeShoppingItems(localFallback, mapped);
      setItems(merged);
      setSource("supabase");
      replaceScopedLocalItems(deviceId, scopeContext, merged);
      return merged;
    } catch (caught) {
      if (scopeContext.scope === "personal" && hasMissingFamilyScopeColumnError(caught)) {
        try {
          const client = getSupabaseClient({ deviceId });
          const { data, error: legacyQueryError } = await client
            .from("shopping_items")
            .select("*")
            .order("created_at", { ascending: false });
          if (legacyQueryError) {
            throw legacyQueryError;
          }

          const localFallback = safeReadLocalItems(deviceId, scopeContext);
          const mapped = (data ?? []).map((row) => rowToItem(row as RawShoppingRow));
          const merged = mergeShoppingItems(localFallback, mapped.filter((item) => !item.familyGroupId));
          setItems(merged);
          setSource("supabase");
          replaceScopedLocalItems(deviceId, scopeContext, merged);
          return merged;
        } catch (legacyCaught) {
          console.warn("장보기 목록 legacy 동기화도 실패", legacyCaught);
        }
      }

      const fallback = safeReadLocalItems(deviceId, scopeContext);
      setItems(fallback);
      setSource("local");
      if (fallback.length > 0) {
        console.warn("장보기 목록 로컬 표시로 전환", caught);
        setError(null);
      } else {
        setError(makeError(SHOPPING_SYNC_UNAVAILABLE_MESSAGE, "supabase"));
      }
      return fallback;
    } finally {
      setLoading(false);
    }
  }, [deviceId, scopeContext]);

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
      let userId: string | null = null;
      const existingByName = new Map(items.map((item) => [normalizeShoppingName(item.name), item]));
      const mergePairs = cleanedDrafts
        .map((draft) => ({ draft, existing: existingByName.get(normalizeShoppingName(draft.name)) }))
        .filter((pair): pair is { draft: ShoppingItemDraft; existing: ShoppingItem } => Boolean(pair.existing));
      const skippedDuplicates = options.mergeDuplicates
        ? []
        : mergePairs.map((pair) => pair.draft.name);
      const mergeTargets = options.mergeDuplicates ? mergePairs : [];
      const insertDrafts = cleanedDrafts.filter((draft) => !existingByName.has(normalizeShoppingName(draft.name)));

      if (insertDrafts.length === 0 && mergeTargets.length === 0) {
        setLoading(false);
        return { addedCount: 0, mergedCount: 0, skippedDuplicates, source };
      }

      try {
        const client = getSupabaseClient({ deviceId });
        const { data: authData } = await client.auth.getUser();
        userId = authData.user?.id ?? null;

        const mergedRows: ShoppingItem[] = [];
        for (const { existing, draft } of mergeTargets) {
          const mergedItem = mergeItemWithDraft(existing, draft);
          const updateQuery = client
            .from("shopping_items")
            .update(toUpdatePayload(mergedItem))
            .eq("id", existing.id)
            .select("*") as unknown as ScopedSupabaseQuery;
          const scopedUpdateQuery = applyShoppingScope(updateQuery, scopeContext);
          const { data, error: updateError } = await scopedUpdateQuery.maybeSingle();
          if (updateError) throw updateError;
          if (data) {
            mergedRows.push(rowToItem(data as RawShoppingRow));
          }
        }

        let inserted: ShoppingItem[] = [];
        if (insertDrafts.length > 0) {
          const { data, error: queryError } = await client
            .from("shopping_items")
            .insert(insertDrafts.map((draft) => toInsertPayload(
              deviceId,
              userId,
              draft,
              scopeContext.scope === "family" ? scopeContext.familyGroupId : null,
            )))
            .select("*");

          if (queryError) {
            throw queryError;
          }
          inserted = (data ?? []).map((row) => rowToItem(row as RawShoppingRow));
        }

        setItems((prev) => {
          const mergedById = new Map([...mergedRows, ...inserted].map((item) => [item.id, item]));
          const nextItems = [
            ...prev.map((item) => mergedById.get(item.id) ?? item),
            ...inserted.filter((item) => !prev.some((prevItem) => prevItem.id === item.id)),
          ].sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          );
          replaceScopedLocalItems(deviceId, scopeContext, nextItems);
          return nextItems;
        });
        setSource("supabase");
        return {
          addedCount: inserted.length,
          mergedCount: mergedRows.length,
          skippedDuplicates,
          source: "supabase",
        };
      } catch (caught) {
        let addedCount = 0;
        let mergedCount = 0;
        const nextItems = [...items];
        for (const draft of cleanedDrafts) {
          const existingIndex = nextItems.findIndex((item) => normalizeShoppingName(item.name) === normalizeShoppingName(draft.name));
          if (existingIndex >= 0) {
            if (options.mergeDuplicates) {
              nextItems[existingIndex] = mergeItemWithDraft(nextItems[existingIndex], draft);
              mergedCount += 1;
            }
            continue;
          }

          nextItems.unshift(makeLocalItem(
            deviceId,
            userId,
            draft,
            scopeContext.scope === "family" ? scopeContext.familyGroupId : null,
          ));
          addedCount += 1;
        }
        nextItems.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        replaceScopedLocalItems(deviceId, scopeContext, nextItems);
        setItems(nextItems);
        setSource("local");
        console.warn("장보기 항목 로컬 저장으로 전환", caught);
        setError(null);
        return { addedCount, mergedCount, skippedDuplicates, source: "local" };
      } finally {
        setLoading(false);
      }
    },
    [deviceId, items, scopeContext, source],
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

      try {
        const client = getSupabaseClient({ deviceId });
        const target = items.find((item) => item.id === itemId);
        if (!target) {
          setLoading(false);
          return;
        }

        const updateQuery = client
          .from("shopping_items")
          .update({ checked: !target.checked })
          .eq("id", itemId)
          .select("*") as unknown as ScopedSupabaseQuery;
        const scopedQuery = applyShoppingScope(updateQuery, scopeContext);
        const { data, error: queryError } = await scopedQuery.maybeSingle();
        if (queryError) throw queryError;

        if (!data) {
          setLoading(false);
          return;
        }

        const nextItem = rowToItem(data as RawShoppingRow);
        setItems((prev) => {
          const nextItems = prev.map((item) => (item.id === itemId ? nextItem : item));
          replaceScopedLocalItems(deviceId, scopeContext, nextItems);
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
          replaceScopedLocalItems(deviceId, scopeContext, nextItems);
          return nextItems;
        });
        setSource("local");
        console.warn("장보기 항목 업데이트 로컬 저장으로 전환", caught);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    [deviceId, items, scopeContext],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const client = getSupabaseClient({ deviceId });
        const scopedQuery = applyShoppingScope(
          client.from("shopping_items").delete().eq("id", itemId) as unknown as ScopedSupabaseQuery,
          scopeContext,
        );
        const { error: queryError } = await scopedQuery;
        if (queryError) {
          throw queryError;
        }

        setItems((prev) => {
          const nextItems = prev.filter((item) => item.id !== itemId);
          replaceScopedLocalItems(deviceId, scopeContext, nextItems);
          return nextItems;
        });
        setSource("supabase");
      } catch (caught) {
        const nextItems = removeLocalItem(deviceId, scopeContext, itemId);
        setItems(nextItems);
        setSource("local");
        console.warn("장보기 항목 삭제 로컬 저장으로 전환", caught);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    [deviceId, scopeContext],
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

      const scopedQuery = applyShoppingScope(
        client.from("shopping_items").delete().in("id", checkedIds) as unknown as ScopedSupabaseQuery,
        scopeContext,
      );
      const { error: queryError } = await scopedQuery;
      if (queryError) {
        throw queryError;
      }

      setItems((prev) => {
        const nextItems = prev.filter((item) => !item.checked);
        replaceScopedLocalItems(deviceId, scopeContext, nextItems);
        return nextItems;
      });
      setSource("supabase");
    } catch (caught) {
      const nextItems = removeLocalCheckedItems(deviceId, scopeContext);
      setItems(nextItems);
      setSource("local");
      console.warn("완료 항목 정리 로컬 저장으로 전환", caught);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [deviceId, items, scopeContext]);

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
