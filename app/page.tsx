// 이 파일은 홈 화면을 담당하며 참고 이미지의 앱스토어형 첫 화면을 구현합니다.
'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  AlertTriangle,
  Bell,
  Clock3,
  Plus,
  Refrigerator,
  RefreshCw,
  Search,
  ShoppingBasket,
  Star,
  Utensils,
} from 'lucide-react'

import StarterActionCard from '@/components/home/StarterActionCard'
import TodayActionCard from '@/components/home/TodayActionCard'
import { useDemoMode } from '@/hooks/useDemoMode'
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
import { filterBeginnerHomeRecipes } from '@/lib/beginner-recipe-contract'
import { CURATED_RECIPE_RECORDS, ONBOARDING_RECIPE_10_NAMES, RELEASE_RECIPE_30_NAMES } from '@/lib/curated-recipes'
import { buildHomeHref } from '@/lib/home-actions'
import { isBeginnerRecipeGeneratedImage } from '@/lib/recipe-images'
import { STARTER_INGREDIENT_NAMES, buildStarterIngredientPayloads } from '@/lib/starter-ingredients'
import { getDday, getIngredientPhotoUrl } from '@/lib/utils'
import type { IngredientRecord } from '@/types'

const FALLBACK_RECIPE_IMAGE =
  '/images/recipes/kimchi-fried-rice.png'
const HOME_FRIDGE_IMAGE = '/images/fridge-freezer-board-animated.png'

type StorageCounts = {
  cold: number
  frozen: number
  room: number
}

export default function HomePage() {
  const isAppStoreDemo = useDemoMode()
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
  const {
    recipes: recipeCatalog,
    loading: recipesLoading,
    error: recipesError,
    refresh: refreshRecipes,
  } = useRecipeCatalog(12)
  const { uncheckedCount } = useShopping()

  const displayIngredients = isAppStoreDemo ? APPSTORE_DEMO_INGREDIENTS : ingredients
  const displayRecipeCatalog = isAppStoreDemo ? APPSTORE_DEMO_RECIPES : recipeCatalog
  const displayUncheckedCount = isAppStoreDemo
    ? APPSTORE_DEMO_SHOPPING_ITEMS.filter((item) => !item.checked).length
    : uncheckedCount
  const onboardingRecipeCatalog = useMemo(() => {
    const byName = new Map(CURATED_RECIPE_RECORDS.map((recipe) => [recipe.name, recipe]))
    return ONBOARDING_RECIPE_10_NAMES
      .map((recipeName) => byName.get(recipeName))
      .filter((recipe): recipe is (typeof CURATED_RECIPE_RECORDS)[number] => Boolean(recipe))
  }, [])
  const releaseRecipeCatalog = useMemo(() => {
    const byName = new Map(CURATED_RECIPE_RECORDS.map((recipe) => [recipe.name, recipe]))
    return RELEASE_RECIPE_30_NAMES
      .map((recipeName) => byName.get(recipeName))
      .filter((recipe): recipe is (typeof CURATED_RECIPE_RECORDS)[number] => Boolean(recipe))
  }, [])
  const beginnerHomeRecipeCatalog = useMemo(() => {
    if (isAppStoreDemo) {
      return displayRecipeCatalog
    }

    const safeRecipes = filterBeginnerHomeRecipes(displayRecipeCatalog)
    const onboardingRecipeIds = new Set(onboardingRecipeCatalog.map((recipe) => recipe.id))
    const releaseRecipeIds = new Set(releaseRecipeCatalog.map((recipe) => recipe.id))
    const mergedHomeRecipes = [
      ...onboardingRecipeCatalog,
      ...releaseRecipeCatalog.filter((recipe) => !onboardingRecipeIds.has(recipe.id)),
      ...safeRecipes.filter((recipe) => !onboardingRecipeIds.has(recipe.id) && !releaseRecipeIds.has(recipe.id)),
    ]

    return mergedHomeRecipes.length > 0
      ? mergedHomeRecipes
      : filterBeginnerHomeRecipes(CURATED_RECIPE_RECORDS).slice(0, 30)
  }, [displayRecipeCatalog, isAppStoreDemo, onboardingRecipeCatalog, releaseRecipeCatalog])

  const activeDisplayIngredients = useMemo(
    () => displayIngredients.filter((item) => !item.consumedAt && !item.discardedAt),
    [displayIngredients],
  )
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
        '물, 소금, 간장 같은 기본 재료를 빼고 부족한 재료가 없는 메뉴',
        possibleNow,
      ),
      buildSection(
        '1개만 사면 가능',
        '집에 있는 재료는 맞고 핵심 재료 1개만 더 필요한 메뉴',
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
  const shouldShowStarterAction = isEmptyFridge || (!isLoading && !topRecipe)
  const shouldShowEmptyHome = isEmptyFridge
  const syncErrorMessage = !isAppStoreDemo ? ingredientsError?.message ?? recipesError : null
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
          <div>
            <p className="text-[11px] font-semibold text-[#9b8979]">오늘 집밥 바로 시작</p>
            <h1 className="mt-1 text-[22px] font-black text-[#2f2117]">냉장고에 있는 걸로 만들어요</h1>
          </div>
          <Link
            href={buildHomeHref('/settings#notifications', { demoMode: isAppStoreDemo })}
            aria-label="알림 설정으로 이동"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3]"
          >
            <Bell size={18} className="text-[#3c2b1e]" />
          </Link>
        </div>
      </section>

      <section className="px-5 pt-4">
        {shouldShowStarterAction ? (
          <StarterActionCard
            demoMode={isAppStoreDemo}
            hasIngredients={!isEmptyFridge}
            onAddStarterIngredients={(selectedNames) => {
              void addStarterIngredients(selectedNames)
            }}
            starterIngredientNames={STARTER_INGREDIENT_NAMES}
            storageCounts={storageCounts}
          />
        ) : (
          <TodayActionCard
            demoMode={isAppStoreDemo}
            isLoading={isLoading}
            recipe={topRecipe ?? null}
          />
        )}
        {syncErrorMessage ? (
          <div className="mt-3 flex items-start gap-3 rounded-[16px] border border-[#ffd1bd] bg-[#fff0e4] px-3 py-3" role="status">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#d94d19]" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black text-[#4b3929]">동기화가 지연되고 있어요</p>
              <p className="mt-1 break-keep text-[11px] font-semibold leading-5 text-[#8f7f70]">
                {syncErrorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetrySync}
              className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-[#2f2117] px-3 text-[11px] font-black text-white"
            >
              <RefreshCw size={13} />
              재시도
            </button>
          </div>
        ) : null}
      </section>

      {!shouldShowEmptyHome ? (
      <section className="px-5 pt-3">
        <div className="jipbab-panel rounded-[18px] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-black text-[#2f2117]">냉장고 현황</p>
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
          <HomeFridgePreview ingredients={activeDisplayIngredients} storageCounts={storageCounts} />
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
            <Link
              href={buildHomeHref('/fridge', { demoMode: isAppStoreDemo })}
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2f2117] text-[13px] font-black text-white"
            >
              <Refrigerator size={16} />
              냉장고 전체
            </Link>
            <Link
              href={buildHomeHref('/recipe', { demoMode: isAppStoreDemo })}
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#fff0e4] text-[13px] font-black text-[#d94d19]"
            >
              <Search size={16} />
              레시피 필터
            </Link>
          </div>
        </div>
      </section>
      ) : null}

      {!shouldShowEmptyHome ? (
      <section className="space-y-5 px-5 pt-5">
        {isLoading && recommendedRecipes.length === 0 ? (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-black text-[#2f2117]">오늘 추천 메뉴</h2>
              <span className="text-[11px] font-black text-[#9b8979]">불러오는 중</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
              <RecipeCardSkeleton />
              <RecipeCardSkeleton />
            </div>
          </div>
        ) : homeRecipeSections.length === 0 ? (
          <EmptyRecommendation demoMode={isAppStoreDemo} hasIngredients={activeDisplayIngredients.length > 0} />
        ) : (
          homeRecipeSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-black text-[#2f2117]">{section.title}</h2>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-[#8f7f70]">{section.subtitle}</p>
                </div>
                <Link href={buildHomeHref('/recipe', { demoMode: isAppStoreDemo })} className="inline-flex min-h-9 min-w-11 shrink-0 items-center justify-center text-[11px] font-black text-[#a66a17]">
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
              <p className="text-[12px] font-black text-[#2f2117]">더 고르고 싶다면</p>
              <p className="mt-1 break-keep text-[11px] font-semibold leading-4 text-[#8f7f70]">
                시간, 도구, 난이도는 레시피 목록의 상세 필터에서 좁혀보세요.
              </p>
            </div>
            <Link
              href={buildHomeHref('/recipe', { demoMode: isAppStoreDemo })}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#2f2117] px-3 text-[12px] font-black text-white"
            >
              필터 열기
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
            <Link href={buildHomeHref('/family', { demoMode: isAppStoreDemo })} className="inline-flex min-h-9 min-w-11 shrink-0 items-center justify-center text-[11px] font-black text-[#a66a17]">
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
                className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-full bg-[#2f2117] px-3 text-[11px] font-black text-white"
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
        <QuickLink href={buildHomeHref('/recipe', { demoMode: isAppStoreDemo })} icon={<Utensils size={18} />} label="레시피" value={`${displayRecipeCatalog.length}개`} />
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

function HomeFridgePreview({
  ingredients,
  storageCounts,
}: {
  ingredients: IngredientRecord[]
  storageCounts: StorageCounts
}) {
  const coldItems = ingredients.filter((item) => item.storageType === '냉장')
  const frozenItems = ingredients.filter((item) => item.storageType === '냉동')
  const coldOverflowCount = Math.max(0, coldItems.length - 16)
  const frozenOverflowCount = Math.max(0, frozenItems.length - 8)
  const coldIngredients = coldItems.slice(0, coldOverflowCount > 0 ? 15 : 16)
  const frozenIngredients = frozenItems.slice(0, frozenOverflowCount > 0 ? 7 : 8)
  const previewWidth = getHomeFridgePreviewWidth()

  return (
    <div
      data-testid="home-fridge-preview"
      className="relative mt-3 overflow-hidden rounded-[18px] bg-white"
    >
      <Image
        src={HOME_FRIDGE_IMAGE}
        alt="냉장실과 냉동실이 함께 보이는 내 냉장고"
        width={887}
        height={1774}
        sizes="(max-width: 430px) 318px, 360px"
        className="h-auto w-full"
      />
      <div
        className="absolute rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-[#2f2117] shadow-[0_8px_16px_rgba(76,51,28,0.10)]"
        style={{ left: 16, top: 16 }}
      >
        냉장 재료 <span className="text-[#8f7f70]">{storageCounts.cold}개</span>
      </div>
      {storageCounts.frozen > 0 ? (
        <div
          className="absolute rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-[#2f2117] shadow-[0_8px_16px_rgba(76,51,28,0.10)]"
          style={{ bottom: 96, left: 16 }}
        >
          냉동 <span className="text-[#8f7f70]">{storageCounts.frozen}개</span>
        </div>
      ) : null}
      {coldIngredients.length > 0 || coldOverflowCount > 0 ? (
        <div
          className="absolute grid content-start"
          style={{
            gap: '5px 2px',
            gridTemplateColumns: 'repeat(6, 32px)',
            left: '50%',
            top: 76,
            transform: 'translateX(-50%)',
            width: previewWidth,
          }}
        >
          {coldIngredients.map((item) => (
            <HomeFridgeIngredientTile key={item.id} ingredient={item} />
          ))}
          {coldOverflowCount > 0 ? <HomeFridgeMoreTile count={coldOverflowCount} /> : null}
        </div>
      ) : null}
      {frozenIngredients.length > 0 || frozenOverflowCount > 0 ? (
        <div
          className="absolute grid content-start"
          style={{
            bottom: 96,
            gap: '5px 2px',
            gridTemplateColumns: 'repeat(6, 32px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: previewWidth,
          }}
        >
          {frozenIngredients.map((item) => (
            <HomeFridgeIngredientTile key={item.id} ingredient={item} />
          ))}
          {frozenOverflowCount > 0 ? <HomeFridgeMoreTile count={frozenOverflowCount} /> : null}
        </div>
      ) : null}
    </div>
  )
}

function getHomeFridgePreviewWidth() {
  return 6 * 32 + 5 * 2
}

function HomeFridgeIngredientTile({ ingredient }: { ingredient: IngredientRecord }) {
  const displayName = getHomeFridgeIngredientDisplayName(ingredient.name)

  return (
    <div className="w-8 min-w-0 px-0 py-0.5 text-center">
      <Image
        src={getIngredientPhotoUrl(ingredient.name, ingredient.category)}
        alt={ingredient.name}
        width={30}
        height={30}
        sizes="30px"
        className="mx-auto h-6 w-6 object-contain mix-blend-multiply drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]"
      />
      <p
        className="mt-0.5 text-[8px] font-black text-[#2f2117] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]"
        style={{ lineHeight: '9px', overflowWrap: 'anywhere', wordBreak: 'break-all' }}
      >
        {displayName}
      </p>
    </div>
  )
}

function getHomeFridgeIngredientDisplayName(name: string) {
  return name.replace(/\s+/g, '').slice(0, 4)
}

function HomeFridgeMoreTile({ count }: { count: number }) {
  return (
    <div className="flex min-h-10 w-8 items-center justify-center px-0 text-center text-[10px] font-black leading-3 text-[#2f2117] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
      +{count}개
    </div>
  )
}

function RecipeHomeCard({
  demoMode = false,
  recipe,
  compact = false,
  scope = 'personal',
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
}) {
  const missingCount = getEssentialMissingIngredients(recipe.missingIngredients).length
  const recipeHref = buildHomeHref(`/recipe/${recipe.id}`, {
    demoMode,
    params: scope === 'family' ? { scope } : undefined,
  })
  const shoppingHref = buildHomeHref(`/recipe/${recipe.id}`, {
    demoMode,
    hash: 'shopping-assistant',
    params: scope === 'family' ? { scope } : undefined,
  })
  const thumbnailUrl = recipe.thumbnailUrl || FALLBACK_RECIPE_IMAGE
  const isGeneratedRecipeImage = isBeginnerRecipeGeneratedImage(thumbnailUrl)
  return (
    <article className="h-full overflow-hidden rounded-[16px] bg-[#fffaf3] shadow-[0_8px_22px_rgba(76,51,28,0.08)]">
      <Link href={recipeHref} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#ecd5bd]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={recipe.name}
            onError={(event) => {
              event.currentTarget.src = FALLBACK_RECIPE_IMAGE
            }}
            className={`h-full w-full ${isGeneratedRecipeImage ? 'object-contain p-1' : 'object-cover'}`}
          />
        </div>
      </Link>
      <div className="px-2.5 py-2">
        <Link href={recipeHref} className="block min-w-0">
          <h3 className="line-clamp-2 min-h-8 text-[12px] font-black leading-4 text-[#2f2117]">{recipe.name}</h3>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#7d6d5f]">
          <span className="inline-flex items-center gap-1">
            <Clock3 size={10} />
            {recipe.totalMinutes ?? 10}분
          </span>
          <span className="inline-flex items-center gap-1 text-[#a66a17]">
            <Star size={10} className="shrink-0 fill-[#f0a51c] text-[#f0a51c]" />
            {typeof recipe.beginnerScore === 'number' ? recipe.beginnerScore : '쉬움'}
          </span>
        </div>
        <p className="mt-1 truncate text-[10px] font-black text-[#3d7b38]">
          {missingCount === 0 ? '지금 가능' : missingCount <= 2 ? `조금만 사면 가능 · ${missingCount}개` : `부족 ${missingCount}개`}
        </p>
        <p className="mt-1 truncate text-[10px] font-black text-[#a66a17]">
          {getBeginnerRecipeBadge(recipe)}
        </p>
        {!compact ? (
          <div className="mt-2 grid grid-cols-[1fr_1fr] gap-1.5">
            <Link
              href={recipeHref}
              className="flex min-h-9 items-center justify-center rounded-[11px] bg-[#2f2117] px-2 text-[11px] font-black text-white"
            >
              지금 만들기
            </Link>
            <Link
              href={shoppingHref}
              className="flex min-h-9 items-center justify-center gap-1 rounded-[11px] bg-[#fff0e4] px-2 text-[11px] font-black text-[#d94d19]"
            >
              <ShoppingBasket size={11} />
              장보기
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function getBeginnerRecipeBadge(recipe: {
  noFire?: boolean | null
  microwave?: boolean | null
  requiredTools?: string[]
  totalMinutes?: number | null
}) {
  if (recipe.noFire) {
    return '불 없이 가능'
  }
  if (recipe.microwave) {
    return '전자레인지 가능'
  }
  if (recipe.requiredTools?.some((tool) => tool.includes('프라이팬'))) {
    return '팬 1개'
  }
  if (typeof recipe.totalMinutes === 'number') {
    return `${recipe.totalMinutes}분 완성`
  }
  return '초보 가능'
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
        {hasIngredients ? '조건에 맞는 추천이 아직 없어요.' : '재료를 담으면 추천이 열려요.'}
      </p>
      <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#8f7f70]">
        {hasIngredients
          ? '레시피를 새로 불러오거나 재료를 더 추가해 보세요.'
          : '냉장고에 있는 재료를 먼저 등록해 보세요.'}
      </p>
      <Link
        href={buildHomeHref(hasIngredients ? '/recipe' : '/fridge?add=1', { demoMode })}
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-[#ea5a1f] px-4 text-[12px] font-black text-white"
      >
        {hasIngredients ? '레시피 보기' : '재료 추가'}
      </Link>
    </div>
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
