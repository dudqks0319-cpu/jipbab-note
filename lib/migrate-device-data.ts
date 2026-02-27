// 이 파일은 로그인 직후 디바이스 데이터를 계정 데이터로 이전하는 유틸리티입니다.
import type { SupabaseClient } from "@supabase/supabase-js";

import { getDeviceId } from "@/lib/device-id";
import type { DeviceDataMigrationResult, DeviceDataMigrationTableResult } from "@/types";

interface MigrateDeviceDataOptions {
  client: SupabaseClient;
  userId: string;
  deviceId?: string;
}

const TABLES_TO_MIGRATE = [
  "ingredients",
  "favorites",
  "community_posts",
  "community_comments",
  "community_likes",
] as const;

const LOCAL_STORAGE_KEYS = [
  "jipbab-note-ingredients",
  "jipbab-note-community-posts",
  "jipbab-note-community-comments",
  "jipbab-note-community-likes",
] as const;

function normalizeMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message.trim()) {
    return value.message;
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return fallback;
}

function isMissingTableError(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { code?: string; message?: string; details?: string | null };
  const code = candidate.code?.toUpperCase();
  if (code === "PGRST205" || code === "42P01") {
    return true;
  }

  const joined = `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();
  return (
    joined.includes("does not exist") ||
    joined.includes("could not find the table") ||
    joined.includes("schema cache")
  );
}

async function migrateSingleTable(
  client: SupabaseClient,
  tableName: (typeof TABLES_TO_MIGRATE)[number],
  deviceId: string,
  userId: string,
): Promise<DeviceDataMigrationTableResult> {
  try {
    const { data: existsRows, error: selectError } = await client
      .from(tableName)
      .select("id")
      .eq("device_id", deviceId)
      .is("user_id", null)
      .limit(1);

    if (selectError) {
      if (isMissingTableError(selectError)) {
        return {
          table: tableName,
          migratedCount: 0,
          skipped: true,
          reason: "테이블이 없어 이전을 건너뛰었습니다.",
        };
      }

      return {
        table: tableName,
        migratedCount: 0,
        skipped: false,
        reason: normalizeMessage(selectError, `${tableName} 조회 실패`),
      };
    }

    if (!existsRows || existsRows.length === 0) {
      return {
        table: tableName,
        migratedCount: 0,
        skipped: false,
      };
    }

    const { data: updatedRows, error: updateError } = await client
      .from(tableName)
      .update({ user_id: userId })
      .eq("device_id", deviceId)
      .is("user_id", null)
      .select("id");

    if (updateError) {
      if (isMissingTableError(updateError)) {
        return {
          table: tableName,
          migratedCount: 0,
          skipped: true,
          reason: "테이블이 없어 이전을 건너뛰었습니다.",
        };
      }

      return {
        table: tableName,
        migratedCount: 0,
        skipped: false,
        reason: normalizeMessage(updateError, `${tableName} 이전 실패`),
      };
    }

    return {
      table: tableName,
      migratedCount: updatedRows?.length ?? 0,
      skipped: false,
    };
  } catch (caught) {
    return {
      table: tableName,
      migratedCount: 0,
      skipped: false,
      reason: normalizeMessage(caught, `${tableName} 이전 중 예외 발생`),
    };
  }
}

function migrateLocalStorageKey(storageKey: string, deviceId: string, userId: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return 0;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return 0;
    }

    let migratedCount = 0;

    const nextItems = parsed.map((item) => {
      if (!item || typeof item !== "object") {
        return item;
      }

      const row = item as Record<string, unknown>;
      const rowDeviceId = typeof row.deviceId === "string" ? row.deviceId : null;
      const rowUserId = typeof row.userId === "string" ? row.userId : row.userId === null ? null : undefined;

      if (rowDeviceId === deviceId && (rowUserId === null || rowUserId === undefined || rowUserId === "")) {
        migratedCount += 1;
        return {
          ...row,
          userId,
        };
      }

      return row;
    });

    if (migratedCount > 0) {
      window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
    }

    return migratedCount;
  } catch {
    return 0;
  }
}

export async function migrateDeviceData(options: MigrateDeviceDataOptions): Promise<DeviceDataMigrationResult> {
  const resolvedDeviceId = options.deviceId?.trim() || getDeviceId();

  if (!resolvedDeviceId || !options.userId.trim()) {
    return {
      totalMigratedCount: 0,
      localMigratedCount: 0,
      tableResults: TABLES_TO_MIGRATE.map((table) => ({
        table,
        migratedCount: 0,
        skipped: true,
        reason: "디바이스 ID 또는 사용자 ID가 없어 이전을 건너뛰었습니다.",
      })),
    };
  }

  const tableResults: DeviceDataMigrationTableResult[] = [];
  for (const table of TABLES_TO_MIGRATE) {
    // 병렬보다 순차 이전이 충돌 분석에 유리해 순차로 처리합니다.
    const result = await migrateSingleTable(options.client, table, resolvedDeviceId, options.userId);
    tableResults.push(result);
  }

  let localMigratedCount = 0;
  for (const key of LOCAL_STORAGE_KEYS) {
    localMigratedCount += migrateLocalStorageKey(key, resolvedDeviceId, options.userId);
  }

  const remoteMigratedCount = tableResults.reduce((sum, item) => sum + item.migratedCount, 0);

  return {
    totalMigratedCount: remoteMigratedCount + localMigratedCount,
    localMigratedCount,
    tableResults,
  };
}
