import type { SyncStatus } from "../local-db/schema.ts";

export function isPendingSyncStatus(status: SyncStatus | undefined): boolean {
  return status === "pending_create" ||
    status === "pending_update" ||
    status === "pending_delete" ||
    status === "conflict";
}

export function shouldKeepLocalRecord(options: {
  localStatus?: SyncStatus;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
}): boolean {
  if (isPendingSyncStatus(options.localStatus)) {
    return true;
  }

  const localTime = Date.parse(options.localUpdatedAt);
  const remoteTime = Date.parse(options.remoteUpdatedAt);
  return !Number.isNaN(localTime) && !Number.isNaN(remoteTime) && localTime > remoteTime;
}
