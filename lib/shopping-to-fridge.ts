// 이 파일은 장보기 완료 항목을 냉장고 재료 입력값으로 변환합니다.
import type {
  IngredientFormPayload,
  IngredientRecord,
  IngredientStorageType,
  ShoppingItem,
} from "../types/index.ts";

export function normalizeShoppingIngredientName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

export function getStorageTypeForShoppingCategory(
  itemCategory: ShoppingItem["category"],
): IngredientStorageType {
  if (itemCategory === "냉동식품") {
    return "냉동";
  }

  if (
    itemCategory === "조미료" ||
    itemCategory === "곡물/면/빵" ||
    itemCategory === "통조림/가공식품"
  ) {
    return "실온";
  }

  return "냉장";
}

function todayDateOnly(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function mergeQuantityDisplay(currentQuantity: string | null, nextQuantity: string | null): string | null {
  if (!nextQuantity) {
    return currentQuantity;
  }
  if (!currentQuantity) {
    return nextQuantity;
  }
  if (currentQuantity.includes(nextQuantity)) {
    return currentQuantity;
  }
  return `${currentQuantity} + ${nextQuantity}`;
}

function mergeMemoDisplay(currentMemo: string | null, nextMemo: string | null): string | null {
  const parts = [currentMemo, nextMemo].filter((item): item is string => Boolean(item?.trim()));
  return Array.from(new Set(parts)).join(" · ") || null;
}

function buildShoppingMemo(item: ShoppingItem, action: "added" | "merged"): string {
  const suffix = action === "added" ? "장보기에서 냉장고 반영" : "장보기에서 구매 후 합침";
  return item.sourceRecipeName ? `${item.sourceRecipeName} ${suffix}` : suffix;
}

export function buildIngredientPayloadFromShoppingItem(
  item: ShoppingItem,
  options: { now?: Date } = {},
): IngredientFormPayload {
  return {
    name: item.name,
    category: item.category,
    storageType: getStorageTypeForShoppingCategory(item.category),
    quantity: item.quantity,
    expiryDate: null,
    purchaseDate: todayDateOnly(options.now),
    memo: buildShoppingMemo(item, "added"),
  };
}

export function buildMergedIngredientPayloadFromShoppingItem(
  existing: IngredientRecord,
  item: ShoppingItem,
  options: { now?: Date } = {},
): IngredientFormPayload {
  return {
    name: existing.name,
    category: existing.category ?? item.category,
    storageType: existing.storageType,
    quantity: mergeQuantityDisplay(existing.quantity, item.quantity),
    expiryDate: existing.expiryDate,
    purchaseDate: existing.purchaseDate ?? todayDateOnly(options.now),
    openedAt: existing.openedAt,
    storageLocation: existing.storageLocation,
    unitPrice: existing.unitPrice,
    purchasePlace: existing.purchasePlace,
    consumedAt: null,
    discardedAt: null,
    repeatPurchase: existing.repeatPurchase,
    barcode: existing.barcode,
    imageUrl: existing.imageUrl,
    memo: mergeMemoDisplay(existing.memo, buildShoppingMemo(item, "merged")),
  };
}
