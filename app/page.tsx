// 이 파일은 홈 화면을 담당하며 실데이터 대시보드와 빠른 액션을 보여줍니다.
'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'

import { useFavorites } from '@/hooks/useFavorites'
import { useIngredients } from '@/hooks/useIngredients'
import { useRecipeCatalog } from '@/hooks/useRecipes'
import { useShopping } from '@/hooks/useShopping'
import { calculateRecipeIngredientMatch } from '@/lib/matching'
import { getCategoryEmoji, getDday, getStatusBg } from '@/lib/utils'

const RECOMMENDATION_CARD_BACKGROUNDS = [
  'from-orange-100 to-rose-50',
  'from-amber-100 to-yellow-50',
  'from-yellow-100 to-cream-100',
  'from-lavender-100 to-rose-50',
] as const

const EMPTY_CARD_TONE = 'bg-white text-gray-700'

export default function HomePage() {
  const { ingredients, loading: ingredientsLoading } = useIngredients()
  const { recipes: recipeCatalog, loading: recipesLoading, error: recipesError } = useRecipeCatalog(12)
  const { uncheckedCount, source: shoppingSource, error: shoppingError } = useShopping()
  const { isFavorite, toggleFavorite } = useFavorites()
  const ingredientNames = useMemo(() => ingredients.map((item) => item.name), [ingredients])

  const expiringIngredients = useMemo(() => {
    return ingredients
      .filter((item) => item.expiryDate)
      .map((item) => ({
        ...item,
        dday: getDday(item.expiryDate),
      }))
      .filter((item) => item.dday <= 7)
      .sort((left, right) => left.dday - right.dday)
      .slice(0, 4)
  }, [ingredients])

  const highlightStats = useMemo(() => {
    const expiringCount = ingredients.filter((item) => getDday(item.expiryDate) <= 3).length
    const recommendationCount = recipeCatalog.filter((recipe) => {
      return calculateRecipeIngredientMatch(ingredientNames, recipe.ingredients).matchRate > 0
    }).length

    return [
      { label: '보유 재료', value: `${ingredients.length}개`, tone: EMPTY_CARD_TONE },
      {
        label: '임박 재료',
        value: `${expiringCount}개`,
        tone: expiringCount > 0 ? 'bg-rose-100 text-rose-500' : EMPTY_CARD_TONE,
      },
      {
        label: '장보기',
        value: `${uncheckedCount}개`,
        tone: uncheckedCount > 0 ? 'bg-peach-100 text-peach-500' : EMPTY_CARD_TONE,
      },
      {
        label: '추천 메뉴',
        value: `${recommendationCount}개`,
        tone: recommendationCount > 0 ? 'bg-mint-100 text-mint-500' : EMPTY_CARD_TONE,
      },
    ]
  }, [ingredientNames, ingredients, recipeCatalog, uncheckedCount])

  const recommendedRecipes = useMemo(() => {
    return recipeCatalog
      .map((recipe) => {
        const match = calculateRecipeIngredientMatch(ingredientNames, recipe.ingredients)
        return {
          ...recipe,
          ...match,
        }
      })
      .sort((left, right) => {
        if (right.matchRate !== left.matchRate) {
          return right.matchRate - left.matchRate
        }
        return left.missingIngredients.length - right.missingIngredients.length
      })
      .slice(0, 4)
      .map((recipe, index) => ({
        ...recipe,
        bgColor: RECOMMENDATION_CARD_BACKGROUNDS[index] ?? 'from-mint-100 to-white',
      }))
  }, [ingredientNames, recipeCatalog])

  return (
    <div className="flex flex-col pb-4">
      <section className="px-5 pt-2">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint-200 via-cream-100 to-lavender-100 p-5 shadow-card">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/35 blur-2xl" />
          <div className="absolute -left-8 bottom-2 h-24 w-24 rounded-full bg-white/35 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.16em] text-mint-500/75">TODAY&apos;S KITCHEN</p>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-mint-500">
              {ingredientsLoading ? '동기화 중' : '실데이터 대시보드'}
            </span>
          </div>

          <h2 className="relative mt-2 text-[1.55rem] font-bold leading-snug text-gray-800">
            냉장고 재료로
            <br />
            오늘의 집밥을 바로 찾으세요
          </h2>
          <p className="relative mt-2 text-sm text-gray-600">
            유통기한 임박 재료를 먼저 쓰고, 부족한 재료는 장보기로 바로 넘기세요.
          </p>

          <Link
            href="/recipe"
            className="relative mt-4 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-soft"
          >
            <Search size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">레시피를 검색하거나 추천을 받아보세요</span>
          </Link>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            {highlightStats.map((item) => (
              <div key={item.label} className={`rounded-2xl px-3 py-2.5 shadow-soft ${item.tone}`}>
                <p className="text-[11px] font-medium text-gray-500">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

        {ingredientsLoading ? (
          <div className="mt-3 rounded-2xl bg-white px-4 py-6 text-center text-sm text-gray-400 shadow-soft">
            냉장고 상태를 불러오는 중...
          </div>
        ) : expiringIngredients.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white px-4 py-6 text-center shadow-soft">
            <p className="text-sm font-semibold text-gray-700">유통기한 임박 재료가 없어요.</p>
            <p className="mt-1 text-xs text-gray-400">지금은 비교적 여유롭게 집밥을 준비할 수 있어요.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {expiringIngredients.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getCategoryEmoji(item.category)}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity ?? '수량 미기입'}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusBg(item.dday)}`}>
                  {item.dday < 0 ? `${Math.abs(item.dday)}일 지남` : `D-${item.dday}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

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

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Link href="/fridge" className="rounded-2xl border border-mint-100 bg-mint-50 px-3 py-3">
              <p className="text-xs font-semibold text-mint-500">냉장고 정리</p>
              <p className="mt-1 text-sm font-bold text-gray-800">임박 재료 먼저 보기</p>
            </Link>
            <Link href="/recipe" className="rounded-2xl border border-peach-100 bg-peach-50 px-3 py-3">
              <p className="text-xs font-semibold text-peach-500">맞춤 추천</p>
              <p className="mt-1 text-sm font-bold text-gray-800">부족 재료 확인하기</p>
            </Link>
            <Link href="/shopping" className="rounded-2xl border border-lavender-100 bg-lavender-50 px-3 py-3">
              <p className="text-xs font-semibold text-violet-500">장보기 연결</p>
              <p className="mt-1 text-sm font-bold text-gray-800">남은 목록 {uncheckedCount}개</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="rounded-3xl bg-white px-4 py-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-peach-500" />
              <h3 className="text-lg font-bold text-gray-800">장보기 현황</h3>
            </div>
            <Link href="/shopping" className="flex items-center gap-1 text-xs font-semibold text-gray-500">
              전체 보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mt-3 rounded-2xl border border-peach-100 bg-peach-50 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">
              {uncheckedCount > 0 ? `${uncheckedCount}개 항목이 남아 있어요.` : '장보기 목록이 비어 있어요.'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {shoppingSource === 'supabase'
                ? '장보기 목록이 계정/디바이스 기준으로 동기화되고 있습니다.'
                : '장보기 목록이 이 기기 로컬 저장으로 동작 중입니다.'}
            </p>
            {shoppingError ? (
              <p className="mt-2 text-xs text-rose-500">{shoppingError.message}</p>
            ) : null}
          </div>
        </div>
      </section>

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

        {recipesLoading ? (
          <div className="mt-3 rounded-2xl bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-soft">
            추천 레시피를 계산하는 중...
          </div>
        ) : recipesError ? (
          <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-6 text-sm text-rose-500">
            {recipesError}
          </div>
        ) : recommendedRecipes.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white px-4 py-8 text-center shadow-soft">
            <AlertTriangle size={22} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-700">추천 가능한 레시피가 아직 부족해요.</p>
            <p className="mt-1 text-xs text-gray-400">재료를 추가하거나 검색 조건을 넓혀서 추천 정확도를 높여보세요.</p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {recommendedRecipes.map((recipe) => (
              <article
                key={recipe.id}
                className="overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
              >
                <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${recipe.bgColor}`}>
                  <span className="text-6xl">🍲</span>
                  <button
                    type="button"
                    aria-label={`${recipe.name} 즐겨찾기`}
                    onClick={() =>
                      toggleFavorite({
                        id: recipe.id,
                        name: recipe.name,
                        category: recipe.category,
                        thumbnailUrl: recipe.thumbnailUrl,
                      })
                    }
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm"
                  >
                    <Heart size={16} className={isFavorite(recipe.id) ? 'fill-rose-400 text-rose-400' : 'text-rose-400'} />
                  </button>

                  <span className="absolute left-3 top-3 rounded-full bg-mint-200 px-2.5 py-1 text-[10px] font-bold text-mint-500">
                    {recipe.category}
                  </span>

                  <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 shadow-sm">
                    <span className="text-xs font-bold text-mint-500">{recipe.matchRate}% 일치</span>
                  </div>
                </div>

                <Link href={`/recipe/${recipe.id}`} className="block p-3">
                  <h4 className="line-clamp-1 font-bold text-gray-800">{recipe.name}</h4>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                    <Clock3 size={12} />
                    <span className="line-clamp-1">{recipe.method}</span>
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-peach-400">
                    <Flame size={11} />
                    부족 {recipe.missingIngredients.length}개
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
