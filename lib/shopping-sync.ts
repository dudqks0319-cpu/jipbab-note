// 이 파일은 장보기 목록의 로컬/원격 동기화 병합 규칙을 관리합니다.
import type { ShoppingItem } from "../types/index.ts";
import { shouldKeepLocalRecord } from "./sync/conflict-policy.ts";

function toTime(value: string): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function compareNewestFirst(a: ShoppingItem, b: ShoppingItem): number {
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

export function mergeShoppingItems(
  localItems: ShoppingItem[],
  remoteItems: ShoppingItem[],
): ShoppingItem[] {
  const byId = new Map<string, ShoppingItem>();

  for (const item of localItems) {
    byId.set(item.id, item);
  }

  for (const item of remoteItems) {
    const current = byId.get(item.id);
    if (
      !current ||
      !shouldKeepLocalRecord({
        localStatus: current.syncStatus,
        localUpdatedAt: current.updatedAt,
        remoteUpdatedAt: item.updatedAt,
      })
    ) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values()).sort(compareNewestFirst);
}
