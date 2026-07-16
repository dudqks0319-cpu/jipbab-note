// 이 파일은 한 주 식단 계획 화면을 담당합니다.
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronLeft, CloudOff, LoaderCircle, RotateCcw, ShoppingBasket, Sparkles } from 'lucide-react'

import { useAppSettings } from '@/hooks/useAppSettings'
import { useMealPlan } from '@/hooks/useMealPlan'
import { useRecipes } from '@/hooks/useRecipes'
import { useShopping } from '@/hooks/useShopping'
import { getWeekDates, MEAL_TYPES, type MealEntryKind, type MealType } from '@/lib/meal-plan'
import { RECIPE_ALLERGEN_OPTIONS } from '@/lib/recipe-allergens'

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const

function normalizeFoodText(value: string): string {
  return value.toLowerCase().replace(/[·&/,\s]/g, '')
}

export default function MealPlanPage() {
  const { settings } = useAppSettings()
  const { recipes, loading } = useRecipes(7, { excludedAllergenIds: settings.allergenIds })
  const { weekStart, items, syncState, message: syncMessage, saveItems, syncNow, useRemotePlan, keepLocalPlan } = useMealPlan()
  const { addItems } = useShopping()
  const [rouletteIndex, setRouletteIndex] = useState(0)
  const [shoppingMessage, setShoppingMessage] = useState('')
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  const filteredRecipes = useMemo(() => {
    const dislikedTokens = [
      settings.dislikedIngredients,
    ]
      .join(',')
      .split(/[,，\s]+/g)
      .map((item) => normalizeFoodText(item))
      .filter(Boolean)
    const craving = normalizeFoodText(settings.cravingKeyword)
    const excluded = new Set(settings.excludedCategories.map(normalizeFoodText))

    const base = recipes.filter((recipe) => {
      const category = normalizeFoodText(recipe.category)
      const haystack = normalizeFoodText(`${recipe.name} ${recipe.category} ${recipe.ingredients}`)
      if (excluded.has(category)) return false
      return !dislikedTokens.some((token) => token && haystack.includes(token))
    })

    if (!craving) return base
    return [...base].sort((left, right) => {
      const leftHit = normalizeFoodText(`${left.name} ${left.category} ${left.ingredients}`).includes(craving)
      const rightHit = normalizeFoodText(`${right.name} ${right.category} ${right.ingredients}`).includes(craving)
      return Number(rightHit) - Number(leftHit)
    })
  }, [recipes, settings.cravingKeyword, settings.dislikedIngredients, settings.excludedCategories])

  const selectedAllergenLabels = settings.allergenIds.map(
    (allergenId) => RECIPE_ALLERGEN_OPTIONS.find((option) => option.id === allergenId)?.label ?? allergenId,
  )

  const rouletteRecipe = filteredRecipes.length > 0
    ? filteredRecipes[rouletteIndex % filteredRecipes.length]
    : null

  const spinRoulette = () => {
    if (filteredRecipes.length === 0) return
    setRouletteIndex((prev) => prev + Math.floor(Math.random() * filteredRecipes.length) + 1)
  }

  const setMealSlot = (date: string, mealType: MealType, value: string) => {
    const next = items.filter((item) => item.date !== date || item.mealType !== mealType)
    if (value.startsWith('recipe:')) {
      const recipeId = value.slice('recipe:'.length)
      const recipe = filteredRecipes.find((candidate) => candidate.id === recipeId)
      if (recipe) next.push({ date, mealType, kind: 'recipe', recipeId, title: recipe.name, servings: settings.servingSize })
    } else if (value.startsWith('kind:')) {
      const kind = value.slice('kind:'.length) as Exclude<MealEntryKind, 'recipe'>
      const titles: Record<Exclude<MealEntryKind, 'recipe'>, string> = {
        leftovers: '남은 음식',
        dining_out: '외식',
        delivery: '배달',
        custom: '직접 입력 메뉴',
      }
      if (titles[kind]) next.push({ date, mealType, kind, recipeId: null, title: titles[kind], servings: settings.servingSize })
    }
    void saveItems(next)
  }

  const fillRecommendedDinners = () => {
    const next = items.filter((item) => item.mealType !== 'dinner')
    weekDates.forEach((date, index) => {
      const recipe = filteredRecipes[index % Math.max(filteredRecipes.length, 1)]
      if (recipe) next.push({ date, mealType: 'dinner', kind: 'recipe', recipeId: recipe.id, title: recipe.name, servings: settings.servingSize })
    })
    void saveItems(next)
  }

  const addWeeklyMissingIngredients = async () => {
    const selected = items.flatMap((item) => item.recipeId
      ? filteredRecipes.filter((recipe) => recipe.id === item.recipeId)
      : [])
    const drafts = selected.flatMap((recipe) => recipe.missingIngredients.map((name) => ({
      name,
      quantity: null,
      category: null,
      sourceRecipeId: recipe.id,
      sourceRecipeName: recipe.name,
    })))
    if (drafts.length === 0) {
      setShoppingMessage('식단에서 장보기에 추가할 부족 재료가 없습니다.')
      return
    }
    const result = await addItems(drafts, { mergeDuplicates: true })
    setShoppingMessage(`부족 재료 ${result.addedCount}개 추가 · 중복 ${result.mergedCount}개 합침`)
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]" aria-label="홈으로 돌아가기">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-center text-[16px] font-black text-[#2f2117]">주간 식단</h1>
          <span />
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel rounded-[18px] px-4 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-[#ea5a1f]" />
            <h2 className="text-[17px] font-black text-[#2f2117]">{settings.servingSize}인 기준 추천</h2>
          </div>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#7d6d5f]">
            {settings.allergenIds.length > 0 || settings.dislikedIngredients || settings.excludedCategories.length > 0
              ? `제외 기준: ${[...selectedAllergenLabels, settings.dislikedIngredients, ...settings.excludedCategories].filter(Boolean).join(' · ')}`
              : '취향과 알레르기를 설정하면 더 정확한 계획으로 다듬을 수 있어요.'}
          </p>
          {settings.allergyNotes ? (
            <p className="mt-2 text-[11px] font-semibold leading-5 text-[#8f7f70]">
              추가 주의 메모: {settings.allergyNotes} · 이 메모는 자동 필터가 아니므로 직접 확인해 주세요.
            </p>
          ) : null}
          {settings.cravingKeyword ? (
            <p className="mt-2 rounded-full bg-[#fff0e4] px-3 py-1.5 text-[12px] font-black text-[#d94d19]">
              오늘 땡김: {settings.cravingKeyword}
            </p>
          ) : null}
          <div className={`mt-3 inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-[11px] font-black ${syncState === 'synced' ? 'bg-[#eef8e9] text-[#315f2d]' : syncState === 'failed' || syncState === 'conflict' ? 'bg-[#fff0ed] text-[#b42318]' : 'bg-[#f1eee9] text-[#6f655b]'}`}>
            {syncState === 'synced' ? <CheckCircle2 size={13} /> : syncState === 'syncing' || syncState === 'loading' ? <LoaderCircle size={13} className="animate-spin" /> : <CloudOff size={13} />}
            {syncState === 'synced' ? '계정과 동기화됨' : syncState === 'syncing' || syncState === 'loading' ? '동기화 중' : syncState === 'failed' ? '동기화 실패 · 기기에 저장' : syncState === 'conflict' ? '식단 충돌 · 선택 필요' : '이 기기에만 저장됨'}
          </div>
          {syncMessage ? <p className="mt-2 text-[11px] font-bold leading-5 text-[#7d6d5f]">{syncMessage}</p> : null}
          {syncState === 'conflict' ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={useRemotePlan} className="min-h-11 rounded-full border border-[#eadcc9] px-3 text-[11px] font-black text-[#4b3929]">계정 식단 사용</button>
              <button type="button" onClick={() => { void keepLocalPlan() }} className="min-h-11 rounded-full bg-[#2f2117] px-3 text-[11px] font-black text-white">기기 식단 유지</button>
            </div>
          ) : syncState !== 'synced' ? <button type="button" onClick={() => { void syncNow() }} className="mt-2 min-h-11 rounded-full border border-[#eadcc9] px-4 text-[11px] font-black text-[#4b3929]">로그인 상태로 동기화 다시 시도</button> : null}
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel rounded-[18px] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-[#ea5a1f]" />
                <h2 className="text-[15px] font-black text-[#2f2117]">오늘 메뉴 룰렛</h2>
              </div>
              <p className="mt-1 truncate text-[18px] font-black text-[#d94d19]">
                {rouletteRecipe?.name ?? '추천 가능한 메뉴 없음'}
              </p>
            </div>
            <button
              type="button"
              onClick={spinRoulette}
              className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-[#2f2117] px-4 text-[13px] font-black text-white"
            >
              <RotateCcw size={15} />
              돌리기
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 pt-4">
        <button type="button" onClick={fillRecommendedDinners} disabled={filteredRecipes.length === 0} className="mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#2f2117] text-sm font-black text-white disabled:opacity-50">
          <Sparkles size={16} /> 추천 메뉴로 저녁 7일 채우기
        </button>
        {loading ? (
          <div className="jipbab-panel rounded-[16px] px-4 py-10 text-center text-sm font-bold text-[#8f7f70]">
            추천 식단을 불러오는 중...
          </div>
        ) : (
          <div className="space-y-2.5">
            {WEEK_DAYS.map((day, index) => {
              const date = weekDates[index] ?? weekStart
              return (
                <article key={day} className="jipbab-panel rounded-[16px] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[15px] font-black text-[#2f2117]">{day}요일</h3>
                    <span className="text-[11px] font-bold text-[#8f7f70]">{date.slice(5).replace('-', '/')}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {MEAL_TYPES.map((meal) => {
                      const item = items.find((candidate) => candidate.date === date && candidate.mealType === meal.id)
                      const value = item ? item.kind === 'recipe' ? `recipe:${item.recipeId}` : `kind:${item.kind}` : ''
                      return (
                        <div key={meal.id} className="grid grid-cols-[44px_1fr] items-center gap-2">
                          <span className="text-[11px] font-black text-[#7d6d5f]">{meal.label}</span>
                          <select value={value} onChange={(event) => setMealSlot(date, meal.id, event.target.value)} className="min-h-11 rounded-xl border border-[#eadcc9] bg-[#fffaf3] px-3 text-[12px] font-bold text-[#4b3929]">
                            <option value="">비워 두기</option>
                            {filteredRecipes.map((recipe) => <option key={recipe.id} value={`recipe:${recipe.id}`}>{recipe.name}</option>)}
                            <option value="kind:leftovers">남은 음식</option>
                            <option value="kind:dining_out">외식</option>
                            <option value="kind:delivery">배달</option>
                            <option value="kind:custom">직접 입력 메뉴</option>
                          </select>
                          {item?.recipeId ? <Link href={`/recipe/${item.recipeId}`} className="col-start-2 inline-flex min-h-11 items-center text-[11px] font-black text-[#d94d19]">{item.title} 레시피 보기</Link> : null}
                        </div>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="px-5 pt-4">
        <button type="button" onClick={() => { void addWeeklyMissingIngredients() }} className="mb-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#ea5a1f] bg-[#fffaf3] text-sm font-black text-[#d94d19]">
          <ShoppingBasket size={16} /> 식단 부족 재료 장보기에 합치기
        </button>
        <Link href="/shopping" className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] text-sm font-black text-white">
          <ShoppingBasket size={16} />
          이번 주 장보기 확인
        </Link>
        {shoppingMessage ? <p className="mt-2 text-center text-[11px] font-bold text-[#7d6d5f]">{shoppingMessage}</p> : null}
      </section>
    </div>
  )
}
