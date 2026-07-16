// 이 파일은 주간 식단을 기기에 보존하고 로그인 시 개인 계정과 명시적으로 동기화합니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getMealPlanAccessToken } from "@/lib/meal-plan-client";
import { getWeekStart, parseMealPlanInput, type MealPlanItem } from "@/lib/meal-plan";

export type MealPlanSyncState = "loading" | "local_only" | "syncing" | "synced" | "failed" | "conflict";

function storageKey(weekStart: string): string {
  return `jipbab:meal-plan:v1:${weekStart}`;
}

function readLocalPlan(weekStart: string): MealPlanItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(weekStart));
    if (!raw) return [];
    return parseMealPlanInput(JSON.parse(raw)).items;
  } catch {
    window.localStorage.removeItem(storageKey(weekStart));
    return [];
  }
}

function writeLocalPlan(weekStart: string, items: MealPlanItem[]) {
  window.localStorage.setItem(storageKey(weekStart), JSON.stringify({ weekStart, items }));
}

async function readResponseData(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const payload = await response.json() as { data?: Record<string, unknown> };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export function useMealPlan() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const weekStart = useMemo(() => getWeekStart(), []);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [remoteItems, setRemoteItems] = useState<MealPlanItem[] | null>(null);
  const [syncState, setSyncState] = useState<MealPlanSyncState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const localItems = readLocalPlan(weekStart);
    setItems(localItems);
    setSyncState(localItems.length > 0 ? "local_only" : "loading");
  }, [weekStart]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setSyncState((current) => current === "loading" ? "local_only" : current);
      return;
    }

    let cancelled = false;
    const loadRemote = async () => {
      const accessToken = await getMealPlanAccessToken();
      if (!accessToken) return;
      setSyncState("syncing");
      try {
        const response = await fetch(`/api/v1/meal-plans?weekStart=${encodeURIComponent(weekStart)}`, {
          headers: { authorization: `Bearer ${accessToken}` },
        });
        const data = await readResponseData(response);
        if (!response.ok || !data) throw new Error("meal_plan_load_failed");
        const remote = parseMealPlanInput({ weekStart: data.weekStart, items: data.items }).items;
        if (cancelled) return;
        if (remote.length > 0) {
          const local = readLocalPlan(weekStart);
          if (local.length > 0 && JSON.stringify(local) !== JSON.stringify(remote)) {
            setItems(local);
            setRemoteItems(remote);
            setSyncState("conflict");
            setMessage("기기 식단과 계정 식단이 달라 자동으로 덮어쓰지 않았습니다. 유지할 식단을 선택해 주세요.");
            return;
          }
          setItems(remote);
          setRemoteItems(null);
          writeLocalPlan(weekStart, remote);
          setSyncState("synced");
          setMessage("계정에 저장된 이번 주 식단을 불러왔습니다.");
        } else {
          const local = readLocalPlan(weekStart);
          setItems(local);
          setSyncState(local.length > 0 ? "local_only" : "synced");
          setMessage(local.length > 0 ? "기기 식단이 있습니다. 동기화 버튼을 눌러 계정에 저장해 주세요." : "이번 주 식단이 비어 있습니다.");
        }
      } catch {
        if (!cancelled) {
          setSyncState("failed");
          setMessage("동기화에 실패했습니다. 현재 식단은 이 기기에만 저장됩니다.");
        }
      }
    };
    void loadRemote();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, weekStart]);

  const syncItems = useCallback(async (nextItems: MealPlanItem[]) => {
    if (!isAuthenticated) {
      setSyncState("local_only");
      setMessage("로그인 전에는 이 기기에만 저장됩니다.");
      return false;
    }
    const accessToken = await getMealPlanAccessToken();
    if (!accessToken) {
      setSyncState("failed");
      setMessage("로그인 상태를 확인하지 못했습니다. 이 기기 기록은 유지됩니다.");
      return false;
    }
    setSyncState("syncing");
    try {
      const response = await fetch("/api/v1/meal-plans", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ weekStart, items: nextItems }),
      });
      if (!response.ok) throw new Error("meal_plan_sync_failed");
      setSyncState("synced");
      setRemoteItems(null);
      setMessage("이번 주 식단을 계정과 동기화했습니다.");
      return true;
    } catch {
      setSyncState("failed");
      setMessage("동기화에 실패했습니다. 현재 식단은 이 기기에만 저장됩니다.");
      return false;
    }
  }, [isAuthenticated, weekStart]);

  const saveItems = useCallback(async (nextItems: MealPlanItem[]) => {
    const validated = parseMealPlanInput({ weekStart, items: nextItems }).items;
    setItems(validated);
    writeLocalPlan(weekStart, validated);
    setSyncState("local_only");
    await syncItems(validated);
  }, [syncItems, weekStart]);

  const syncNow = useCallback(async () => syncItems(items), [items, syncItems]);

  const useRemotePlan = useCallback(() => {
    if (!remoteItems) return;
    setItems(remoteItems);
    writeLocalPlan(weekStart, remoteItems);
    setRemoteItems(null);
    setSyncState("synced");
    setMessage("계정 식단을 이 기기에 적용했습니다.");
  }, [remoteItems, weekStart]);

  const keepLocalPlan = useCallback(async () => {
    const synced = await syncItems(items);
    if (synced) setRemoteItems(null);
  }, [items, syncItems]);

  return {
    weekStart,
    items,
    syncState,
    message,
    isAuthenticated,
    saveItems,
    syncNow,
    useRemotePlan,
    keepLocalPlan,
  };
}
