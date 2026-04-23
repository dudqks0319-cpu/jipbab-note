// 이 파일은 홈 화면을 담당합니다 - 따뜻한 파스텔 스타일
'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Search, Clock3, ChevronRight, Sparkles, Plus, Flame, Heart } from 'lucide-react'

import { useIngredients } from '@/hooks/useIngredients'
import { calculateRecipeIngredientMatch } from '@/lib/matching'
import { SAMPLE_RECIPES } from '@/lib/sample-recipes'
import { getCategoryEmoji, getDday } from '@/lib/utils'

const recipeCardTones = [
  'from-orange-100 to-rose-50',
  'from-amber-100 to-yellow-50',
  'from-yellow-100 to-cream-100',
  'from-lavender-100 to-rose-50',
]

const recipeFallbackEmoji: Record<string, string> = {
  한식: '🍲',
  반찬: '🥚',
  양식: '🍝',
  밥: '🍚',
  '국·찌개': '🥘',
  샐러드: '🥗',
}

export default function HomePage() {
  const { ingredients } = useIngredients()

  const expiringIngredients = useMemo(() => {
    return ingredients
      .filter((ingredient) => ingredient.expiryDate)
      .map((ingredient) => ({
        ...ingredient,
        dday: getDday(ingredient.expiryDate),
      }))
      .sort((left, right) => left.dday - right.dday)
      .slice(0, 3)
  }, [ingredients])

  const urgentIngredientCount = useMemo(() => {
    return ingredients.filter((ingredient) => {
      const dday = getDday(ingredient.expiryDate)
      return dday <= 3
    }).length
  }, [ingredients])

  const recommendedRecipes = useMemo(() => {
    const ingredientNames = ingredients.map((ingredient) => ingredient.name)
    return SAMPLE_RECIPES.map((recipe, index) => {
      const match = calculateRecipeIngredientMatch(ingredientNames, recipe.ingredients)
      return {
        ...recipe,
        ...match,
        bgColor: recipeCardTones[index % recipeCardTones.length],
        emoji: recipeFallbackEmoji[recipe.category] ?? '🍽️',
      }
    })
      .sort((left, right) => right.matchRate - left.matchRate)
      .slice(0, 4)
  }, [ingredients])

  const highlightStats = [
    { label: '보유 재료', value: `${ingredients.length}개`, tone: 'bg-white text-gray-700' },
    { label: '임박 재료', value: `${urgentIngredientCount}개`, tone: 'bg-rose-100 text-rose-500' },
    { label: '추천 메뉴', value: `${recommendedRecipes.length}개`, tone: 'bg-mint-100 text-mint-500' },
  ]

  const monthLabel = `${new Date().getMonth() + 1}월 식재료 점검`

  return (
    <div className="flex flex-col pb-4">
      {/* 핵심 상태를 요약하는 히어로 카드 */}
      <section className="px-5 pt-2">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint-200 via-cream-100 to-lavender-100 p-5 shadow-card">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/35 blur-2xl" />
          <div className="absolute -left-8 bottom-2 h-24 w-24 rounded-full bg-white/35 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.16em] text-mint-500/75">TODAY&apos;S KITCHEN</p>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-mint-500">{monthLabel}</span>
          </div>

          <h2 className="relative mt-2 text-[1.55rem] font-bold leading-snug text-gray-800">
            냉장고 재료로
            <br />
            오늘의 집밥을 바로 찾으세요
          </h2>
          <p className="relative mt-2 text-sm text-gray-600">유통기한 임박 재료를 먼저 쓰고, 부족한 재료만 빠르게 장보세요.</p>

          <Link
            href="/recipe"
            className="relative mt-4 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-soft"
          >
            <Search size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">레시피를 검색하거나 추천을 받아보세요</span>
          </Link>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {highlightStats.map((item) => (
              <div key={item.label} className={`rounded-2xl px-3 py-2.5 shadow-soft ${item.tone}`}>
                <p className="text-[11px] font-medium text-gray-500">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 임박 재료 섹션 */}
      <section className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">EXPIRY ALERT</p>
            <h3 className="text-lg font-bold text-gray-800">오늘 먼저 써야 할 재료</h3>
          </div>
          <Link href="/fridge" className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            냉장고 열기 <ChevronRight size={14} />
          </Link>
        </div>
        <div className="mt-3 space-y-2.5">
          {expiringIngredients.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-4 text-sm font-semibold text-gray-500 shadow-soft">
              먼저 쓸 재료가 아직 없습니다.
            </div>
          ) : (
            expiringIngredients.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getCategoryEmoji(item.category)}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity || item.storageType}</p>
                  </div>
                </div>
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-500">
                  {item.dday < 0 ? `D+${Math.abs(item.dday)}` : `D-${item.dday}`}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 빠른 액션 */}
      <section className="px-5 pt-5">
        <div className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-gray-400">QUICK ACTION</p>
              <h3 className="text-lg font-bold text-gray-800">지금 필요한 작업</h3>
            </div>
            <Link
              href="/fridge"
              className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-3 py-1.5 text-xs font-bold text-mint-500"
            >
              <Plus size={12} />
              재료 추가
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/fridge" className="rounded-2xl border border-mint-100 bg-mint-50 px-3 py-3">
              <p className="text-xs font-semibold text-mint-500">냉장고 정리</p>
              <p className="mt-1 text-sm font-bold text-gray-800">임박 재료 먼저 보기</p>
            </Link>
            <Link href="/recipe" className="rounded-2xl border border-peach-100 bg-peach-50 px-3 py-3">
              <p className="text-xs font-semibold text-peach-500">맞춤 추천</p>
              <p className="mt-1 text-sm font-bold text-gray-800">부족 재료 확인하기</p>
            </Link>
            <Link href="/shopping" className="rounded-2xl border border-gray-100 bg-white px-3 py-3">
              <p className="text-xs font-semibold text-gray-500">장보기</p>
              <p className="mt-1 text-sm font-bold text-gray-800">사고 바로 담기</p>
            </Link>
          </div>
        </div>
      </section>

      {/* 추천 레시피 */}
      <section className="px-5 pb-6 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-mint-500" />
            <h3 className="text-lg font-bold text-gray-800">오늘의 추천 레시피</h3>
          </div>
          <Link href="/recipe" className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            전체 보기 <ChevronRight size={14} />
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {recommendedRecipes.map((recipe) => (
            <article
              key={recipe.id}
              className="overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
            >
              <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${recipe.bgColor}`}>
                <span className="text-6xl">{recipe.emoji}</span>

                <button
                  aria-label={`${recipe.name} 즐겨찾기`}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm"
                >
                  <Heart size={16} className="text-rose-400" />
                </button>

                <span className="absolute left-3 top-3 rounded-full bg-mint-200 px-2.5 py-1 text-[10px] font-bold text-mint-500">
                  {recipe.category}
                </span>

                <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 shadow-sm">
                  <span className="text-xs font-bold text-mint-500">{recipe.matchRate}% 일치</span>
                </div>
              </div>

              <Link href={`/recipe/${recipe.id}`} className="block p-3">
                <h4 className="font-bold text-gray-800">{recipe.name}</h4>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock3 size={12} />
                    <span>{recipe.method}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-peach-400">
                    <Flame size={11} />
                    부족 {recipe.missingIngredients.length}개
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
