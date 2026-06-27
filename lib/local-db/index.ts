import {
  LOCAL_DB_NAME,
  LOCAL_DB_STORES,
  LOCAL_DB_VERSION,
  type LocalDbStoreName,
} from "./schema.ts";

type StoreListener = () => void;
type StoreMap = Map<string, unknown>;

const listeners = new Map<LocalDbStoreName, Set<StoreListener>>();
const memoryStores = new Map<LocalDbStoreName, StoreMap>();

let dbPromise: Promise<IDBDatabase> | null = null;

function getIndexedDbFactory(): IDBFactory | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.indexedDB ?? null;
}

function getMemoryStore(storeName: LocalDbStoreName): StoreMap {
  const existing = memoryStores.get(storeName);
  if (existing) {
    return existing;
  }

  const next = new Map<string, unknown>();
  memoryStores.set(storeName, next);
  return next;
}

function requestError(message: string, error: DOMException | null): Error {
  return new Error(error?.message ? `${message}: ${error.message}` : message);
}

function ensureObjectStore(
  db: IDBDatabase,
  storeName: LocalDbStoreName,
  indexes: Array<{ name: string; keyPath: string }>,
): void {
  if (db.objectStoreNames.contains(storeName)) {
    return;
  }

  const store = db.createObjectStore(storeName, { keyPath: "id" });
  for (const index of indexes) {
    store.createIndex(index.name, index.keyPath, { unique: false });
  }
}

function configureStores(db: IDBDatabase): void {
  ensureObjectStore(db, LOCAL_DB_STORES.ingredients, [
    { name: "deviceId", keyPath: "deviceId" },
    { name: "userId", keyPath: "userId" },
    { name: "familyGroupId", keyPath: "familyGroupId" },
    { name: "syncStatus", keyPath: "syncStatus" },
    { name: "updatedAt", keyPath: "updatedAt" },
    { name: "deletedAt", keyPath: "deletedAt" },
  ]);
  ensureObjectStore(db, LOCAL_DB_STORES.shoppingItems, [
    { name: "deviceId", keyPath: "deviceId" },
    { name: "userId", keyPath: "userId" },
    { name: "familyGroupId", keyPath: "familyGroupId" },
    { name: "syncStatus", keyPath: "syncStatus" },
    { name: "updatedAt", keyPath: "updatedAt" },
    { name: "deletedAt", keyPath: "deletedAt" },
  ]);
  ensureObjectStore(db, LOCAL_DB_STORES.favoriteRecipes, [
    { name: "deviceId", keyPath: "deviceId" },
    { name: "userId", keyPath: "userId" },
    { name: "syncStatus", keyPath: "syncStatus" },
    { name: "savedAt", keyPath: "savedAt" },
  ]);
  ensureObjectStore(db, LOCAL_DB_STORES.recipeCache, [
    { name: "category", keyPath: "category" },
    { name: "cachedAt", keyPath: "cachedAt" },
    { name: "expiresAt", keyPath: "expiresAt" },
  ]);
  ensureObjectStore(db, LOCAL_DB_STORES.fridgeEvents, [
    { name: "deviceId", keyPath: "deviceId" },
    { name: "ingredientId", keyPath: "ingredientId" },
    { name: "createdAt", keyPath: "createdAt" },
  ]);
  ensureObjectStore(db, LOCAL_DB_STORES.pendingSyncQueue, [
    { name: "tableName", keyPath: "tableName" },
    { name: "recordId", keyPath: "recordId" },
    { name: "createdAt", keyPath: "createdAt" },
  ]);
}

export function isLocalDbSupported(): boolean {
  return Boolean(getIndexedDbFactory());
}

export function openLocalDb(): Promise<IDBDatabase> {
  const indexedDb = getIndexedDbFactory();
  if (!indexedDb) {
    return Promise.reject(new Error("IndexedDB를 사용할 수 없습니다."));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);

    request.onupgradeneeded = () => {
      configureStores(request.result);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(requestError("IndexedDB 열기에 실패했습니다", request.error));
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("IndexedDB 마이그레이션이 다른 탭에 의해 차단되었습니다."));
    };
  });

  return dbPromise;
}

function notifyStore(storeName: LocalDbStoreName): void {
  const callbacks = listeners.get(storeName);
  if (!callbacks || callbacks.size === 0) {
    return;
  }

  const run = () => {
    for (const callback of callbacks) {
      callback();
    }
  };

  if (typeof queueMicrotask === "function") {
    queueMicrotask(run);
    return;
  }

  void Promise.resolve().then(run);
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(requestError("IndexedDB 트랜잭션에 실패했습니다", transaction.error));
    transaction.onabort = () => reject(requestError("IndexedDB 트랜잭션이 취소되었습니다", transaction.error));
  });
}

export async function readAllFromStore<T extends { id: string }>(storeName: LocalDbStoreName): Promise<T[]> {
  if (!isLocalDbSupported()) {
    return Array.from(getMemoryStore(storeName).values()) as T[];
  }

  const db = await openLocalDb();
  return await new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };
    request.onerror = () => {
      reject(requestError("IndexedDB 읽기에 실패했습니다", request.error));
    };
  });
}

export async function putLocalRecord<T extends { id: string }>(
  storeName: LocalDbStoreName,
  record: T,
): Promise<void> {
  if (!isLocalDbSupported()) {
    getMemoryStore(storeName).set(record.id, record);
    notifyStore(storeName);
    return;
  }

  const db = await openLocalDb();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(record);
  await transactionComplete(transaction);
  notifyStore(storeName);
}

export async function putLocalRecords<T extends { id: string }>(
  storeName: LocalDbStoreName,
  records: T[],
): Promise<void> {
  if (!isLocalDbSupported()) {
    const store = getMemoryStore(storeName);
    for (const record of records) {
      store.set(record.id, record);
    }
    notifyStore(storeName);
    return;
  }

  const db = await openLocalDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  for (const record of records) {
    store.put(record);
  }
  await transactionComplete(transaction);
  notifyStore(storeName);
}

export async function deleteLocalRecord(storeName: LocalDbStoreName, recordId: string): Promise<void> {
  if (!isLocalDbSupported()) {
    getMemoryStore(storeName).delete(recordId);
    notifyStore(storeName);
    return;
  }

  const db = await openLocalDb();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(recordId);
  await transactionComplete(transaction);
  notifyStore(storeName);
}

export async function clearLocalStore(storeName: LocalDbStoreName): Promise<void> {
  if (!isLocalDbSupported()) {
    getMemoryStore(storeName).clear();
    notifyStore(storeName);
    return;
  }

  const db = await openLocalDb();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).clear();
  await transactionComplete(transaction);
  notifyStore(storeName);
}

export function subscribeLocalDb(storeName: LocalDbStoreName, listener: StoreListener): () => void {
  const callbacks = listeners.get(storeName) ?? new Set<StoreListener>();
  callbacks.add(listener);
  listeners.set(storeName, callbacks);

  return () => {
    callbacks.delete(listener);
  };
}

export function resetLocalDbForTests(): void {
  dbPromise = null;
  memoryStores.clear();
  listeners.clear();
}
