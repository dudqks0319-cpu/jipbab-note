'use client'

import { useCallback, useMemo, useState } from 'react'

import type { ChildMealFeedbackRecord, ChildMealFeedbackValue } from '@/lib/child-meals/types'

const STORAGE_KEY = 'jipbab-note-child-meal-feedback-v1'
const MAX_RECORDS = 100

export const CHILD_MEAL_FEEDBACK_NOTE_CODES = [
  'texture_was_hard',
  'smell_was_new',
  'not_hungry_today',
  'try_again_later',
] as const

export type ChildMealFeedbackNoteCode = (typeof CHILD_MEAL_FEEDBACK_NOTE_CODES)[number]

function isFeedbackValue(value: unknown): value is ChildMealFeedbackValue {
  return value === 'ate_well' || value === 'tasted' || value === 'touched' || value === 'not_ready'
}

function isFeedbackNoteCode(value: unknown): value is ChildMealFeedbackNoteCode {
  return typeof value === 'string' && CHILD_MEAL_FEEDBACK_NOTE_CODES.includes(value as ChildMealFeedbackNoteCode)
}

function safeReadFeedback(): ChildMealFeedbackRecord[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : '',
        recipeId: typeof item.recipeId === 'string' ? item.recipeId : '',
        value: isFeedbackValue(item.value) ? item.value : 'not_ready',
        notes: Array.isArray(item.notes) ? item.notes.filter(isFeedbackNoteCode).slice(0, 4) : [],
        createdAt: typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt))
          ? item.createdAt
          : new Date(0).toISOString(),
      }))
      .filter((item) => item.id && item.recipeId)
      .slice(0, MAX_RECORDS)
  } catch {
    return []
  }
}

function safeWriteFeedback(records: ChildMealFeedbackRecord[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
}

function feedbackId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useChildMealFeedback() {
  const [records, setRecords] = useState<ChildMealFeedbackRecord[]>(() => safeReadFeedback())

  const saveFeedback = useCallback((input: {
    recipeId: string
    value: ChildMealFeedbackValue
    notes?: ChildMealFeedbackNoteCode[]
  }) => {
    const recipeId = input.recipeId.trim()
    if (!recipeId || !isFeedbackValue(input.value)) return
    const nextRecord: ChildMealFeedbackRecord = {
      id: feedbackId(),
      recipeId,
      value: input.value,
      notes: [...new Set((input.notes ?? []).filter(isFeedbackNoteCode))].slice(0, 4),
      createdAt: new Date().toISOString(),
    }
    setRecords((current) => {
      const next = [nextRecord, ...current].slice(0, MAX_RECORDS)
      safeWriteFeedback(next)
      return next
    })
  }, [])

  const clearRecipeFeedback = useCallback((recipeId: string) => {
    setRecords((current) => {
      const next = current.filter((record) => record.recipeId !== recipeId)
      safeWriteFeedback(next)
      return next
    })
  }, [])

  const latestByRecipeId = useMemo(() => {
    const map = new Map<string, ChildMealFeedbackRecord>()
    for (const record of records) {
      if (!map.has(record.recipeId)) map.set(record.recipeId, record)
    }
    return map
  }, [records])

  return {
    records,
    latestByRecipeId,
    saveFeedback,
    clearRecipeFeedback,
  }
}
