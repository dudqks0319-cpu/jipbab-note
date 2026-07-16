// 이 파일은 계정 삭제 완료 후 기기에 남은 사용자 생성 데이터만 선별해 제거합니다.
import { clearLocalStore } from "./local-db/index.ts";
import { LOCAL_DB_STORES, type LocalDbStoreName } from "./local-db/schema.ts";

const ACCOUNT_LOCAL_STORAGE_KEYS = [
  "jipbab-note-family-group",
  "jipbab-note-family-group-sync-state",
  "jipbab-note-ingredients",
  "jipbab-note-shopping-items",
  "jipbab-note-favorite-recipes",
  "jipbab-note-community-posts",
  "jipbab-note-community-comments",
  "jipbab-note-community-likes",
  "jipbab-note-imported-recipes",
  "jipbab-note-expiry-notification-jobs",
] as const;

const ACCOUNT_LOCAL_STORAGE_PREFIXES = [
  "jipbab:meal-plan:v1:",
  "jipbab:recipe-cook-progress:v1:",
] as const;

const ACCOUNT_LOCAL_DB_STORES: LocalDbStoreName[] = [
  LOCAL_DB_STORES.ingredients,
  LOCAL_DB_STORES.shoppingItems,
  LOCAL_DB_STORES.favoriteRecipes,
  LOCAL_DB_STORES.fridgeEvents,
  LOCAL_DB_STORES.pendingSyncQueue,
];

type StorageSubset = Pick<Storage, "length" | "key" | "removeItem">;

export async function clearAccountLinkedLocalData(options: {
  storage?: StorageSubset | null;
  clearStore?: (store: LocalDbStoreName) => Promise<void>;
} = {}): Promise<{ removedStorageKeys: number; clearedStores: number }> {
  const storage = options.storage === undefined
    ? (typeof window === "undefined" ? null : window.localStorage)
    : options.storage;
  const clearStore = options.clearStore ?? clearLocalStore;
  let removedStorageKeys = 0;

  if (storage) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key));
    for (const key of keys) {
      if (
        ACCOUNT_LOCAL_STORAGE_KEYS.includes(key as (typeof ACCOUNT_LOCAL_STORAGE_KEYS)[number])
        || ACCOUNT_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        storage.removeItem(key);
        removedStorageKeys += 1;
      }
    }
  }

  await Promise.all(ACCOUNT_LOCAL_DB_STORES.map((store) => clearStore(store)));
  return { removedStorageKeys, clearedStores: ACCOUNT_LOCAL_DB_STORES.length };
}
