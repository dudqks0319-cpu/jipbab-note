'use client'

import { Check, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import {
  CHILD_MEAL_FEEDBACK_NOTE_CODES,
  type ChildMealFeedbackNoteCode,
  useChildMealFeedback,
} from '@/hooks/useChildMealFeedback'
import type { ChildMealFeedbackValue } from '@/lib/child-meals/types'

const VALUE_OPTIONS: Array<{ value: ChildMealFeedbackValue; label: string }> = [
  { value: 'ate_well', label: '잘 먹었어요' },
  { value: 'tasted', label: '조금 맛봤어요' },
  { value: 'touched', label: '만져봤어요' },
  { value: 'not_ready', label: '아직 어려워요' },
]

const NOTE_LABELS: Record<ChildMealFeedbackNoteCode, string> = {
  texture_was_hard: '식감이 어려웠어요',
  smell_was_new: '냄새가 낯설었어요',
  not_hungry_today: '오늘은 배가 안 고팠어요',
  try_again_later: '다음에 다시',
}

export default function ChildMealFeedback({ recipeId }: { recipeId: string }) {
  const { latestByRecipeId, saveFeedback, clearRecipeFeedback } = useChildMealFeedback()
  const latest = latestByRecipeId.get(recipeId)
  const [value, setValue] = useState<ChildMealFeedbackValue | null>(latest?.value ?? null)
  const [notes, setNotes] = useState<ChildMealFeedbackNoteCode[]>(
    (latest?.notes.filter((note): note is ChildMealFeedbackNoteCode =>
      CHILD_MEAL_FEEDBACK_NOTE_CODES.includes(note as ChildMealFeedbackNoteCode)) ?? []),
  )
  const [saved, setSaved] = useState(Boolean(latest))

  const toggleNote = (note: ChildMealFeedbackNoteCode) => {
    setSaved(false)
    setNotes((current) => (
      current.includes(note)
        ? current.filter((item) => item !== note)
        : [...current, note].slice(0, 4)
    ))
  }

  const save = () => {
    if (!value) return
    saveFeedback({ recipeId, value, notes })
    setSaved(true)
  }

  return (
    <section className="rounded-[18px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
      <h2 className="text-[17px] font-black text-[#2f2117]">오늘 아이가 어떻게 만났나요?</h2>
      <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#8f7f70]">
        많이 먹었는지 평가하지 않아요. 맛보고, 만지고, 냄새를 맡은 경험도 충분해요.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {VALUE_OPTIONS.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setValue(option.value)
                setSaved(false)
              }}
              aria-pressed={selected}
              className={`min-h-11 rounded-[12px] border px-2 text-[12px] font-black ${
                selected
                  ? 'border-[#78a95f] bg-[#eef6df] text-[#3d7b38]'
                  : 'border-[#eadcc9] bg-white text-[#6f5d4f]'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CHILD_MEAL_FEEDBACK_NOTE_CODES.map((note) => {
          const selected = notes.includes(note)
          return (
            <button
              key={note}
              type="button"
              onClick={() => toggleNote(note)}
              aria-pressed={selected}
              className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-[11px] font-bold ${
                selected
                  ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                  : 'border-[#eadcc9] bg-white text-[#6f5d4f]'
              }`}
            >
              {selected ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
              {NOTE_LABELS[note]}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!value}
          className="min-h-12 rounded-[13px] bg-[#ea5a1f] px-4 text-[13px] font-black text-white disabled:bg-[#e5c8b9]"
        >
          {saved ? '기록했어요' : '이 경험 기록하기'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearRecipeFeedback(recipeId)
            setValue(null)
            setNotes([])
            setSaved(false)
          }}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-[13px] border border-[#eadcc9] bg-white text-[#7d6d5f]"
          aria-label="이 레시피의 식사 경험 기록 초기화"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </section>
  )
}
