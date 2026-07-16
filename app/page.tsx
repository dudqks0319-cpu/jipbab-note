// 이 파일은 홈 화면을 담당하며 참고 이미지의 앱스토어형 첫 화면을 구현합니다.
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  AlertTriangle,
  Bell,
  ChefHat,
  Clock3,
  Plus,
  Refrigerator,
  RefreshCw,
  Search,
  ShoppingBasket,
  Utensils,
} from 'lucide-react'

import FridgeIllustration from '@/components/fridge/FridgeIllustration'
import StarterActionCard from '@/components/home/StarterActionCard'
import TodayActionCard from '@/components/home/TodayActionCard'
import RecipeImage from '@/components/recipe/RecipeImage'
import { useDemoModeState } from '@/hooks/useDemoMode'
import { useFamilyShare } from '@/hooks/useFamilyShare'
import { useIngredients } from '@/hooks/useIngredients'
import { useRecipeCatalog } from '@/hooks/useRecipes'
import { useShopping } from '@/hooks/useShopping'
import {
  buildRecipeRecommendationReason,
  findExpiringMatchedIngredients,
  getEssentialMissingIngredients,
  rankRecipeRecommendations,
} from '@/lib/matching'
import { APPSTORE_DEMO_INGREDIENTS, APPSTORE_DEMO_RECIPES, APPSTORE_DEMO_SHOPPING_ITEMS } from '@/lib/demo-state'
import { buildHomeHref } from '@/lib/home-actions'
import { withNormalizedIngredientStorage } from '@/lib/ingredient-storage'
import { isBeginnerRecipeGeneratedImage } from '@/lib/recipe-images'
import { RECIPE_PREVIEW_CATALOG } from '@/lib/recipe-preview'
import { resolveIngredientCatalogIds } from '@/lib/recipe-api-v1-client'
import { filterPublicationApprovedRecipes } from '@/lib/recipe-publication'
import { STARTER_INGREDIENT_NAMES, buildStarterIngredientPayloads } from '@/lib/starter-ingredients'
import { getDday } from '@/lib/utils'

export default function HomePage() {
  const { isDemoMode: isAppStoreDemo, ready: demoModeReady } = useDemoModeState()
  const {
    ingredients,
    loading: ingredientsLoading,
    error: ingredientsError,
    addIngredient,
    listIngredients,
  } = useIngredients()
  const { group } = useFamilyShare()
  const {
    ingredients: familyIngredients,
    loading: familyIngredientsLoading,
    error: familyIngredientsError,
    listIngredients: listFamilyIngredients,
  } = useIngredients({
    scope: 'family',
    familyGroupId: group?.id ?? null,
    enabled: Boolean(group),
  })
  const displayIngredients = isAppStoreDemo ? APPSTORE_DEMO_INGREDIENTS : ingredients
  const activeDisplayIngredients = useMemo(
    () =>
      displayIngredients
        .filter((item) => !item.consumedAt && !item.discardedAt)
        .map(withNormalizedIngredientStorage),
    [displayIngredients],
  )
  const recipeIngredientIds = useMemo(
    () => resolveIngredientCatalogIds(activeDisplayIngredients.map((item) => item.name)),
    [activeDisplayIngredients],
  )
  const {
    recipes: recipeCatalog,
    loading: recipesLoading,
    error: recipesError,
    refresh: refreshRecipes,
  } = useRecipeCatalog(12, {
    ingredientIds: recipeIngredientIds,
    sort: 'recommended',
    enabled: demoModeReady && !isAppStoreDemo && !ingredientsLoading && activeDisplayIngredients.length > 0,
  })
  const { uncheckedCount } = useShopping()

  const displayRecipeCatalog = useMemo(
    () => filterPublicationApprovedRecipes(isAppStoreDemo ? APPSTORE_DEMO_RECIPES : recipeCatalog),
    [isAppStoreDemo, recipeCatalog],
  )
  const displayUncheckedCount = isAppStoreDemo
    ? APPSTORE_DEMO_SHOPPING_ITEMS.filter((item) => !item.checked).length
    : uncheckedCount
  const beginnerHomeRecipeCatalog = useMemo(() => {
    if (isAppStoreDemo) return displayRecipeCatalog
    return displayRecipeCatalog.filter(
      (recipe) =>
        typeof recipe.difficultyLevel === 'number' &&
        recipe.difficultyLevel <= 2 &&
        typeof recipe.totalMinutes === 'number' &&
        recipe.totalMinutes <= 20 &&
        (recipe.requiredTools?.length ?? Number.POSITIVE_INFINITY) <= 3,
    )
  }, [displayRecipeCatalog, isAppStoreDemo])
  const activeFamilyIngredients = useMemo(
    () => familyIngredients.filter((item) => !item.consumedAt && !item.discardedAt),
    [familyIngredients],
  )

  const expiringIngredients = useMemo(
    () =>
      activeDisplayIngredients
        .filter((item) => getDday(item.expiryDate) <= 3)
        .sort((left, right) => getDday(left.expiryDate) - getDday(right.expiryDate))
        .slice(0, 3),
    [activeDisplayIngredients],
  )
  const storageCounts = useMemo(
    () => ({
      cold: activeDisplayIngredients.filter((item) => item.storageType === '냉장').length,
      frozen: activeDisplayIngredients.filter((item) => item.storageType === '냉동').length,
      room: activeDisplayIngredients.filter((item) => item.storageType === '실온').length,
    }),
    [activeDisplayIngredients],
  )

  const rankedHomeRecipes = useMemo(() => {
    return rankRecipeRecommendations(beginnerHomeRecipeCatalog, activeDisplayIngredients)
      .map(({ recipe, match, score }) => {
        const expiringIngredients = findExpiringMatchedIngredients(match.matchedIngredients, activeDisplayIngredients)
        return {
          ...recipe,
          ...match,
          recommendationScore: score,
          recommendationReason: buildRecipeRecommendationReason({
            recipeName: recipe.name,
            matchedIngredients: match.matchedIngredients,
            missingIngredients: match.missingIngredients,
            expiringIngredients,
          }),
          expiringIngredients,
        }
      })
  }, [activeDisplayIngredients, beginnerHomeRecipeCatalog])
  const rankedFamilyRecipes = useMemo(() => {
    if (!group) {
      return []
    }

    return rankRecipeRecommendations(beginnerHomeRecipeCatalog, activeFamilyIngredients)
      .map(({ recipe, match, score }) => {
        const expiringIngredients = findExpiringMatchedIngredients(match.matchedIngredients, activeFamilyIngredients)
        return {
          ...recipe,
          ...match,
          recommendationScore: score,
          recommendationReason: buildRecipeRecommendationReason({
            recipeName: recipe.name,
            matchedIngredients: match.matchedIngredients,
            missingIngredients: match.missingIngredients,
            expiringIngredients,
          }),
          expiringIngredients,
        }
      })
  }, [activeFamilyIngredients, beginnerHomeRecipeCatalog, group])
  const recommendedRecipes = useMemo(() => rankedHomeRecipes.slice(0, 6), [rankedHomeRecipes])
  const previewRecipes = useMemo(
    () =>
      rankRecipeRecommendations(RECIPE_PREVIEW_CATALOG, activeDisplayIngredients)
        .map(({ recipe, match }) => ({ ...recipe, ...match }))
        .slice(0, 2),
    [activeDisplayIngredients],
  )
  const homeRecipeSections = useMemo(() => {
    const buildSection = (title: string, subtitle: string, recipes: typeof rankedHomeRecipes) => ({
      title,
      subtitle,
      recipes: recipes.slice(0, 6),
    })
    const possibleNow = rankedHomeRecipes.filter((recipe) => getEssentialMissingIngredients(recipe.missingIngredients).length === 0)
    const oneMissing = rankedHomeRecipes.filter((recipe) => getEssentialMissingIngredients(recipe.missingIngredients).length === 1)
    return [
      buildSection(
        '지금 바로 가능',
        '기본 양념 빼고 바로 만들 수 있는 오늘 메뉴',
        possibleNow,
      ),
      buildSection(
        '1개만 사면 가능',
        '핵심 재료 1개만 더 있으면 오늘 만들 수 있어요',
        oneMissing,
      ),
    ].filter((section) => section.recipes.length > 0)
  }, [rankedHomeRecipes])
  const familyRecipeSection = useMemo(() => {
    if (!group) {
      return null
    }

    return {
      title: '가족 냉장고로 만들 수 있는 메뉴',
      subtitle: `${group.name} 재료 기준으로 부족한 재료가 적은 순서`,
      recipes: rankedFamilyRecipes.slice(0, 6),
    }
  }, [group, rankedFamilyRecipes])

  const topRecipe = recommendedRecipes[0]

  const isLoading = ingredientsLoading || recipesLoading
  const isEmptyFridge = activeDisplayIngredients.length === 0
  const hasPublishedRecipes = beginnerHomeRecipeCatalog.length > 0
  const hasRecipePreview = previewRecipes.length > 0
  const visibleRecipeCount = hasPublishedRecipes
    ? displayRecipeCatalog.length
    : RECIPE_PREVIEW_CATALOG.length
  const homeRecoveryKind: 'ingredients' | 'recipes' | null =
    !isAppStoreDemo && !isLoading
      ? ingredientsError && isEmptyFridge
        ? 'ingredients'
        : recipesError && !hasPublishedRecipes && !hasRecipePreview
          ? 'recipes'
          : null
      : null
  const shouldShowStarterAction = isEmptyFridge && homeRecoveryKind === null
  const shouldShowEmptyHome = isEmptyFridge
  const handleRetrySync = () => {
    void listIngredients()
    if (group) {
      void listFamilyIngredients()
    }
    refreshRecipes()
  }

  const addStarterIngredients = async (selectedIngredientNames?: string[]) => {
    const payloads = buildStarterIngredientPayloads(
      ingredients.map((item) => item.name),
      selectedIngredientNames,
    )
    await Promise.all(payloads.map((payload) => addIngredient(payload)))
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-5">
      <section className="mobile-safe-top px-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[11px] font-semibold text-[#9b8979]">냉장고 열고 고민 끝</p>
            <h1 className="mt-1 break-keep text-[21px] font-black leading-tight text-[#2f2117]">있는 재료로 오늘 메뉴 정해요</h1>
          </div>
          <Link
            href={buildHomeHref('/settings#notifications', { demoMode: isAppStoreDemo })}
            aria-label="알림 설정으로 이동"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3]"
          >
            <Bell size={18} className="text-[#3c2b1e]" />
          </Link>
        </div>
      </section>

      <section className="px-5 pt-4">
        {homeRecoveryKind ? (
          <HomeRecoveryCard
            kind={homeRecoveryKind}
            isRetrying={isLoading}
            onRetry={handleRetrySync}
          />
        ) : shouldShowStarterAction ? (
          <StarterActionCard
            demoMode={isAppStoreDemo}
            hasIngredients={!isEmptyFridge}
            onAddStarterIngredients={(selectedNames) => {
              void addStarterIngredients(selectedNames)
            }}
            starterIngredientNames={STARTER_INGREDIENT_NAMES}
            storageCounts={storageCounts}
          />
        ) : !hasPublishedRecipes && (hasRecipePreview || !isLoading) ? (
          <RecipePublicationEmptyCard previewRecipe={previewRecipes[0] ?? null} />
        ) : (
          <TodayActionCard
            demoMode={isAppStoreDemo}
            isLoading={isLoading}
            recipe={topRecipe ?? null}
          />
        )}
      </section>

      <section className="space-y-5 px-5 pt-5">
        {homeRecipeSections.length === 0 ? (
          previewRecipes.length > 0 ? (
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-black text-[#2f2117]">먼저 보는 레시피</h2>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-[#8f7f70]">
                    자체 작성 레시피를 검수 완료 전에 미리 보여드려요.
                  </p>
                </div>
                <Link href="/recipe" className="inline-flex min-h-11 items-center text-[11px] font-black text-[#a66a17]">
                  전체
                </Link>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {previewRecipes.map((recipe) => (
                  <RecipeHomeCard key={`preview-${recipe.id}`} recipe={recipe} compact previewMode />
                ))}
              </div>
            </div>
          ) : isLoading && recommendedRecipes.length === 0 ? (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-black text-[#2f2117]">오늘 만들 메뉴</h2>
                <span className="text-[11px] font-black text-[#9b8979]">불러오는 중</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
                <RecipeCardSkeleton />
                <RecipeCardSkeleton />
              </div>
            </div>
          ) : (
            <EmptyRecommendation demoMode={isAppStoreDemo} hasIngredients={activeDisplayIngredients.length > 0} />
          )
        ) : (
          homeRecipeSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-black text-[#2f2117]">{section.title}</h2>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-[#8f7f70]">{section.subtitle}</p>
                </div>
                <Link href={buildHomeHref('/recipe', { demoMode: isAppStoreDemo })} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-[11px] font-black text-[#a66a17]">
                  전체
                </Link>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
                {section.recipes.map((recipe) => (
                  <RecipeHomeCard key={`${section.title}-${recipe.id}`} demoMode={isAppStoreDemo} recipe={recipe} compact />
                ))}
              </div>
            </div>
          ))
        )}

        <div className="rounded-[18px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-black text-[#2f2117]">다른 메뉴도 보고 싶다면</p>
              <p className="mt-1 break-keep text-[11px] font-semibold leading-4 text-[#8f7f70]">
                시간, 도구, 부족 재료로 지금 할 수 있는 메뉴만 좁혀보세요.
              </p>
            </div>
            <Link
              href={buildHomeHref('/recipe', { demoMode: isAppStoreDemo })}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#2f2117] px-3 text-[12px] font-black text-white"
            >
              메뉴 더 찾기
            </Link>
          </div>
        </div>
      </section>

      {!shouldShowEmptyHome ? (
      <section className="px-5 pt-5">
        <div className="jipbab-panel rounded-[18px] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-black text-[#2f2117]">냉장고에 있는 재료</p>
              <p className="mt-1 text-[11px] font-semibold text-[#8f7f70]">
                {isLoading ? '동기화 중' : `보관 ${activeDisplayIngredients.length}개 · 소진임박 ${expiringIngredients.length}개`}
              </p>
            </div>
            <Link
              href={buildHomeHref('/fridge?add=1', { demoMode: isAppStoreDemo })}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full bg-[#ea5a1f] px-3 text-[12px] font-black text-white"
            >
              <Plus size={14} />
              재료 추가
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <FridgeCount label="냉장" value={storageCounts.cold} />
            <FridgeCount label="냉동" value={storageCounts.frozen} />
            <FridgeCount label="실온" value={storageCounts.room} />
          </div>
          <FridgeIllustration ingredients={activeDisplayIngredients} compact maxItemsPerZone={10} />
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
            <Link
              href={buildHomeHref('/fridge', { demoMode: isAppStoreDemo })}
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2f2117] text-[13px] font-black text-white"
            >
              <Refrigerator size={16} />
              내 냉장고 보기
            </Link>
            <Link
              href={buildHomeHref('/recipe', { demoMode: isAppStoreDemo })}
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#fff0e4] text-[13px] font-black text-[#d94d19]"
            >
              <Search size={16} />
              메뉴 더 찾기
            </Link>
          </div>
        </div>
      </section>
      ) : null}

      {!shouldShowEmptyHome ? (
      <section className="px-5 pt-5">
        <div className="jipbab-panel rounded-[16px] p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[16px] font-black text-[#2f2117]">
                {familyRecipeSection?.title ?? '가족 냉장고 없음'}
              </h2>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-[#8f7f70]">
                {familyRecipeSection?.subtitle ?? '가족 냉장고를 만들면 가족 재료 기준으로 쉬운 메뉴를 추천해요.'}
              </p>
            </div>
            <Link href={buildHomeHref('/family', { demoMode: isAppStoreDemo })} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-[11px] font-black text-[#a66a17]">
              가족
            </Link>
          </div>
          {familyIngredientsError ? (
            <div className="mt-3 rounded-[14px] border border-[#ffd1bd] bg-[#fff0e4] px-3 py-3">
              <p className="text-[12px] font-bold leading-5 text-[#7d3f18]">
                {familyIngredientsError.message}
              </p>
              <button
                type="button"
                onClick={() => void listFamilyIngredients()}
                className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full bg-[#2f2117] px-3 text-[11px] font-black text-white"
              >
                <RefreshCw size={13} />
                재시도
              </button>
            </div>
          ) : familyRecipeSection && familyRecipeSection.recipes.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
              {familyRecipeSection.recipes.map((recipe) => (
                <RecipeHomeCard key={`family-${recipe.id}`} demoMode={isAppStoreDemo} recipe={recipe} compact scope="family" />
              ))}
            </div>
          ) : group && familyIngredientsLoading ? (
            <div className="mt-3 grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
              <RecipeCardSkeleton />
              <RecipeCardSkeleton />
            </div>
          ) : group ? (
            <p className="mt-3 rounded-[14px] bg-[#fff7ed] px-3 py-3 text-[12px] font-bold leading-5 text-[#8f7f70]">
              가족 냉장고 재료가 비어 있어요. 가족 재료를 추가하면 부족 재료가 적은 메뉴부터 보여드릴게요.
            </p>
          ) : (
            <Link
              href={buildHomeHref('/family', { demoMode: isAppStoreDemo })}
              className="mt-3 flex min-h-11 items-center justify-center rounded-[13px] bg-[#2f2117] px-3 text-[12px] font-black text-white"
            >
              가족 냉장고 만들기
            </Link>
          )}
        </div>
      </section>
      ) : null}

      {!shouldShowEmptyHome ? (
      <section className="grid grid-cols-3 gap-2 px-5 pt-5">
        <QuickLink href={buildHomeHref('/fridge', { demoMode: isAppStoreDemo })} icon={<Refrigerator size={18} />} label="냉장고" value={`${activeDisplayIngredients.length}개`} />
        <QuickLink href={buildHomeHref('/recipe', { demoMode: isAppStoreDemo })} icon={<Utensils size={18} />} label="메뉴" value={`${visibleRecipeCount}개`} />
        <QuickLink href={buildHomeHref('/shopping', { demoMode: isAppStoreDemo })} icon={<Search size={18} />} label="장보기" value={`${displayUncheckedCount}개`} />
      </section>
      ) : null}
    </div>
  )
}

function FridgeCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-[#fff7ed] px-2 py-2 text-center">
      <p className="text-[10px] font-black text-[#9b8979]">{label}</p>
      <p className="mt-0.5 text-[15px] font-black text-[#2f2117]">{value}개</p>
    </div>
  )
}

function RecipeHomeCard({
  demoMode = false,
  recipe,
  compact = false,
  scope = 'personal',
  previewMode = false,
}: {
  demoMode?: boolean
  recipe: {
    id: string
    name: string
    thumbnailUrl: string | null
    missingIngredients: string[]
    totalMinutes?: number | null
    difficultyLevel?: number | null
    beginnerScore?: number | null
    requiredTools?: string[]
    noFire?: boolean | null
    microwave?: boolean | null
  }
  compact?: boolean
  scope?: 'personal' | 'family'
  previewMode?: boolean
}) {
  const missingCount = getEssentialMissingIngredients(recipe.missingIngredients).length
  const detailPath = previewMode ? `/recipe/preview/${recipe.id}` : `/recipe/${recipe.id}`
  const recipeHref = buildHomeHref(detailPath, {
    demoMode,
    params: scope === 'family' ? { scope } : undefined,
  })
  const shoppingHref = buildHomeHref(`/recipe/${recipe.id}`, {
    demoMode,
    hash: 'shopping-assistant',
    params: scope === 'family' ? { scope } : undefined,
  })
  const thumbnailUrl = recipe.thumbnailUrl
  const isGeneratedRecipeImage = isBeginnerRecipeGeneratedImage(thumbnailUrl)
  return (
    <article className="h-full overflow-hidden rounded-[16px] bg-[#fffaf3] shadow-[0_8px_22px_rgba(76,51,28,0.08)]">
      <Link href={recipeHref} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#ecd5bd]">
          <span className="grid h-full place-items-center gap-1 text-[12px] font-black text-[#9b8979]">
            <Utensils size={18} />
            이미지 없음
          </span>
          {thumbnailUrl ? (
            <RecipeImage
              src={thumbnailUrl}
              alt={recipe.name}
              className="absolute inset-0"
              imageClassName={`h-full w-full ${isGeneratedRecipeImage ? 'object-contain p-1' : 'object-cover'}`}
            />
          ) : null}
        </div>
      </Link>
      <div className="px-3 py-3">
        <Link href={recipeHref} className="block min-w-0">
          <h3 className="line-clamp-2 min-h-10 text-[14px] font-black leading-5 text-[#2f2117]">{recipe.name}</h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-[#7d6d5f]">
          <span className="inline-flex items-center gap-1">
            <Clock3 size={12} />
            {typeof recipe.totalMinutes === 'number' ? `${recipe.totalMinutes}분` : '시간 미표시'}
          </span>
          <span className="inline-flex items-center gap-1 text-[#a66a17]">
            <ChefHat size={13} className="shrink-0" />
            {formatHomeDifficulty(recipe.difficultyLevel)}
          </span>
        </div>
        {previewMode ? (
          <p className="mt-1.5 truncate text-[12px] font-black text-[#d94d19]">조리 검수 중</p>
        ) : (
          <>
            <p className="mt-1.5 truncate text-[12px] font-black text-[#3d7b38]">
              {missingCount === 0 ? '지금 만들 수 있음' : missingCount <= 2 ? `조금만 사면 가능 · ${missingCount}개` : `부족 ${missingCount}개`}
            </p>
            <p className="mt-1 truncate text-[12px] font-black text-[#a66a17]">
              {getBeginnerRecipeBadge(recipe)}
            </p>
          </>
        )}
        {!compact ? (
          <div className="mt-2 grid grid-cols-[1fr_1fr] gap-1.5">
            <Link
              href={recipeHref}
              className="flex min-h-11 items-center justify-center rounded-[11px] bg-[#2f2117] px-2 text-[13px] font-black text-white"
            >
              지금 만들기
            </Link>
            <Link
              href={shoppingHref}
              className="flex min-h-11 items-center justify-center gap-1 rounded-[11px] bg-[#fff0e4] px-2 text-[13px] font-black text-[#d94d19]"
            >
              <ShoppingBasket size={13} />
              장보기
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function formatHomeDifficulty(difficultyLevel?: number | null): string {
  if (typeof difficultyLevel !== 'number') {
    return '난이도 미표시'
  }
  if (difficultyLevel <= 1) {
    return '난이도 쉬움'
  }
  if (difficultyLevel === 2) {
    return '난이도 보통'
  }
  return '난이도 어려움'
}

function getBeginnerRecipeBadge(recipe: {
  noFire?: boolean | null
  microwave?: boolean | null
  requiredTools?: string[]
  totalMinutes?: number | null
}) {
  if (recipe.noFire) {
    return '불 없이'
  }
  if (recipe.microwave) {
    return '전자레인지'
  }
  if (recipe.requiredTools?.some((tool) => tool.includes('프라이팬'))) {
    return '팬 1개'
  }
  if (typeof recipe.totalMinutes === 'number') {
    return `${recipe.totalMinutes}분 안심`
  }
  return '초보 검수'
}

function RecipeCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[16px] bg-[#fffaf3] shadow-[0_8px_22px_rgba(76,51,28,0.08)]" aria-label="추천 레시피 불러오는 중">
      <div className="aspect-[4/3] animate-pulse bg-[#ecd5bd]" />
      <div className="px-2.5 py-2">
        <div className="h-3.5 w-20 animate-pulse rounded-full bg-[#eadcc9]" />
        <div className="mt-2 h-3 w-14 animate-pulse rounded-full bg-[#f2dfc8]" />
      </div>
    </article>
  )
}

function EmptyRecommendation({ demoMode = false, hasIngredients }: { demoMode?: boolean; hasIngredients: boolean }) {
  return (
    <div className="jipbab-panel col-span-full rounded-[16px] px-4 py-4">
      <p className="text-[13px] font-black text-[#2f2117]">
        {hasIngredients ? '현재 공개 가능한 레시피를 준비 중이에요.' : '재료만 골라도 추천이 열려요.'}
      </p>
      <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#8f7f70]">
        {hasIngredients
          ? '검수와 출처 확인을 마친 레시피만 보여드려요. 준비가 끝나면 바로 추천할게요.'
          : '냉장고에 있는 것부터 눌러보세요. 수량은 나중에 정리해도 괜찮아요.'}
      </p>
      <Link
        href={buildHomeHref(hasIngredients ? '/recipe' : '/fridge?add=1', { demoMode })}
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-[#ea5a1f] px-4 text-[12px] font-black text-white"
      >
        {hasIngredients ? '레시피 화면 확인' : '재료 고르기'}
      </Link>
    </div>
  )
}

function RecipePublicationEmptyCard({
  previewRecipe,
}: {
  previewRecipe: {
    id: string
    name: string
    thumbnailUrl: string | null
    totalMinutes?: number | null
  } | null
}) {
  return (
    <section className="rounded-[22px] border border-[#eadcc9] bg-[#fffaf3] px-5 py-6 shadow-[0_10px_24px_rgba(54,38,24,0.06)]">
      <p className="text-[12px] font-bold text-[#d94d19]">레시피 미리보기</p>
      <h2 className="mt-2 break-keep text-[22px] font-black leading-[1.2] text-[#2f2117]">
        레시피를 먼저 둘러볼 수 있어요.
      </h2>
      <p className="mt-3 break-keep text-[14px] font-semibold leading-6 text-[#7d6d5f]">
        집밥노트가 직접 작성한 레시피예요. 실제 조리 검수가 끝날 때까지 추천과 조리 시작은 잠겨 있어요.
      </p>
      {previewRecipe ? (
        <Link
          href={`/recipe/preview/${previewRecipe.id}`}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f2117] px-4 text-[14px] font-black text-white"
        >
          {previewRecipe.name} · {previewRecipe.totalMinutes ?? '시간 미표시'}분 보기
        </Link>
      ) : (
        <Link
          href="/recipe"
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-[15px] bg-[#2f2117] px-4 text-[14px] font-black text-white"
        >
          레시피 미리보기 열기
        </Link>
      )}
    </section>
  )
}

function HomeRecoveryCard({
  kind,
  isRetrying,
  onRetry,
}: {
  kind: 'ingredients' | 'recipes'
  isRetrying: boolean
  onRetry: () => void
}) {
  const title = kind === 'ingredients' ? '냉장고를 불러오지 못했어요' : '메뉴 추천을 불러오지 못했어요'
  const description =
    kind === 'ingredients'
      ? '입력한 재료는 변경되지 않았어요. 잠시 후 다시 시도해 주세요.'
      : '냉장고 재료는 그대로예요. 잠시 후 다시 시도해 주세요.'

  return (
    <section
      role="alert"
      className="rounded-[22px] border border-[#ffd1bd] bg-[#fffaf3] px-5 py-6 shadow-[0_10px_24px_rgba(54,38,24,0.06)]"
    >
      <AlertTriangle size={22} aria-hidden="true" className="text-[#d94d19]" />
      <h2 className="mt-3 break-keep text-[22px] font-black leading-[1.2] text-[#2f2117]">{title}</h2>
      <p className="mt-3 break-keep text-[14px] font-semibold leading-6 text-[#7d6d5f]">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f2117] px-4 text-[14px] font-black text-white disabled:cursor-wait disabled:opacity-65"
      >
        <RefreshCw size={16} aria-hidden="true" className={isRetrying ? 'animate-spin' : undefined} />
        {isRetrying ? '다시 시도 중' : '다시 시도'}
      </button>
    </section>
  )
}

function QuickLink({
  href,
  icon,
  label,
  value,
}: {
  href: string
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <Link href={href} className="flex min-h-[88px] flex-col items-center justify-center rounded-[14px] border border-[#eadcc9] bg-white px-2 py-3 text-center transition-colors hover:bg-[#fffaf3]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e4] text-[#d94d19]">{icon}</span>
      <span className="mt-2 text-[11px] font-bold text-[#7d6d5f]">{label}</span>
      <span className="mt-0.5 text-[13px] font-black text-[#2f2117]">{value}</span>
    </Link>
  )
}
