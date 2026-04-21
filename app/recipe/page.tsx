// 이 파일은 레시피 목록 화면을 담당하며 참고 이미지의 음식 리스트 스타일을 구현합니다.
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Bookmark, Clock3, Heart, RefreshCw, Search, SlidersHorizontal, Star, Users } from 'lucide-react'

import { APPSTORE_DEMO_RECIPES } from '@/lib/demo-state'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecipes } from '@/hooks/useRecipes'
import { RECIPE_CATEGORIES } from '@/types'

const FALLBACK_RECIPE_IMAGE =
  'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80'
const RECIPE_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1627662168806-efa33a7cda86?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=85',
] as const

export default function RecipePage() {
  const isAppStoreDemo = useDemoMode()
  const {
    recipes,
    loading,
    error,
    page,
    totalCount,
    totalPages,
    searchQuery,
    selectedCategory,
    ingredientsLoading,
    setSearchQuery,
    setSelectedCategory,
    nextPage,
    prevPage,
    refresh,
  } = useRecipes()

  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const baseRecipes = isAppStoreDemo ? APPSTORE_DEMO_RECIPES : recipes

  const filteredRecipes = useMemo(() => {
    const base = favoritesOnly ? baseRecipes.filter((recipe) => isFavorite(recipe.id)) : baseRecipes

    return [...base].sort((left, right) => {
      if (right.matchRate !== left.matchRate) {
        return right.matchRate - left.matchRate
      }
      if (right.matchedIngredients.length !== left.matchedIngredients.length) {
        return right.matchedIngredients.length - left.matchedIngredients.length
      }
      return left.name.localeCompare(right.name, 'ko')
    })
  }, [baseRecipes, favoritesOnly, isFavorite])

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-black text-[#2f2117]">레시피</h1>
            <p className="mt-1 text-[12px] font-semibold text-[#8f7f70]">
              {isAppStoreDemo
                ? `미리보기 ${baseRecipes.length}개`
                : `총 ${totalCount.toLocaleString()}개 레시피${ingredientsLoading ? ' · 재료 동기화 중' : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFavoritesOnly((prev) => !prev)}
            className={`flex h-10 items-center gap-1.5 rounded-full border px-3 text-[12px] font-black ${
              favoritesOnly
                ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                : 'border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f]'
            }`}
          >
            <Heart size={14} className={favoritesOnly ? 'fill-[#ea5a1f]' : ''} />
            {favorites.length}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/meal-plan" className="rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2 text-center text-[12px] font-black text-[#4b3929]">
            주간 식단
          </Link>
          <Link href="/recipe/import" className="rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2 text-center text-[12px] font-black text-[#4b3929]">
            레시피 가져오기
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2.5">
          <Search size={16} className="text-[#b5a493]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="레시피 검색"
            className="w-full bg-transparent text-[13px] font-medium text-[#4b3929] outline-none placeholder:text-[#a69585]"
          />
          <button onClick={refresh} aria-label="레시피 새로고침" className="text-[#9f8d7a]">
            <RefreshCw size={15} />
          </button>
        </div>
      </section>

      <section className="scrollbar-hide flex gap-2 overflow-x-auto px-5 pt-3">
        {RECIPE_CATEGORIES.slice(0, 6).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`shrink-0 rounded-full border px-4 py-2 text-[12px] font-black transition-all ${
              selectedCategory === category
                ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                : 'border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f]'
            }`}
          >
            {category}
          </button>
        ))}
      </section>

      <section className="px-5 pt-4">
        {!isAppStoreDemo && loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#ea5a1f] border-t-transparent" />
            <p className="mt-3 text-sm text-[#8f7f70]">레시피를 불러오는 중...</p>
          </div>
        ) : error && !isAppStoreDemo ? (
          <div className="rounded-[16px] bg-[#fff0e4] px-4 py-5 text-sm font-semibold text-[#d94d19]">{error}</div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-[20px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-8 text-center">
            <p className="text-sm font-black text-[#4b3929]">조건에 맞는 레시피가 없습니다.</p>
            <p className="mt-1 text-xs text-[#8f7f70]">검색어나 카테고리를 다시 선택해 보세요.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRecipes.map((recipe, index) => {
              const favorite = isFavorite(recipe.id)
              const coverImage =
                recipe.thumbnailUrl ||
                RECIPE_FALLBACK_IMAGES[index % RECIPE_FALLBACK_IMAGES.length] ||
                FALLBACK_RECIPE_IMAGE
              const minutes = 15 + (index % 4) * 5
              const servings = index % 3 === 0 ? '1인분' : index % 3 === 1 ? '2인분' : '2-3인분'

              return (
                <article key={recipe.id} className="jipbab-panel overflow-hidden rounded-[16px]">
                  <div className="flex gap-3 p-2.5">
                    <Link href={`/recipe/${recipe.id}`} className="relative h-[86px] w-[96px] shrink-0 overflow-hidden rounded-[13px] bg-[#eadcc9]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverImage} alt={recipe.name} className="h-full w-full object-cover" />
                    </Link>

                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/recipe/${recipe.id}`} className="min-w-0">
                          <h2 className="line-clamp-1 text-[16px] font-black text-[#2f2117]">{recipe.name}</h2>
                          <p className="mt-1 text-[11px] font-bold text-[#8f7f70]">
                            {recipe.category} · {recipe.method}
                          </p>
                        </Link>
                        <button
                          onClick={() =>
                            toggleFavorite({
                              id: recipe.id,
                              name: recipe.name,
                              category: recipe.category,
                              thumbnailUrl: recipe.thumbnailUrl,
                            })
                          }
                          aria-label={`${recipe.name} 즐겨찾기 토글`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[#7d6d5f]"
                        >
                          <Bookmark size={15} className={favorite ? 'fill-[#ea5a1f] text-[#ea5a1f]' : ''} />
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#7d6d5f]">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {minutes}분
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} />
                          {servings}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#d94d19]">
                          <Star size={12} className="fill-[#f0a51c] text-[#f0a51c]" />
                          {recipe.matchRate}% ({recipe.totalRecipeIngredients})
                        </span>
                        <span className="rounded-full bg-[#fff0e4] px-2 py-0.5 text-[10px] font-black text-[#d94d19]">
                          데이터 검증
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] font-semibold text-[#a69585]">
                        부족 재료 {recipe.missingIngredients.length}개 · 보유 {recipe.matchedIngredients.length}개
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-5 flex items-center justify-center gap-2 px-5">
        <button
          onClick={prevPage}
          disabled={page <= 1 || loading}
          className="rounded-full border border-[#eadcc9] bg-[#fffaf3] px-3 py-1.5 text-xs font-bold text-[#7d6d5f] disabled:opacity-40"
        >
          이전
        </button>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8f7f70]">
          <SlidersHorizontal size={13} />
          {page} / {totalPages}
        </span>
        <button
          onClick={nextPage}
          disabled={page >= totalPages || loading}
          className="rounded-full border border-[#eadcc9] bg-[#fffaf3] px-3 py-1.5 text-xs font-bold text-[#7d6d5f] disabled:opacity-40"
        >
          다음
        </button>
      </section>
    </div>
  )
}
