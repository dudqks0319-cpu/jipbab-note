'use client'

import { useCallback, useMemo, useState } from 'react'

import {
  CHILD_ALLERGEN_CODES,
  DEFAULT_CHILD_MEAL_SETTINGS,
  type ChildAgeBand,
  type ChildAllergenCode,
  type ChildMealSettings,
  type ChildTexturePreference,
} from '@/lib/child-meals/types'
import { normalizeChildMealSettings } from '@/lib/child-meals/validation'

const STORAGE_KEY = 'jipbab-note-child-meal-settings-v1'

function safeReadChildMealSettings(): ChildMealSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_CHILD_MEAL_SETTINGS
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return DEFAULT_CHILD_MEAL_SETTINGS
  }

  try {
    return normalizeChildMealSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_CHILD_MEAL_SETTINGS
  }
}

function safeWriteChildMealSettings(settings: ChildMealSettings) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export interface UseChildMealSettingsResult {
  settings: ChildMealSettings
  excludedAllergenCount: number
  setEnabled: (enabled: boolean) => void
  setPreferredAudience: (audience: ChildMealSettings['preferredAudience']) => void
  setAgeBand: (ageBand: ChildAgeBand) => void
  setTexturePreference: (texturePreference: ChildTexturePreference) => void
  toggleExcludedAllergen: (allergenCode: ChildAllergenCode) => void
  setPreferFamilySplit: (preferFamilySplit: boolean) => void
  setPreferMaxActiveMinutes: (minutes: 10 | 15 | 20 | null) => void
  resetChildMealSettings: () => void
}

export function useChildMealSettings(): UseChildMealSettingsResult {
  const [settings, setSettings] = useState<ChildMealSettings>(() => safeReadChildMealSettings())

  const updateSettings = useCallback((updater: (current: ChildMealSettings) => ChildMealSettings) => {
    setSettings((current) => {
      const next = normalizeChildMealSettings(updater(current))
      safeWriteChildMealSettings(next)
      return next
    })
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    updateSettings((current) => ({ ...current, enabled }))
  }, [updateSettings])

  const setPreferredAudience = useCallback((preferredAudience: ChildMealSettings['preferredAudience']) => {
    updateSettings((current) => ({ ...current, preferredAudience }))
  }, [updateSettings])

  const setAgeBand = useCallback((ageBand: ChildAgeBand) => {
    updateSettings((current) => ({ ...current, ageBand }))
  }, [updateSettings])

  const setTexturePreference = useCallback((texturePreference: ChildTexturePreference) => {
    updateSettings((current) => ({ ...current, texturePreference }))
  }, [updateSettings])

  const toggleExcludedAllergen = useCallback((allergenCode: ChildAllergenCode) => {
    if (!CHILD_ALLERGEN_CODES.includes(allergenCode)) return
    updateSettings((current) => ({
      ...current,
      excludedAllergenCodes: current.excludedAllergenCodes.includes(allergenCode)
        ? current.excludedAllergenCodes.filter((code) => code !== allergenCode)
        : [...current.excludedAllergenCodes, allergenCode],
    }))
  }, [updateSettings])

  const setPreferFamilySplit = useCallback((preferFamilySplit: boolean) => {
    updateSettings((current) => ({ ...current, preferFamilySplit }))
  }, [updateSettings])

  const setPreferMaxActiveMinutes = useCallback((preferMaxActiveMinutes: 10 | 15 | 20 | null) => {
    updateSettings((current) => ({ ...current, preferMaxActiveMinutes }))
  }, [updateSettings])

  const resetChildMealSettings = useCallback(() => {
    setSettings(DEFAULT_CHILD_MEAL_SETTINGS)
    safeWriteChildMealSettings(DEFAULT_CHILD_MEAL_SETTINGS)
  }, [])

  const excludedAllergenCount = useMemo(
    () => settings.excludedAllergenCodes.length,
    [settings.excludedAllergenCodes],
  )

  return {
    settings,
    excludedAllergenCount,
    setEnabled,
    setPreferredAudience,
    setAgeBand,
    setTexturePreference,
    toggleExcludedAllergen,
    setPreferFamilySplit,
    setPreferMaxActiveMinutes,
    resetChildMealSettings,
  }
}
