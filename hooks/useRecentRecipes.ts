// 이 훅은 최근 조리 메뉴 원장을 구독해 추천 다양성 계산에 제공합니다.
"use client";

import { useEffect, useState } from "react";

import {
  readRecentRecipeHistory,
  RECENT_RECIPE_CHANGE_EVENT,
  type RecentRecipeEntry,
} from "@/lib/recent-recipes";

export function useRecentRecipes(): RecentRecipeEntry[] {
  const [history, setHistory] = useState<RecentRecipeEntry[]>([]);
  useEffect(() => {
    const refresh = () => setHistory(readRecentRecipeHistory());
    refresh();
    window.addEventListener(RECENT_RECIPE_CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECENT_RECIPE_CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return history;
}
