// 이 파일은 레시피 목록 화면을 담당하며 참고 이미지의 음식 리스트 스타일을 구현합니다.
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Bookmark, Clock3, Heart, RefreshCw, Search, ShoppingBasket, SlidersHorizontal, Star, Users } from 'lucide-react'

import { APPSTORE_DEMO_RECIPES } from '@/lib/demo-state'
import { CURATED_JIPBAB_RECIPES } from '@/lib/curated-recipes'
import {
  RECIPE_QUICK_FILTERS,
  getReadinessBadge,
  isBeginnerVerifiedRecipe,
  matchesRecipeQuickFilter,
  type RecipeQuickFilter,
} from '@/lib/recipe-list-labels'
import {
  RECIPE_DIFFICULTY_FILTERS,
  RECIPE_FRIDGE_FILTERS,
  RECIPE_LIST_SORT_OPTIONS,
  RECIPE_TIME_FILTERS,
  RECIPE_TOOL_FILTERS,
  matchesRecipeListFilters,
  sortRecipeListRecipes,
  type RecipeDifficultyListFilter,
  type RecipeFridgeListFilter,
  type RecipeListSortMode,
  type RecipeTimeListFilter,
  type RecipeToolListFilter,
} from '@/lib/recipe-list-filters'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecipes } from '@/hooks/useRecipes'
import { isBeginnerRecipeGeneratedImage } from '@/lib/recipe-images'
import { DISPLAY_RECIPE_CATEGORIES, type DisplayRecipeCategory, type RecipeCategory } from '@/types'

const FALLBACK_RECIPE_IMAGE =
  '/images/recipes/kimchi-fried-rice.png'
const RECIPE_FALLBACK_IMAGES = [
  '/images/recipes/jipbab-curated/doenjang-jjigae-basic.png',
  '/images/recipes/jipbab-curated/gyeran-mari-basic.png',
  '/images/recipes/jipbab-curated/dubu-jorim-basic.png',
  '/images/recipes/soy-garlic-chicken.png',
] as const
const curatedRecipeMeta = new Map(
  CURATED_JIPBAB_RECIPES.map((recipe) => [recipe.id, recipe]),
)
const DISPLAY_CATEGORY_QUICK_FILTERS: Partial<Record<DisplayRecipeCategory, RecipeQuickFilter>> = {
  초보가능: 'beginner',
  '10분요리': 'quick',
}
const DISPLAY_CATEGORY_LABEL_LINES: Partial<Record<DisplayRecipeCategory, string[]>> = {
  '김치/밥 요리': ['김치/밥', '요리'],
  '두부/저렴 재료': ['두부/저렴', '재료'],
  '참치캔/스팸/햄/어묵': ['참치캔/', '스팸/햄/', '어묵'],
  '전자레인지/노불': ['전자레인지', '노불'],
  '도시락/반찬': ['도시락', '반찬'],
}

function toRealRecipeCategory(category: DisplayRecipeCategory): RecipeCategory {
  return category as RecipeCategory
}

function getDisplayCategoryLabelLines(category: DisplayRecipeCategory): string[] {
  return DISPLAY_CATEGORY_LABEL_LINES[category] ?? [category]
}

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
    categoryCounts,
    ingredientsLoading,
    setSearchQuery,
    setSelectedCategory,
    nextPage,
    prevPage,
    refresh,
  } = useRecipes()

  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [quickFilter, setQuickFilter] = useState<RecipeQuickFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<RecipeDifficultyListFilter>('all')
  const [timeFilter, setTimeFilter] = useState<RecipeTimeListFilter>('all')
  const [toolFilter, setToolFilter] = useState<RecipeToolListFilter>('all')
  const [fridgeFilter, setFridgeFilter] = useState<RecipeFridgeListFilter>('all')
  const [sortMode, setSortMode] = useState<RecipeListSortMode>('recommended')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const baseRecipes = isAppStoreDemo ? APPSTORE_DEMO_RECIPES : recipes
  const visibleTotalCount = isAppStoreDemo ? baseRecipes.length : Math.max(totalCount, baseRecipes.length)
  const favoriteRecipeIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linkedQuery = params.get('q') ?? params.get('ingredient')
    if (linkedQuery?.trim()) {
      setSearchQuery(linkedQuery.trim())
    }
  }, [setSearchQuery])

  const filteredRecipes = useMemo(() => {
    const base = favoritesOnly ? baseRecipes.filter((recipe) => isFavorite(recipe.id)) : baseRecipes
    const quickFiltered = base.filter((recipe) =>
      matchesRecipeQuickFilter(recipe, curatedRecipeMeta.get(recipe.id), quickFilter),
    )
    const listFiltered = quickFiltered.filter((recipe) =>
      matchesRecipeListFilters(recipe, {
        difficulty: difficultyFilter,
        time: timeFilter,
        tool: toolFilter,
        fridge: fridgeFilter,
      }),
    )

    return sortRecipeListRecipes(listFiltered, sortMode, favoriteRecipeIds)
  }, [baseRecipes, difficultyFilter, favoriteRecipeIds, favoritesOnly, fridgeFilter, isFavorite, quickFilter, sortMode, timeFilter, toolFilter])

  const visibleCategories = useMemo(() => {
    const hasCounts = Object.keys(categoryCounts).length > 0
    return DISPLAY_RECIPE_CATEGORIES.filter((category) => {
      const quickFilterForCategory = DISPLAY_CATEGORY_QUICK_FILTERS[category]
      if (
        category === '전체' ||
        selectedCategory === category ||
        (quickFilterForCategory && quickFilter === quickFilterForCategory)
      ) {
        return true
      }
      return !hasCounts || (categoryCounts[category] ?? 0) > 0
    })
  }, [categoryCounts, quickFilter, selectedCategory])

  const handleDisplayCategoryClick = (category: DisplayRecipeCategory) => {
    const quickFilterForCategory = DISPLAY_CATEGORY_QUICK_FILTERS[category]
    if (quickFilterForCategory) {
      setSelectedCategory('전체')
      setQuickFilter(quickFilter === quickFilterForCategory ? 'all' : quickFilterForCategory)
      return
    }

    const realCategory = toRealRecipeCategory(category)
    setQuickFilter('all')
    setSelectedCategory(selectedCategory === realCategory ? '전체' : realCategory)
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-28">
      <section className="mobile-safe-top px-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-black text-[#2f2117]">레시피</h1>
            <p className="mt-1 text-[12px] font-semibold text-[#8f7f70]">
              {isAppStoreDemo
                ? `총 ${baseRecipes.length}개 레시피`
                : `소진임박 재료부터 추천 · 총 ${visibleTotalCount.toLocaleString()}개${ingredientsLoading ? ' · 재료 동기화 중' : ''}`}
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
          <button onClick={refresh} aria-label="레시피 새로고침" className="flex h-9 w-9 shrink-0 items-center justify-center text-[#9f8d7a]">
            <RefreshCw size={15} />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 px-5 pt-3">
        {visibleCategories.map((category) => {
          const quickFilterForCategory = DISPLAY_CATEGORY_QUICK_FILTERS[category]
          const active = quickFilterForCategory
            ? quickFilter === quickFilterForCategory
            : quickFilter === 'all' && selectedCategory === category
          const labelLines = getDisplayCategoryLabelLines(category)

          return (
            <button
              key={category}
              type="button"
              onClick={() => handleDisplayCategoryClick(category)}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-[18px] border px-2 py-2 text-center text-[12px] font-black leading-[1.15] transition-all ${
                active
                  ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                  : 'border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f]'
              }`}
            >
              <span className="flex min-h-7 flex-col items-center justify-center">
                {labelLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
              {category !== '전체' && typeof categoryCounts[category] === 'number' ? (
                <span className="mt-0.5 text-[10px] opacity-70">{categoryCounts[category]}</span>
              ) : null}
            </button>
          )
        })}
      </section>

      <section className="grid grid-cols-3 gap-2 px-5 pt-2">
        {RECIPE_QUICK_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setQuickFilter(filter.id)}
            className={`min-h-8 rounded-full border px-2 py-1.5 text-[11px] font-black transition-all ${
              quickFilter === filter.id
                ? 'border-[#2f6fec] bg-[#eef4ff] text-[#2f6fec]'
                : 'border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </section>

      <section className="px-5 pt-3">
        <div className="jipbab-panel rounded-[16px] px-3 py-3">
          <button
            type="button"
            aria-expanded={showAdvancedFilters}
            onClick={() => setShowAdvancedFilters((current) => !current)}
            className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-[12px] font-black text-[#4b3929]"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-[#d94d19]" />
              목록 필터
            </span>
            <span className="rounded-full bg-[#fff0e4] px-2.5 py-1 text-[11px] text-[#d94d19]">
              {showAdvancedFilters ? '접기' : '상세'}
            </span>
          </button>
          {showAdvancedFilters ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <FilterSelect
                label="난이도"
                value={difficultyFilter}
                options={RECIPE_DIFFICULTY_FILTERS}
                onChange={(value) => setDifficultyFilter(value as RecipeDifficultyListFilter)}
              />
              <FilterSelect
                label="조리시간"
                value={timeFilter}
                options={RECIPE_TIME_FILTERS}
                onChange={(value) => setTimeFilter(value as RecipeTimeListFilter)}
              />
              <FilterSelect
                label="도구"
                value={toolFilter}
                options={RECIPE_TOOL_FILTERS}
                onChange={(value) => setToolFilter(value as RecipeToolListFilter)}
              />
              <FilterSelect
                label="냉장고"
                value={fridgeFilter}
                options={RECIPE_FRIDGE_FILTERS}
                onChange={(value) => setFridgeFilter(value as RecipeFridgeListFilter)}
              />
              <label className="col-span-2 grid gap-1 text-[11px] font-black text-[#7d6d5f]">
                정렬
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as RecipeListSortMode)}
                  className="min-h-10 w-full rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 text-[12px] font-black text-[#4b3929] outline-none"
                >
                  {RECIPE_LIST_SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
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
            <p className="mt-1 text-xs text-[#8f7f70]">
              {selectedCategory !== '전체'
                ? `${selectedCategory} 카테고리에 표시할 레시피가 아직 없습니다.`
                : '검색어나 즐겨찾기 조건을 다시 확인해 주세요.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {selectedCategory !== '전체' ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('전체')}
                  className="rounded-full bg-[#ea5a1f] px-4 py-2 text-[12px] font-black text-white"
                >
                  전체 레시피 보기
                </button>
              ) : null}
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-full border border-[#eadcc9] px-4 py-2 text-[12px] font-black text-[#4b3929]"
                >
                  검색어 지우기
                </button>
              ) : null}
              {favoritesOnly ? (
                <button
                  type="button"
                  onClick={() => setFavoritesOnly(false)}
                  className="rounded-full border border-[#eadcc9] px-4 py-2 text-[12px] font-black text-[#4b3929]"
                >
                  전체 목록 보기
                </button>
              ) : null}
              {quickFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setQuickFilter('all')}
                  className="rounded-full border border-[#eadcc9] px-4 py-2 text-[12px] font-black text-[#4b3929]"
                >
                  추천 레시피 보기
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRecipes.map((recipe, index) => {
              const favorite = isFavorite(recipe.id)
              const coverImage =
                recipe.thumbnailUrl ||
                RECIPE_FALLBACK_IMAGES[index % RECIPE_FALLBACK_IMAGES.length] ||
                FALLBACK_RECIPE_IMAGE
              const isGeneratedRecipeImage = isBeginnerRecipeGeneratedImage(coverImage)
              const curated = curatedRecipeMeta.get(recipe.id)
              const minutes = curated?.cookingTime ?? 15 + (index % 4) * 5
              const servings = curated?.servings ? `${curated.servings}인분` : index % 3 === 0 ? '1인분' : index % 3 === 1 ? '2인분' : '2-3인분'
              const readyLabel = getReadinessBadge(
                recipe.missingIngredients.length,
                recipe.matchedIngredients.length,
                curated?.trustLabel,
              )
              const beginnerVerified = isBeginnerVerifiedRecipe(curated)
              const recommendationReason = 'recommendationReason' in recipe && typeof recipe.recommendationReason === 'string'
                ? recipe.recommendationReason
                : readyLabel.text

              return (
                <article key={recipe.id} className="jipbab-panel overflow-hidden rounded-[16px]">
                  <div className="flex gap-3 p-2.5">
                    <Link href={`/recipe/${recipe.id}`} className="relative h-[86px] w-[96px] shrink-0 overflow-hidden rounded-[13px] bg-[#eadcc9]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverImage}
                        alt={recipe.name}
                        onError={(event) => {
                          event.currentTarget.src = RECIPE_FALLBACK_IMAGES[index % RECIPE_FALLBACK_IMAGES.length] || FALLBACK_RECIPE_IMAGE
                        }}
                        className={`h-full w-full ${isGeneratedRecipeImage ? 'object-contain p-1' : 'object-cover'}`}
                      />
                    </Link>

                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/recipe/${recipe.id}`} className="min-w-0">
                          <h2 className="line-clamp-1 text-[16px] font-black text-[#2f2117]">{recipe.name}</h2>
                          <p className="mt-1 text-[11px] font-bold text-[#8f7f70]">
                          {recipe.category} · {recipe.method}
                          </p>
                          {curated ? (
                            <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#a66a17]">
                              {curated.featuredReason}
                            </p>
                          ) : null}
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
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${readyLabel.tone}`}>
                          <ShoppingBasket size={10} />
                          {readyLabel.text}
                        </span>
                        {beginnerVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-black text-[#2f6fec]">
                            <BadgeCheck size={10} />
                            초보 검수
                          </span>
                        ) : null}
                        {favorite ? (
                          <span className="rounded-full bg-[#f2f7e7] px-2 py-0.5 text-[10px] font-black text-[#3d7b38]">
                            찜 우선
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[11px] font-semibold text-[#a69585]">
                        {recommendationReason}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#a69585]">
                        부족 재료 {recipe.missingIngredients.length}개 · 보유 {recipe.matchedIngredients.length}개
                        {beginnerVerified ? ' · 계량/상태 확인 포함' : ''}
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
          className="min-h-10 rounded-full border border-[#eadcc9] bg-[#fffaf3] px-4 py-2 text-xs font-bold text-[#7d6d5f] disabled:opacity-40"
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
          className="min-h-10 rounded-full border border-[#eadcc9] bg-[#fffaf3] px-4 py-2 text-xs font-bold text-[#7d6d5f] disabled:opacity-40"
        >
          다음
        </button>
      </section>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ id: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#7d6d5f]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 text-[12px] font-black text-[#4b3929] outline-none"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
