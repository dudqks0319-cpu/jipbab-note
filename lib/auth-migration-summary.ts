// 이 파일은 로그인 후 데이터 이전 결과를 사용자에게 보여줄 요약으로 바꿉니다.
import type { AuthQueryError, DeviceDataMigrationResult } from "../types/index.ts";

export type SyncHealth = "normal" | "running" | "partial" | "needs-attention";

export interface AuthMigrationSummary {
  health: SyncHealth;
  statLabel: string;
  message: string | null;
}

export function summarizeAuthMigrationState(options: {
  migrating: boolean;
  error: AuthQueryError | null;
  migrationResult: DeviceDataMigrationResult | null;
}): AuthMigrationSummary {
  if (options.migrating) {
    return {
      health: "running",
      statLabel: "진행중",
      message: "디바이스 데이터를 계정으로 이전하고 있어요.",
    };
  }

  if (options.error) {
    return {
      health: "needs-attention",
      statLabel: "확인필요",
      message: options.error.message,
    };
  }

  const tableResults = options.migrationResult?.tableResults ?? [];
  const failedTables = tableResults.filter((item) => !item.skipped && Boolean(item.reason));
  if (failedTables.length > 0) {
    return {
      health: "needs-attention",
      statLabel: "확인필요",
      message: `${failedTables.length}개 데이터 묶음 이전을 확인해야 합니다.`,
    };
  }

  const skippedTables = tableResults.filter((item) => item.skipped);
  if (
    skippedTables.length > 0
    && options.migrationResult?.remoteMigrationMode !== "signed_session_sync"
  ) {
    return {
      health: "partial",
      statLabel: "일부확인",
      message: "일부 서버 테이블은 건너뛰었지만 기본 데이터 이전은 계속 진행됐습니다.",
    };
  }

  return {
    health: "normal",
    statLabel: "정상",
    message: null,
  };
}
