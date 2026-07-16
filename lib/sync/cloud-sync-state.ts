export type CloudSyncSource = "local" | "supabase";

export type CloudSyncState = "checking" | "local-only" | "synced" | "error";

export type CloudSyncResult<T> = {
  records: T[];
  source: CloudSyncSource;
};
