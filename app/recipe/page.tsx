// 이 파일은 레시피 목록 화면을 담당하며 참고 이미지의 음식 리스트 스타일을 구현합니다.
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, Bookmark, Clock3, Gauge, Heart, RefreshCw, Search, ShoppingBasket, SlidersHorizontal, Users, Utensils } from 'lucide-react'

import RecipeImage from '@/components/recipe/RecipeImage'
import { APPSTORE_DEMO_RECIPES } from '@/lib/demo-state'
import { CURATED_JIPBAB_RECIPES } from '@/lib/curated-recipes'
import {
  RECIPE_QUICK_FILTERS,
  getRecipeCardMetadataLabels,
  getReadinessBadge,
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
import { useDemoModeState } from '@/hooks/useDemoMode'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecipes } from '@/hooks/useRecipes'
import { isBeginnerRecipeGeneratedImage } from '@/lib/recipe-images'
import type { RecipeApiV1Sort } from '@/lib/recipe-api-v1-client'
import {
  createRecipeListNavigationState,
  readRecipeListNavigationState,
  withRecipeListNavigationState,
} from '@/lib/recipe-list-navigation-state'
import { filterPublicationApprovedRecipes } from '@/lib/recipe-publication'
import { DISPLAY_RECIPE_CATEGORIES, type DisplayRecipeCategory, type RecipeCategory } from '@/types'

const curatedRecipeMeta = new Map(
  CURATED_JIPBAB_RECIPES.map((recipe) => [recipe.id, recipe]),
)
const DISPLAY_CATEGORY_QUICK_FILTERS: Partial<Record<DisplayRecipeCategory, RecipeQuickFilter>> = {
  초보가능: 'beginner',
  '10분요리': 'quick',
}
const RESTORABLE_RECIPE_QUICK_FILTERS = new Set<RecipeQuickFilter>([
  ...RECIPE_QUICK_FILTERS.map((filter) => filter.id),
  'beginner',
  'quick',
])
const DISPLAY_CATEGORY_LABEL_LINES: Partial<Record<DisplayRecipeCategory, string[]>> = {
  '밥·한 그릇': ['밥·한', '그릇'],
  '찌개·전골': ['찌개', '전골'],
  '간식·디저트': ['간식', '디저트'],
}

function toRealRecipeCategory(category: DisplayRecipeCategory): RecipeCategory {
  return category as RecipeCategory
}

function getDisplayCategoryLabelLines(category: DisplayRecipeCategory): string[] {
  return DISPLAY_CATEGORY_LABEL_LINES[category] ?? [category]
}

export default function RecipePage() {
  const { isDemoMode: isAppStoreDemo, ready: demoModeReady } = useDemoModeState()
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [quickFilter, setQuickFilter] = useState<RecipeQuickFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<RecipeDifficultyListFilter>('all')
  const [timeFilter, setTimeFilter] = useState<RecipeTimeListFilter>('all')
  const [toolFilter, setToolFilter] = useState<RecipeToolListFilter>('all')
  const [fridgeFilter, setFridgeFilter] = useState<RecipeFridgeListFilter>('all')
  const [sortMode, setSortMode] = useState<RecipeListSortMode>('recommended')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [urlStateReady, setUrlStateReady] = useState(false)
  const pendingScrollRestoreRef = useRef<number | null>(null)
  const scrollRestoreDoneRef = useRef(false)
  const apiSort: RecipeApiV1Sort = {
    recommended: 'recommended',
    missing: 'least-missing',
    'beginner-score': 'recommended',
    time: 'fastest',
  }[sortMode] as RecipeApiV1Sort
  const {
    recipes,
    loading,
    hasLoaded,
    loadedPage,
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
    capturePaginationState,
    restorePaginationState,
    refresh,
  } = useRecipes(24, {
    enabled: urlStateReady && demoModeReady && !isAppStoreDemo,
    sort: apiSort,
    difficulty: difficultyFilter === 'level-1' ? 1 : null,
    maxTotalTime: timeFilter === 'all' ? null : Number(timeFilter),
    maxMissingIngredients: fridgeFilter === 'ready' ? 0 : fridgeFilter === 'almost' ? 2 : null,
  })

  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const baseRecipes = useMemo(
    () => filterPublicationApprovedRecipes(isAppStoreDemo ? APPSTORE_DEMO_RECIPES : recipes),
    [isAppStoreDemo, recipes],
  )
  const visibleTotalCount = isAppStoreDemo ? baseRecipes.length : Math.max(totalCount, baseRecipes.length)
  const publicationEmpty = visibleTotalCount === 0 && !searchQuery && selectedCategory === '전체' && !favoritesOnly
  const favoriteRecipeIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites])

  const persistRecipeListNavigation = useCallback(() => {
    try {
      const locationKey = `${window.location.pathname}${window.location.search}`
      const scrollElement = document.getElementById('main-content')
      const scrollY = scrollElement ? scrollElement.scrollTop : window.scrollY
      const navigationState = createRecipeListNavigationState({
        locationKey,
        scrollY,
        pagination: capturePaginationState(),
      })
      window.history.replaceState(
        withRecipeListNavigationState(window.history.state, navigationState),
        '',
        window.location.href,
      )
    } catch {
      return
    }
  }, [capturePaginationState])

  useEffect(() => {
    const locationKey = `${window.location.pathname}${window.location.search}`
    const navigationState = readRecipeListNavigationState(window.history.state, locationKey)
    const params = new URLSearchParams(window.location.search)
    const linkedQuery = params.get('q') ?? params.get('ingredient')
    if (linkedQuery?.trim()) {
      setSearchQuery(linkedQuery.trim())
    }
    const category = params.get('category')
    if (category && DISPLAY_RECIPE_CATEGORIES.includes(category as DisplayRecipeCategory)) {
      setSelectedCategory(toRealRecipeCategory(category as DisplayRecipeCategory))
    }
    const quick = params.get('quick')
    if (quick && RESTORABLE_RECIPE_QUICK_FILTERS.has(quick as RecipeQuickFilter)) {
      setQuickFilter(quick as RecipeQuickFilter)
    }
    const difficulty = params.get('difficulty')
    if (difficulty && RECIPE_DIFFICULTY_FILTERS.some((item) => item.id === difficulty)) {
      setDifficultyFilter(difficulty as RecipeDifficultyListFilter)
    }
    const time = params.get('time')
    if (time && RECIPE_TIME_FILTERS.some((item) => item.id === time)) {
      setTimeFilter(time as RecipeTimeListFilter)
    }
    const tool = params.get('tool')
    if (tool && RECIPE_TOOL_FILTERS.some((item) => item.id === tool)) {
      setToolFilter(tool as RecipeToolListFilter)
    }
    const fridge = params.get('fridge')
    if (fridge && RECIPE_FRIDGE_FILTERS.some((item) => item.id === fridge)) {
      setFridgeFilter(fridge as RecipeFridgeListFilter)
    }
    const sort = params.get('sort')
    if (sort && RECIPE_LIST_SORT_OPTIONS.some((item) => item.id === sort)) {
      setSortMode(sort as RecipeListSortMode)
    }
    setFavoritesOnly(params.get('favorites') === '1')
    setShowAdvancedFilters(params.get('advanced') === '1')
    if (navigationState) {
      restorePaginationState(navigationState.pagination)
      pendingScrollRestoreRef.current = navigationState.scrollY
    }
    setUrlStateReady(true)
  }, [restorePaginationState, setSearchQuery, setSelectedCategory])

  useEffect(() => {
    if (!urlStateReady) return
    const url = new URL(window.location.href)
    const setOrDelete = (key: string, value: string, fallback: string) => {
      if (value === fallback) url.searchParams.delete(key)
      else url.searchParams.set(key, value)
    }
    setOrDelete('q', searchQuery.trim(), '')
    url.searchParams.delete('ingredient')
    setOrDelete('category', selectedCategory, '전체')
    setOrDelete('quick', quickFilter, 'all')
    setOrDelete('difficulty', difficultyFilter, 'all')
    setOrDelete('time', timeFilter, 'all')
    setOrDelete('tool', toolFilter, 'all')
    setOrDelete('fridge', fridgeFilter, 'all')
    setOrDelete('sort', sortMode, 'recommended')
    setOrDelete('favorites', favoritesOnly ? '1' : '0', '0')
    setOrDelete('advanced', showAdvancedFilters ? '1' : '0', '0')
    window.history.replaceState(window.history.state, '', url)
  }, [difficultyFilter, favoritesOnly, fridgeFilter, quickFilter, searchQuery, selectedCategory, showAdvancedFilters, sortMode, timeFilter, toolFilter, urlStateReady])

  useEffect(() => {
    window.addEventListener('pagehide', persistRecipeListNavigation)
    return () => {
      window.removeEventListener('pagehide', persistRecipeListNavigation)
    }
  }, [persistRecipeListNavigation])

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== '전체' ||
    quickFilter !== 'all' ||
    difficultyFilter !== 'all' ||
    timeFilter !== 'all' ||
    toolFilter !== 'all' ||
    fridgeFilter !== 'all' ||
    sortMode !== 'recommended' ||
    favoritesOnly

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategory('전체')
    setQuickFilter('all')
    setDifficultyFilter('all')
    setTimeFilter('all')
    setToolFilter('all')
    setFridgeFilter('all')
    setSortMode('recommended')
    setFavoritesOnly(false)
    setShowAdvancedFilters(false)
  }, [setSearchQuery, setSelectedCategory])

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

  useEffect(() => {
    if (
      scrollRestoreDoneRef.current ||
      !urlStateReady ||
      !demoModeReady ||
      (!isAppStoreDemo && (!hasLoaded || loading || loadedPage !== page))
    ) {
      return
    }
    const scrollY = pendingScrollRestoreRef.current
    if (scrollY === null) {
      scrollRestoreDoneRef.current = true
      return
    }

    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const scrollElement = document.getElementById('main-content')
        if (scrollElement) scrollElement.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
        else window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
        scrollRestoreDoneRef.current = true
      })
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
    }
  }, [demoModeReady, filteredRecipes.length, hasLoaded, isAppStoreDemo, loadedPage, loading, page, urlStateReady])

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
            <p className="mt-1 text-[12px] font-semibold text-[#6b5f55]">
              {isAppStoreDemo
                ? `총 ${baseRecipes.length}개 레시피`
                : `소진임박 재료부터 추천 · 총 ${visibleTotalCount.toLocaleString()}개${ingredientsLoading ? ' · 재료 동기화 중' : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFavoritesOnly((prev) => !prev)}
            aria-pressed={favoritesOnly}
            aria-label={`즐겨찾기 레시피 ${favoritesOnly ? '필터 해제' : '필터 적용'} · ${favorites.length}개`}
            className={`flex h-11 items-center gap-1.5 rounded-full border px-3 text-[12px] font-black ${
              favoritesOnly
                ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#a63b13]'
                : 'border-[#eadcc9] bg-[#fffaf3] text-[#5f5145]'
            }`}
          >
            <Heart size={14} className={favoritesOnly ? 'fill-[#ea5a1f]' : ''} />
            {favorites.length}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/meal-plan" className="flex min-h-11 items-center justify-center rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2 text-center text-[12px] font-black text-[#4b3929]">
            주간 식단
          </Link>
          <Link href="/recipe/import" className="flex min-h-11 items-center justify-center rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2 text-center text-[12px] font-black text-[#4b3929]">
            레시피 가져오기
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2.5">
          <Search size={16} className="text-[#75675b]" />
          <input
            type="search"
            aria-label="레시피 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="레시피 검색"
            className="w-full bg-transparent text-[13px] font-medium text-[#4b3929] outline-none placeholder:text-[#6b5f55]"
          />
          <button onClick={refresh} aria-label="레시피 새로고침" className="flex h-11 w-11 shrink-0 items-center justify-center text-[#6b5f55]">
            <RefreshCw size={15} />
          </button>
        </div>
      </section>

      {error && !isAppStoreDemo ? (
        <section className="px-5 pt-3" role="alert">
          <div className="rounded-[16px] border border-[#ffd1bd] bg-[#fff0e4] px-4 py-4 text-sm font-semibold text-[#a63b13]">
            <p>{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#2f2117] px-4 text-[12px] font-black text-white"
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          </div>
        </section>
      ) : null}

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
              aria-pressed={active}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-[18px] border px-2 py-2 text-center text-[12px] font-black leading-[1.15] transition-all ${
                active
                  ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#a63b13]'
                  : 'border-[#eadcc9] bg-[#fffaf3] text-[#5f5145]'
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
            aria-pressed={quickFilter === filter.id}
            className={`min-h-11 rounded-full border px-2 py-1.5 text-[11px] font-black transition-all ${
              quickFilter === filter.id
                ? 'border-[#2f6fec] bg-[#eef4ff] text-[#1f55c7]'
                : 'border-[#eadcc9] bg-[#fffaf3] text-[#5f5145]'
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
            className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-[12px] font-black text-[#4b3929]"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-[#a63b13]" />
              목록 필터
            </span>
            <span className="rounded-full bg-[#fff0e4] px-2.5 py-1 text-[11px] text-[#a63b13]">
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
              <label className="col-span-2 grid gap-1 text-[11px] font-black text-[#5f5145]">
                정렬
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as RecipeListSortMode)}
                  className="min-h-11 w-full rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 text-[12px] font-black text-[#4b3929] outline-none"
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
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 text-[12px] font-black text-[#5f5145]"
            >
              <RefreshCw size={14} />
              필터 초기화
            </button>
          ) : null}
        </div>
      </section>

      <section className="px-5 pt-4">
        {!isAppStoreDemo && loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#ea5a1f] border-t-transparent" />
            <p className="mt-3 text-sm text-[#6b5f55]">레시피를 불러오는 중...</p>
          </div>
        ) : error && !isAppStoreDemo ? (
          <div className="sr-only">{error}</div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-[20px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-8 text-center">
            <p className="text-sm font-black text-[#4b3929]">
              {publicationEmpty ? '현재 공개 가능한 레시피를 준비 중이에요.' : '조건에 맞는 레시피가 없습니다.'}
            </p>
            <p className="mt-1 text-xs text-[#6b5f55]">
              {publicationEmpty
                ? '검수, 출처 확인과 실제 조리를 마친 레시피만 보여드려요.'
                : selectedCategory !== '전체'
                ? `${selectedCategory} 카테고리에 표시할 레시피가 아직 없습니다.`
                : '검색어나 즐겨찾기 조건을 다시 확인해 주세요.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {publicationEmpty ? (
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#2f2117] px-4 text-[12px] font-black text-white"
                >
                  <RefreshCw size={14} />
                  다시 확인
                </button>
              ) : null}
              {selectedCategory !== '전체' ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('전체')}
                  className="rounded-full bg-[#c2410c] px-4 py-2 text-[12px] font-black text-white"
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
            {filteredRecipes.map((recipe) => {
              const favorite = isFavorite(recipe.id)
              const coverImage = recipe.thumbnailUrl
              const isGeneratedRecipeImage = isBeginnerRecipeGeneratedImage(coverImage)
              const curated = curatedRecipeMeta.get(recipe.id)
              const minutes = recipe.totalMinutes
              const servings = recipe.servings
              const readyLabel = getReadinessBadge(
                recipe.missingIngredients.length,
                recipe.matchedIngredients.length,
                curated?.trustLabel,
              )
              const beginnerVerified = recipe.publicationEvidence?.reviewedForBeginner === true
              const requiredIngredientCount =
                'requiredIngredientCount' in recipe && typeof recipe.requiredIngredientCount === 'number'
                  ? recipe.requiredIngredientCount
                  : recipe.totalRecipeIngredients
              const ownedIngredientCount =
                'ownedIngredientCount' in recipe && typeof recipe.ownedIngredientCount === 'number'
                  ? recipe.ownedIngredientCount
                  : recipe.matchedIngredients.length
              const metadataLabels = getRecipeCardMetadataLabels({
                difficultyLevel: recipe.difficultyLevel,
                requiredIngredientCount,
                ownedIngredientCount,
                missingIngredientCount: recipe.missingIngredients.length,
              })
              const recommendationReason = 'recommendationReason' in recipe && typeof recipe.recommendationReason === 'string'
                ? recipe.recommendationReason
                : readyLabel.text

              return (
                <article key={recipe.id} className="jipbab-panel overflow-hidden rounded-[16px]">
                  <div className="flex gap-3 p-2.5">
                    <Link
                      href={`/recipe/${recipe.id}`}
                      onClick={persistRecipeListNavigation}
                      className="relative flex h-[86px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-[#f1e8dc] text-[#6b5f55]"
                    >
                      <span className="grid place-items-center gap-1 text-[10px] font-black">
                        <Utensils size={18} />
                        이미지 없음
                      </span>
                      {coverImage ? (
                        <RecipeImage
                          src={coverImage}
                          alt={recipe.name}
                          className="absolute inset-0"
                          imageClassName={`h-full w-full ${isGeneratedRecipeImage ? 'object-contain p-1' : 'object-cover'}`}
                        />
                      ) : null}
                    </Link>

                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/recipe/${recipe.id}`}
                          onClick={persistRecipeListNavigation}
                          className="min-w-0"
                        >
                          <h2 className="line-clamp-1 text-[16px] font-black text-[#2f2117]">{recipe.name}</h2>
                          <p className="mt-1 text-[11px] font-bold text-[#6b5f55]">
                            {recipe.category}{recipe.method ? ` · ${recipe.method}` : ''}
                          </p>
                          {recipe.summary ? (
                            <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#5f5145]">
                              {recipe.summary}
                            </p>
                          ) : null}
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            toggleFavorite({
                              id: recipe.id,
                              name: recipe.name,
                              category: recipe.category,
                              thumbnailUrl: recipe.thumbnailUrl,
                              publicationEvidence: recipe.publicationEvidence,
                            })
                          }
                          aria-label={`${recipe.name} 즐겨찾기 토글`}
                          aria-pressed={favorite}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[#5f5145]"
                        >
                          <Bookmark size={15} className={favorite ? 'fill-[#ea5a1f] text-[#a63b13]' : ''} />
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#5f5145]">
                        {typeof minutes === 'number' ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={12} />
                            {minutes}분
                          </span>
                        ) : null}
                        {typeof servings === 'number' ? (
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} />
                            {servings}인분
                          </span>
                        ) : null}
                        {metadataLabels.difficultyLabel ? (
                          <span className="inline-flex items-center gap-1">
                            <Gauge size={12} />
                            난이도 {metadataLabels.difficultyLabel}
                          </span>
                        ) : null}
                        {metadataLabels.ownershipLabel ? (
                          <span className="inline-flex items-center gap-1 text-[#3d7b38]">
                            <ShoppingBasket size={12} />
                            {metadataLabels.ownershipLabel}
                          </span>
                        ) : null}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${readyLabel.tone}`}>
                          <ShoppingBasket size={10} />
                          {readyLabel.text}
                        </span>
                        {beginnerVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-black text-[#1f55c7]">
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
                      <p className="mt-2 text-[11px] font-semibold text-[#6b5f55]">
                        {recommendationReason}
                      </p>
                      {metadataLabels.missingLabel ? (
                        <p className="mt-1 text-[11px] font-semibold text-[#6b5f55]">
                          {metadataLabels.missingLabel}
                          {beginnerVerified ? ' · 계량/상태 확인 포함' : ''}
                        </p>
                      ) : null}
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
          className="min-h-11 rounded-full border border-[#eadcc9] bg-[#fffaf3] px-4 py-2 text-xs font-bold text-[#5f5145] disabled:opacity-40"
        >
          이전
        </button>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6b5f55]">
          <SlidersHorizontal size={13} />
          {page} / {totalPages}
        </span>
        <button
          onClick={nextPage}
          disabled={page >= totalPages || loading}
          className="min-h-11 rounded-full border border-[#eadcc9] bg-[#fffaf3] px-4 py-2 text-xs font-bold text-[#5f5145] disabled:opacity-40"
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
    <label className="grid gap-1 text-[11px] font-black text-[#5f5145]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 text-[12px] font-black text-[#4b3929] outline-none"
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
