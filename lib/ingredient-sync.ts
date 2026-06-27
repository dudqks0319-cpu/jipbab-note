// 재료 동기화 충돌 해결 규칙을 한 곳에 모아 훅을 단순하게 유지합니다.
import type { IngredientRecord } from "../types/index.ts";
import { shouldKeepLocalRecord } from "./sync/conflict-policy.ts";

export const INGREDIENT_SYNC_TIMEOUT_MS = 3500;

function toTime(value: string): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function compareNewestFirst(a: IngredientRecord, b: IngredientRecord): number {
  const updatedDiff = toTime(b.updatedAt) - toTime(a.updatedAt);
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  const createdDiff = toTime(b.createdAt) - toTime(a.createdAt);
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return a.id.localeCompare(b.id);
}

export function mergeIngredientRecords(
  localRecords: IngredientRecord[],
  remoteRecords: IngredientRecord[],
): IngredientRecord[] {
  const byId = new Map<string, IngredientRecord>();

  for (const record of localRecords) {
    byId.set(record.id, record);
  }

  for (const record of remoteRecords) {
    const current = byId.get(record.id);
    if (
      !current ||
      !shouldKeepLocalRecord({
        localStatus: current.syncStatus,
        localUpdatedAt: current.updatedAt,
        remoteUpdatedAt: record.updatedAt,
      })
    ) {
      byId.set(record.id, record);
    }
  }

  return Array.from(byId.values()).sort(compareNewestFirst);
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
