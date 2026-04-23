// 이 파일은 오늘 먹고 싶은 메뉴와 제외 카테고리 설정을 localStorage로 관리합니다.
"use client";

import { useCallback, useMemo, useState } from "react";

import type { RecipeCategory } from "@/types";

const STORAGE_KEY = "jipbab-note-meal-preferences";

export type MealPreferences = {
  craving: string;
  excludedCategories: RecipeCategory[];
};

const DEFAULT_PREFERENCES: MealPreferences = {
  craving: "",
  excludedCategories: [],
};

function readPreferences(): MealPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<MealPreferences>;
    return {
      craving: typeof parsed.craving === "string" ? parsed.craving : "",
      excludedCategories: Array.isArray(parsed.excludedCategories)
        ? parsed.excludedCategories.filter((item): item is RecipeCategory => typeof item === "string")
        : [],
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(next: MealPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function useMealPreferences() {
  const [preferences, setPreferences] = useState<MealPreferences>(() => readPreferences());

  const excludedCategorySet = useMemo(
    () => new Set(preferences.excludedCategories),
    [preferences.excludedCategories],
  );

  const updateCraving = useCallback((craving: string) => {
    setPreferences((prev) => {
      const next = { ...prev, craving };
      writePreferences(next);
      return next;
    });
  }, []);

  const toggleExcludedCategory = useCallback((category: RecipeCategory) => {
    setPreferences((prev) => {
      const exists = prev.excludedCategories.includes(category);
      const next = {
        ...prev,
        excludedCategories: exists
          ? prev.excludedCategories.filter((item) => item !== category)
          : [...prev.excludedCategories, category],
      };
      writePreferences(next);
      return next;
    });
  }, []);

  return {
    preferences,
    excludedCategorySet,
    updateCraving,
    toggleExcludedCategory,
  };
}

