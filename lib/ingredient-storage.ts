import type { IngredientRecord, IngredientStorageType } from "../types/index.ts";

const COLD_RICE_NAMES = new Set([
  "밥",
  "공기밥",
  "흰밥",
  "쌀밥",
  "찬밥",
  "rice",
  "cookedrice",
]);

function normalizeStorageLookupKey(value: string): string {
  return value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "");
}

export function normalizeIngredientStorageType(
  name: string,
  storageType: IngredientStorageType,
): IngredientStorageType {
  if (storageType === "냉동" && COLD_RICE_NAMES.has(normalizeStorageLookupKey(name))) {
    return "냉장";
  }

  return storageType;
}

export function withNormalizedIngredientStorage<T extends Pick<IngredientRecord, "name" | "storageType">>(
  ingredient: T,
): T {
  const normalizedStorageType = normalizeIngredientStorageType(ingredient.name, ingredient.storageType);
  if (normalizedStorageType === ingredient.storageType) {
    return ingredient;
  }

  return {
    ...ingredient,
    storageType: normalizedStorageType,
  };
}
