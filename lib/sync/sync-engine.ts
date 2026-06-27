import {
  deleteLocalRecord,
  putLocalRecord,
  readAllFromStore,
} from "../local-db/index.ts";
import {
  LOCAL_DB_STORES,
  type PendingSyncAction,
  type PendingSyncQueueEntry,
  type PendingSyncTableName,
} from "../local-db/schema.ts";

function queueId(tableName: PendingSyncTableName, recordId: string): string {
  return `${tableName}:${recordId}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function nextQueueAction(
  existingAction: PendingSyncAction | undefined,
  nextAction: PendingSyncAction,
): PendingSyncAction {
  if (nextAction === "delete") {
    return "delete";
  }

  if (existingAction === "create") {
    return "create";
  }

  return nextAction;
}

export async function enqueuePendingSync(options: {
  tableName: PendingSyncTableName;
  recordId: string;
  action: PendingSyncAction;
  payload: unknown;
}): Promise<PendingSyncQueueEntry> {
  const now = new Date().toISOString();
  const id = queueId(options.tableName, options.recordId);
  const current = await readAllFromStore<PendingSyncQueueEntry>(LOCAL_DB_STORES.pendingSyncQueue);
  const existing = current.find((entry) => entry.id === id);
  const entry: PendingSyncQueueEntry = {
    id,
    tableName: options.tableName,
    recordId: options.recordId,
    action: nextQueueAction(existing?.action, options.action),
    payloadJson: JSON.stringify(options.payload),
    retryCount: existing?.retryCount ?? 0,
    lastError: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await putLocalRecord(LOCAL_DB_STORES.pendingSyncQueue, entry);
  return entry;
}

export async function listPendingSyncEntries(
  tableName: PendingSyncTableName,
): Promise<PendingSyncQueueEntry[]> {
  const entries = await readAllFromStore<PendingSyncQueueEntry>(LOCAL_DB_STORES.pendingSyncQueue);
  return entries
    .filter((entry) => entry.tableName === tableName)
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

export async function clearPendingSync(
  tableName: PendingSyncTableName,
  recordId: string,
): Promise<void> {
  await deleteLocalRecord(LOCAL_DB_STORES.pendingSyncQueue, queueId(tableName, recordId));
}

export async function markPendingSyncFailed(
  entry: PendingSyncQueueEntry,
  error: unknown,
): Promise<void> {
  await putLocalRecord<PendingSyncQueueEntry>(LOCAL_DB_STORES.pendingSyncQueue, {
    ...entry,
    retryCount: entry.retryCount + 1,
    lastError: errorMessage(error),
    updatedAt: new Date().toISOString(),
  });
}
