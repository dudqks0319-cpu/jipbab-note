// 이 파일은 알림/운영 관련 앱 설정을 localStorage에 저장합니다.
"use client";

import { useCallback, useMemo, useState } from "react";

import type { IngredientUnitSystem } from "@/types";

const STORAGE_KEY = "jipbab-note-app-settings";

export type AppSettings = {
  expiryAlerts: boolean;
  shoppingReminders: boolean;
  recipeDiscoveryTips: boolean;
  unitSystem: IngredientUnitSystem;
};

const DEFAULT_SETTINGS: AppSettings = {
  expiryAlerts: true,
  shoppingReminders: true,
  recipeDiscoveryTips: true,
  unitSystem: "metric",
};

function safeReadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      expiryAlerts: typeof parsed.expiryAlerts === "boolean" ? parsed.expiryAlerts : DEFAULT_SETTINGS.expiryAlerts,
      shoppingReminders:
        typeof parsed.shoppingReminders === "boolean"
          ? parsed.shoppingReminders
          : DEFAULT_SETTINGS.shoppingReminders,
      recipeDiscoveryTips:
        typeof parsed.recipeDiscoveryTips === "boolean"
          ? parsed.recipeDiscoveryTips
          : DEFAULT_SETTINGS.recipeDiscoveryTips,
      unitSystem:
        parsed.unitSystem === "metric" ||
        parsed.unitSystem === "spoon" ||
        parsed.unitSystem === "count"
          ? parsed.unitSystem
          : DEFAULT_SETTINGS.unitSystem,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function safeWriteSettings(nextSettings: AppSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
}

export interface UseAppSettingsResult {
  settings: AppSettings;
  enabledCount: number;
  toggleSetting: (key: keyof AppSettings) => void;
  setUnitSystem: (unitSystem: IngredientUnitSystem) => void;
  resetSettings: () => void;
}

export function useAppSettings(): UseAppSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(() => safeReadSettings());

  const toggleSetting = useCallback((key: keyof AppSettings) => {
    if (key === "unitSystem") {
      return;
    }

    setSettings((prev) => {
      const nextSettings = {
        ...prev,
        [key]: !prev[key],
      };
      safeWriteSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const setUnitSystem = useCallback((unitSystem: IngredientUnitSystem) => {
    setSettings((prev) => {
      const nextSettings = {
        ...prev,
        unitSystem,
      };
      safeWriteSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    safeWriteSettings(DEFAULT_SETTINGS);
  }, []);

  const enabledCount = useMemo(
    () => Object.values(settings).filter(Boolean).length,
    [settings],
  );

  return {
    settings,
    enabledCount,
    toggleSetting,
    setUnitSystem,
    resetSettings,
  };
}
