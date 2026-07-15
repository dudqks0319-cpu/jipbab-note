'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Heart, PackageCheck } from 'lucide-react'

import { useFamilyShare } from '@/hooks/useFamilyShare'
import { useFavorites } from '@/hooks/useFavorites'
import { useIngredients } from '@/hooks/useIngredients'
import { calculateRecipeCookDurationSeconds } from '@/lib/recipe-feedback'
import {
  RECIPE_FEEDBACK_REPEAT_INTENTS,
  RECIPE_FEEDBACK_TASTE_RESULTS,
} from '@/lib/recipe-feedback'
import type { RecipeCookFeedback } from '@/lib/recipe-cook-progress'
import { selectConsumableRecipeIngredients } from '@/lib/recipe-ingredient-consumption'
import type {
  RecipeDetailStep,
  RecipeIngredientDetail,
  RecipePublicationEvidence,
} from '@/types'

type CompletionScope = 'personal' | 'family'

type RecipeCookCompletionProps = {
  recipeId: string
  recipeName: string
  category: string
  thumbnailUrl: string | null
  publicationEvidence: RecipePublicationEvidence
  ingredientList: string[]
  ingredientDetails: RecipeIngredientDetail[]
  steps: RecipeDetailStep[]
  storageTip: string | null
  reheatTip: string | null
  startedAt: string | null
  completedAt: string | null
  feedback: RecipeCookFeedback | null
}

function formatElapsedTime(seconds: number | null): string {
  if (!seconds) return '완료 시각 기록 중'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes === 0) return `${remainder}초`
  return remainder === 0 ? `${minutes}분` : `${minutes}분 ${remainder}초`
}

export default function RecipeCookCompletion({
  recipeId,
  recipeName,
  category,
  thumbnailUrl,
  publicationEvidence,
  ingredientList,
  ingredientDetails,
  steps,
  storageTip,
  reheatTip,
  startedAt,
  completedAt,
  feedback,
}: RecipeCookCompletionProps) {
  const { group } = useFamilyShare()
  const [selectedScope, setSelectedScope] = useState<CompletionScope>(() => {
    if (typeof window === 'undefined') return 'personal'
    return new URLSearchParams(window.location.search).get('scope') === 'family'
      ? 'family'
      : 'personal'
  })
  const activeScope: CompletionScope = selectedScope === 'family' && group ? 'family' : 'personal'
  const familyGroupId = activeScope === 'family' ? group?.id ?? null : null
  const { ingredients, loading, error, consumeIngredient } = useIngredients({
    scope: activeScope,
    familyGroupId,
  })
  const { isFavorite, toggleFavorite } = useFavorites()
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set())
  const [consuming, setConsuming] = useState(false)
  const [actionStatus, setActionStatus] = useState('')
  const [actionError, setActionError] = useState('')
  const [favoriteStatus, setFavoriteStatus] = useState('')

  const matchedIngredients = useMemo(
    () => selectConsumableRecipeIngredients(ingredients, ingredientList),
    [ingredientList, ingredients],
  )
  const matchedIngredientKey = useMemo(
    () => matchedIngredients.map((ingredient) => ingredient.id).sort().join('\u001f'),
    [matchedIngredients],
  )
  const detailByName = useMemo(
    () => new Map(ingredientDetails.map((detail) => [detail.name.trim().toLowerCase(), detail])),
    [ingredientDetails],
  )

  useEffect(() => {
    setSelectedIngredientIds(new Set(
      matchedIngredientKey ? matchedIngredientKey.split('\u001f') : [],
    ))
  }, [activeScope, matchedIngredientKey])

  useEffect(() => {
    setActionStatus('')
    setActionError('')
  }, [activeScope])

  const durationSeconds = feedback?.actualDurationSeconds
    ?? calculateRecipeCookDurationSeconds(startedAt, completedAt)
  const difficultStep = feedback?.difficultStepOrder
    ? steps.find((step) => step.index === feedback.difficultStepOrder) ?? null
    : null
  const tasteLabel = RECIPE_FEEDBACK_TASTE_RESULTS.find(
    (result) => result.code === feedback?.tasteResult,
  )?.label ?? '아래 피드백에서 선택 가능'
  const repeatLabel = RECIPE_FEEDBACK_REPEAT_INTENTS.find(
    (intent) => intent.code === feedback?.repeatIntent,
  )?.label ?? '아래 피드백에서 선택 가능'
  const favorite = isFavorite(recipeId)

  const toggleIngredient = (ingredientId: string) => {
    setSelectedIngredientIds((current) => {
      const next = new Set(current)
      if (next.has(ingredientId)) next.delete(ingredientId)
      else next.add(ingredientId)
      return next
    })
    setActionStatus('')
    setActionError('')
  }

  const consumeSelectedIngredients = async () => {
    const selected = matchedIngredients.filter((ingredient) => selectedIngredientIds.has(ingredient.id))
    if (selected.length === 0) {
      setActionStatus('소진 처리할 재료를 선택해 주세요.')
      setActionError('')
      return
    }

    setConsuming(true)
    setActionStatus('')
    setActionError('')
    try {
      const results = await Promise.all(
        selected.map((ingredient) => consumeIngredient(ingredient.id, recipeName).catch(() => null)),
      )
      const consumedCount = results.filter(Boolean).length
      if (consumedCount === 0) {
        setActionError('재료를 소진 처리하지 못했습니다. 냉장고 상태를 확인해 주세요.')
      } else {
        setActionStatus(`${consumedCount}개 재료를 소진 기록에 남겼어요.`)
        if (consumedCount < selected.length) {
          setActionError('일부 재료는 이미 상태가 바뀌어 처리하지 않았습니다.')
        }
      }
    } finally {
      setConsuming(false)
    }
  }

  const toggleRecipeFavorite = () => {
    const nextFavorite = toggleFavorite({
      id: recipeId,
      name: recipeName,
      category,
      thumbnailUrl,
      publicationEvidence,
    })
    setFavoriteStatus(nextFavorite ? '즐겨찾기에 저장했어요.' : '즐겨찾기에서 뺐어요.')
  }

  return (
    <div className="mt-4 overflow-hidden rounded-[18px] border border-[#dcebd2] bg-[#f4fbef]">
      <div className="bg-[#315f2d] px-4 py-5 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <Check size={22} strokeWidth={3} />
        </div>
        <h3 className="mt-3 text-[22px] font-black">요리를 완성했어요</h3>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-white/80">
          결과를 기록하고 냉장고 재료까지 정리해 보세요.
        </p>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white px-3 py-3">
            <p className="flex items-center gap-1 text-[11px] font-black text-[#6b8066]"><Clock3 size={13} /> 실제 걸린 시간</p>
            <p className="mt-1 text-[14px] font-black text-[#315f2d]">{formatElapsedTime(durationSeconds)}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-3">
            <p className="text-[11px] font-black text-[#6b8066]">어려웠던 단계</p>
            <p className="mt-1 break-keep text-[13px] font-black leading-5 text-[#315f2d]">
              {difficultStep
                ? `${difficultStep.index}단계${difficultStep.title ? ` · ${difficultStep.title}` : ''}`
                : '아래 피드백에서 선택 가능'}
            </p>
          </div>
          <div className="rounded-xl bg-white px-3 py-3">
            <p className="text-[11px] font-black text-[#6b8066]">맛 결과</p>
            <p className="mt-1 break-keep text-[13px] font-black leading-5 text-[#315f2d]">{tasteLabel}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-3">
            <p className="text-[11px] font-black text-[#6b8066]">다시 만들 의향</p>
            <p className="mt-1 break-keep text-[13px] font-black leading-5 text-[#315f2d]">{repeatLabel}</p>
          </div>
        </div>

        <div className="rounded-[14px] bg-white px-3 py-3">
          <h4 className="text-[14px] font-black text-[#315f2d]">남은 음식 보관 방법</h4>
          <p className="mt-2 break-keep text-[12px] font-semibold leading-5 text-[#557b4f]">
            보관: {storageTip || '등록된 보관 안내가 없습니다.'}
          </p>
          <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#557b4f]">
            다시 데우기: {reheatTip || '등록된 재가열 안내가 없습니다.'}
          </p>
        </div>

        <div className="rounded-[14px] border border-[#d7e7cf] bg-white px-3 py-3">
          <div className="flex items-start gap-2">
            <PackageCheck size={17} className="mt-0.5 shrink-0 text-[#315f2d]" />
            <div>
              <h4 className="text-[14px] font-black text-[#315f2d]">사용한 냉장고 재료 차감</h4>
              <p className="mt-1 break-keep text-[11px] font-semibold leading-5 text-[#6b8066]">
                실제로 다 쓴 재료만 선택하세요. 삭제하지 않고 소진 기록에 남기며 냉장고에서 되돌릴 수 있어요.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#f4fbef] p-1">
            <button
              type="button"
              onClick={() => setSelectedScope('personal')}
              className={`min-h-11 rounded-[10px] text-[12px] font-black ${
                activeScope === 'personal' ? 'bg-[#315f2d] text-white' : 'text-[#557b4f]'
              }`}
            >
              내 냉장고
            </button>
            <button
              type="button"
              onClick={() => setSelectedScope('family')}
              disabled={!group}
              className={`min-h-11 rounded-[10px] text-[12px] font-black ${
                activeScope === 'family'
                  ? 'bg-[#315f2d] text-white'
                  : 'text-[#557b4f] disabled:text-[#b9c8b5]'
              }`}
            >
              가족 냉장고
            </button>
          </div>

          {loading && matchedIngredients.length === 0 ? (
            <p className="mt-3 text-[12px] font-semibold text-[#6b8066]">냉장고 재료를 확인하고 있어요.</p>
          ) : matchedIngredients.length === 0 ? (
            <p className="mt-3 rounded-xl bg-[#f7f7f4] px-3 py-3 text-[12px] font-semibold leading-5 text-[#6b8066]">
              이 레시피와 일치하는 보관 중 재료가 없습니다.
            </p>
          ) : (
            <div className="mt-3 grid gap-2" aria-label="소진할 냉장고 재료">
              {matchedIngredients.map((ingredient) => {
                const checked = selectedIngredientIds.has(ingredient.id)
                const detail = detailByName.get(ingredient.name.trim().toLowerCase())
                return (
                  <button
                    key={ingredient.id}
                    type="button"
                    onClick={() => toggleIngredient(ingredient.id)}
                    aria-pressed={checked}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left ${
                      checked
                        ? 'border-[#315f2d] bg-[#eef7e9] text-[#315f2d]'
                        : 'border-[#e1e7dd] bg-white text-[#6b8066]'
                    }`}
                  >
                    <span className="min-w-0 text-[13px] font-black">
                      {ingredient.name}
                      {detail?.display ? <span className="ml-1 text-[11px] font-semibold">{detail.display}</span> : null}
                    </span>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      checked ? 'border-[#315f2d] bg-[#315f2d] text-white' : 'border-[#b9c8b5]'
                    }`}>
                      {checked ? <Check size={14} /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => void consumeSelectedIngredients()}
            disabled={consuming || selectedIngredientIds.size === 0}
            className="mt-3 min-h-12 w-full rounded-xl bg-[#315f2d] px-4 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {consuming ? '소진 기록 중…' : `선택한 ${selectedIngredientIds.size}개 소진 처리`}
          </button>
          <p className="mt-2 min-h-5 text-[12px] font-semibold leading-5 text-[#557b4f]" aria-live="polite">
            {actionError || error?.message || actionStatus}
          </p>
        </div>

        <button
          type="button"
          onClick={toggleRecipeFavorite}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d7e7cf] bg-white px-4 text-[13px] font-black text-[#315f2d]"
          aria-pressed={favorite}
        >
          <Heart size={17} className={favorite ? 'fill-[#ea5a1f] text-[#a63b13]' : ''} />
          {favorite ? '즐겨찾기에 저장됨' : '이 레시피 즐겨찾기'}
        </button>
        <p className="min-h-5 text-center text-[12px] font-semibold text-[#557b4f]" aria-live="polite">
          {favoriteStatus}
        </p>
      </div>
    </div>
  )
}
