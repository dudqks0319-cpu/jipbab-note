// 이 파일은 알림/운영 관련 앱 설정을 localStorage에 저장합니다.
"use client";

import { useCallback, useMemo, useState } from "react";

import type { IngredientUnitSystem } from "@/types";

const STORAGE_KEY = "jipbab-note-app-settings";

export type AppSettings = {
  allergyNotes: string;
  expiryAlerts: boolean;
  expiryReminderDays: number[];
  notificationHour: number;
  dislikedIngredients: string;
  excludedCategories: string[];
  cravingKeyword: string;
  shoppingReminders: boolean;
  recipeDiscoveryTips: boolean;
  servingSize: number;
  unitSystem: IngredientUnitSystem;
};

const DEFAULT_SETTINGS: AppSettings = {
  allergyNotes: "",
  expiryAlerts: true,
  expiryReminderDays: [3, 1, 0],
  notificationHour: 9,
  dislikedIngredients: "",
  excludedCategories: [],
  cravingKeyword: "",
  shoppingReminders: true,
  recipeDiscoveryTips: true,
  servingSize: 2,
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
      allergyNotes:
        typeof parsed.allergyNotes === "string" && parsed.allergyNotes.length <= 120
          ? parsed.allergyNotes
          : DEFAULT_SETTINGS.allergyNotes,
      expiryAlerts: typeof parsed.expiryAlerts === "boolean" ? parsed.expiryAlerts : DEFAULT_SETTINGS.expiryAlerts,
      expiryReminderDays:
        Array.isArray(parsed.expiryReminderDays)
          ? parsed.expiryReminderDays
              .filter((item): item is number => typeof item === "number" && [0, 1, 3].includes(item))
              .slice(0, 3)
          : DEFAULT_SETTINGS.expiryReminderDays,
      notificationHour:
        typeof parsed.notificationHour === "number" &&
        Number.isInteger(parsed.notificationHour) &&
        parsed.notificationHour >= 0 &&
        parsed.notificationHour <= 23
          ? parsed.notificationHour
          : DEFAULT_SETTINGS.notificationHour,
      dislikedIngredients:
        typeof parsed.dislikedIngredients === "string" && parsed.dislikedIngredients.length <= 120
          ? parsed.dislikedIngredients
          : DEFAULT_SETTINGS.dislikedIngredients,
      excludedCategories:
        Array.isArray(parsed.excludedCategories)
          ? parsed.excludedCategories.filter((item): item is string => typeof item === "string").slice(0, 12)
          : DEFAULT_SETTINGS.excludedCategories,
      cravingKeyword:
        typeof parsed.cravingKeyword === "string" && parsed.cravingKeyword.length <= 40
          ? parsed.cravingKeyword
          : DEFAULT_SETTINGS.cravingKeyword,
      shoppingReminders:
        typeof parsed.shoppingReminders === "boolean"
          ? parsed.shoppingReminders
          : DEFAULT_SETTINGS.shoppingReminders,
      recipeDiscoveryTips:
        typeof parsed.recipeDiscoveryTips === "boolean"
          ? parsed.recipeDiscoveryTips
          : DEFAULT_SETTINGS.recipeDiscoveryTips,
      servingSize:
        typeof parsed.servingSize === "number" && Number.isInteger(parsed.servingSize) && parsed.servingSize >= 1 && parsed.servingSize <= 8
          ? parsed.servingSize
          : DEFAULT_SETTINGS.servingSize,
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
  setPreferenceText: (key: "allergyNotes" | "dislikedIngredients", value: string) => void;
  setCravingKeyword: (value: string) => void;
  toggleExcludedCategory: (category: string) => void;
  setServingSize: (servingSize: number) => void;
  toggleExpiryReminderDay: (day: number) => void;
  setNotificationHour: (hour: number) => void;
  toggleSetting: (key: keyof AppSettings) => void;
  setUnitSystem: (unitSystem: IngredientUnitSystem) => void;
  resetSettings: () => void;
}

export function useAppSettings(): UseAppSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(() => safeReadSettings());

  const setPreferenceText = useCallback((key: "allergyNotes" | "dislikedIngredients", value: string) => {
    setSettings((prev) => {
      const nextSettings = {
        ...prev,
        [key]: value.slice(0, 120),
      };
      safeWriteSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const setCravingKeyword = useCallback((value: string) => {
    setSettings((prev) => {
      const nextSettings = {
        ...prev,
        cravingKeyword: value.slice(0, 40),
      };
      safeWriteSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const toggleExcludedCategory = useCallback((category: string) => {
    setSettings((prev) => {
      const exists = prev.excludedCategories.includes(category);
      const nextSettings = {
        ...prev,
        excludedCategories: exists
          ? prev.excludedCategories.filter((item) => item !== category)
          : [...prev.excludedCategories, category].slice(0, 12),
      };
      safeWriteSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const setServingSize = useCallback((servingSize: number) => {
    const normalized = Number.isFinite(servingSize) ? Math.min(Math.max(Math.round(servingSize), 1), 8) : 2;
    setSettings((prev) => {
      const nextSettings = {
        ...prev,
        servingSize: normalized,
      };
      safeWriteSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const toggleExpiryReminderDay = useCallback((day: number) => {
    if (![0, 1, 3].includes(day)) {
      return;
    }

    setSettings((prev) => {
      const exists = prev.expiryReminderDays.includes(day);
      const nextDays = exists
        ? prev.expiryReminderDays.filter((item) => item !== day)
        : [...prev.expiryReminderDays, day].sort((left, right) => right - left);
      const nextSettings = {
        ...prev,
        expiryReminderDays: nextDays.length > 0 ? nextDays : DEFAULT_SETTINGS.expiryReminderDays,
      };
      safeWriteSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const setNotificationHour = useCallback((hour: number) => {
    const normalized = Number.isFinite(hour) ? Math.min(Math.max(Math.floor(hour), 0), 23) : DEFAULT_SETTINGS.notificationHour;
    setSettings((prev) => {
      const nextSettings = {
        ...prev,
        notificationHour: normalized,
      };
      safeWriteSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const toggleSetting = useCallback((key: keyof AppSettings) => {
    if (
      key === "unitSystem" ||
      key === "allergyNotes" ||
      key === "dislikedIngredients" ||
      key === "servingSize" ||
      key === "expiryReminderDays" ||
      key === "notificationHour"
    ) {
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
    setPreferenceText,
    setCravingKeyword,
    toggleExcludedCategory,
    setServingSize,
    toggleExpiryReminderDay,
    setNotificationHour,
    toggleSetting,
    setUnitSystem,
    resetSettings,
  };
}
