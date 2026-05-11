// 이 파일은 홈 화면을 담당합니다 - 초보자 상황 선택형 추천 중심
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronRight, Clock3, Flame, Heart, Plus, Sparkles } from 'lucide-react'

import {
  BEGINNER_SITUATIONS,
  type BeginnerSituationId,
  getBeginnerRecipeProfile,
  getBeginnerSituation,
  getSituationRecipeScore,
} from '@/lib/beginner-recommendations'
import { useFavorites } from '@/hooks/useFavorites'
import { useIngredients } from '@/hooks/useIngredients'
import { calculateRecipeIngredientMatch } from '@/lib/matching'
import { SAMPLE_RECIPES } from '@/lib/sample-recipes'
import { getCategoryEmoji, getDday } from '@/lib/utils'

const recipeFallbackEmoji: Record<string, string> = {
  한식: '🍲',
  반찬: '🥚',
  양식: '🍝',
  밥: '🍚',
  '국·찌개': '🥘',
  샐러드: '🥗',
  중식: '🍅',
  일식: '🍜',
  분식: '🌶️',
  디저트: '🥞',
  면요리: '🍜',
  기타: '🍙',
}

export default function HomePage() {
  const { ingredients } = useIngredients()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [selectedSituationId, setSelectedSituationId] = useState<BeginnerSituationId>('quick')

  const selectedSituation = getBeginnerSituation(selectedSituationId)

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

    return SAMPLE_RECIPES.map((recipe) => {
      const match = calculateRecipeIngredientMatch(ingredientNames, recipe.ingredients)
      const beginnerProfile = getBeginnerRecipeProfile(recipe)
      const situationScore = getSituationRecipeScore(recipe, selectedSituationId, match.matchRate)

      return {
        ...recipe,
        ...match,
        beginnerProfile,
        situationScore,
        emoji: recipeFallbackEmoji[recipe.category] ?? '🍽️',
      }
    })
      .sort((left, right) => {
        if (right.situationScore !== left.situationScore) {
          return right.situationScore - left.situationScore
        }
        return right.matchRate - left.matchRate
      })
      .slice(0, 4)
  }, [ingredients, selectedSituationId])

  const ingredientProgress = Math.min(ingredients.length, 3)
  const needsMoreIngredients = ingredients.length < 3
  const progressWidthClass =
    ingredientProgress >= 3 ? 'w-full' : ingredientProgress === 2 ? 'w-2/3' : ingredientProgress === 1 ? 'w-1/3' : 'w-0'

  const highlightStats = [
    { label: '보유 재료', value: `${ingredients.length}개`, tone: 'bg-white text-gray-700' },
    { label: '임박 재료', value: `${urgentIngredientCount}개`, tone: 'bg-rose-100 text-rose-500' },
    { label: '추천 메뉴', value: `${recommendedRecipes.length}개`, tone: 'bg-mint-100 text-mint-500' },
  ]

  return (
    <div className="flex flex-col pb-4">
      {/* 첫 사용자가 바로 고를 수 있는 상황 추천 히어로 */}
      <section className="px-5 pt-2">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint-200 via-cream-100 to-lavender-100 p-5 shadow-card">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/35 blur-2xl" />
          <div className="absolute -left-8 bottom-2 h-24 w-24 rounded-full bg-white/35 blur-2xl" />

          <div className="relative flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.16em] text-mint-500/75">BEGINNER KITCHEN</p>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-mint-500">초보 집밥 추천</span>
          </div>

          <h2 className="relative mt-2 text-[1.55rem] font-bold leading-snug text-gray-800">
            오늘은 어떤 집밥이
            <br />
            필요하세요?
          </h2>
          <p className="relative mt-2 text-sm leading-relaxed text-gray-600">
            재료를 아직 안 넣어도 괜찮습니다. 상황을 고르면 쉬운 메뉴부터 보여드릴게요.
          </p>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            {BEGINNER_SITUATIONS.map((situation) => {
              const isSelected = selectedSituationId === situation.id
              return (
                <button
                  key={situation.id}
                  type="button"
                  onClick={() => setSelectedSituationId(situation.id)}
                  aria-pressed={isSelected}
                  className={`min-h-[4.5rem] rounded-2xl px-3 py-2.5 text-left shadow-soft transition-all ${
                    isSelected
                      ? 'bg-white text-gray-800 ring-2 ring-mint-300'
                      : 'bg-white/60 text-gray-600 active:scale-[0.98]'
                  }`}
                >
                  <span className="text-xl">{situation.icon}</span>
                  <span className="mt-1 block text-sm font-bold">{situation.label}</span>
                  <span className="mt-0.5 block text-[11px] text-gray-400">{situation.helper}</span>
                </button>
              )
            })}
          </div>

          <div className="relative mt-4 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{selectedSituation.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">{selectedSituation.label} 메뉴를 먼저 볼게요</p>
                <p className="mt-0.5 text-xs text-gray-500">{selectedSituation.helper}</p>
              </div>
            </div>
          </div>

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

      {/* 재료 입력 보상 CTA */}
      <section className="px-5 pt-4">
        <Link href="/fridge" className="block rounded-3xl bg-white px-4 py-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.14em] text-mint-500">추천 정확도</p>
              <h3 className="mt-1 text-base font-bold text-gray-800">
                {needsMoreIngredients ? `재료 ${3 - ingredientProgress}개만 더 넣으면 추천이 좋아져요` : '내 재료 기준 추천이 켜져 있어요'}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {needsMoreIngredients ? '계란, 김치, 두부처럼 자주 쓰는 재료부터 골라보세요.' : '부족한 재료와 바로 만들 수 있는 메뉴를 함께 볼 수 있습니다.'}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint-100 text-mint-500">
              <Plus size={20} />
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full bg-mint-300 transition-all ${progressWidthClass}`} />
          </div>
        </Link>
      </section>

      {/* 상황 기반 추천 레시피 */}
      <section className="px-5 pb-6 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-mint-500" />
            <h3 className="text-lg font-bold text-gray-800">{selectedSituation.label} 추천</h3>
          </div>
          <Link href="/recipe" className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            전체 보기 <ChevronRight size={14} />
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {recommendedRecipes.map((recipe, index) => {
            const isWide = index === 0
            const coverImage = recipe.thumbnailUrl || '/jipbab-recipe-market.png'
            return (
              <article
                key={recipe.id}
                className={`overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-card ${
                  isWide ? 'col-span-2' : ''
                }`}
              >
                <div className={`relative w-full overflow-hidden ${isWide ? 'h-44' : 'h-36'}`}>
                  {/* Next Image 도메인 설정 전까지는 원본 URL 이미지를 그대로 사용합니다. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt={recipe.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  <button
                    type="button"
                    aria-label={`${recipe.name} 즐겨찾기`}
                    onClick={() => {
                      toggleFavorite({
                        id: recipe.id,
                        name: recipe.name,
                        category: recipe.category,
                        thumbnailUrl: recipe.thumbnailUrl,
                      })
                    }}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-sm"
                  >
                    <Heart
                      size={16}
                      className={isFavorite(recipe.id) ? 'fill-rose-400 text-rose-400' : 'text-rose-400'}
                    />
                  </button>

                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                    {recipe.category}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-xs font-bold text-white/85">{recipe.beginnerProfile.confidenceLabel}</p>
                    <h4 className="mt-0.5 line-clamp-1 text-lg font-bold text-white">{recipe.name}</h4>
                  </div>
                </div>

                <Link href={`/recipe/${recipe.id}`} className="block p-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    <span className="rounded-2xl bg-mint-50 px-2 py-1.5 text-center text-[11px] font-bold text-mint-500">
                      {ingredients.length > 0 ? `${recipe.matchRate}% 일치` : '기본 추천'}
                    </span>
                    <span className="inline-flex items-center justify-center gap-1 rounded-2xl bg-gray-50 px-2 py-1.5 text-[11px] font-bold text-gray-500">
                      <Clock3 size={11} />
                      {recipe.beginnerProfile.minutes}분
                    </span>
                    <span className="inline-flex items-center justify-center gap-1 rounded-2xl bg-peach-50 px-2 py-1.5 text-[11px] font-bold text-peach-500">
                      <Flame size={11} />
                      {ingredients.length > 0 ? `부족 ${recipe.missingIngredients.length}` : recipe.beginnerProfile.difficultyLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-gray-500">{recipe.beginnerProfile.difficultyLabel}</p>
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      {/* 임박 재료 섹션 */}
      <section className="px-5 pb-6">
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
    </div>
  )
}
