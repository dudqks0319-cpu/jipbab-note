// 이 파일은 홈 화면을 담당하며 참고 이미지의 앱스토어형 첫 화면을 구현합니다.
'use client'

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

import FridgeIllustration from '@/components/fridge/FridgeIllustration'
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
import { isBeginnerRecipeGeneratedImage } from '@/lib/recipe-images'
import { STARTER_INGREDIENT_NAMES, buildStarterIngredientPayloads } from '@/lib/starter-ingredients'
import { getDday } from '@/lib/utils'

const FALLBACK_RECIPE_IMAGE =
  '/images/recipes/kimchi-fried-rice.png'

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
    const possibleNow = rankedHomeRecipes.filter((recipe) => recipe.missingIngredients.length === 0)
    return [
      buildSection(
        '오늘 바로 가능한 메뉴',
        '부족 재료가 없거나 거의 없는 쉬운 메뉴',
        possibleNow.length > 0 ? possibleNow : rankedHomeRecipes,
      ),
      buildSection('냉장고 재료로 가능한 쉬운 요리', '있는 재료가 많이 겹치는 순서', rankedHomeRecipes),
      buildSection('불 없이 가능한 메뉴', '칼과 불이 부담스러운 날', rankedHomeRecipes.filter((recipe) => recipe.noFire)),
      buildSection('전자레인지로 끝나는 메뉴', '팬 없이 짧게 확인하며 만드는 메뉴', rankedHomeRecipes.filter((recipe) => recipe.microwave)),
      buildSection('계란으로 한 끼', '계란이나 달걀이 있으면 시작하기 쉬운 메뉴', rankedHomeRecipes.filter((recipe) => recipe.name.includes('계란') || recipe.name.includes('달걀'))),
      buildSection('김치로 한 끼', '김치가 있을 때 밥과 국물로 연결', rankedHomeRecipes.filter((recipe) => recipe.name.includes('김치'))),
      buildSection('두부/저렴 재료', '두부, 콩나물, 감자로 만드는 부담 적은 메뉴', rankedHomeRecipes.filter((recipe) => /두부|콩나물|감자/.test(recipe.name))),
      buildSection('10분 반찬', '빠르게 곁들이는 무침, 볶음, 부침', rankedHomeRecipes.filter((recipe) => (recipe.totalMinutes ?? 99) <= 10 && /무침|볶음|부침|구이|냉두부/.test(recipe.name))),
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
  const topMatchedExpiringIngredient = topRecipe?.expiringIngredients?.[0] ?? null
  const topEssentialMissingCount = topRecipe
    ? getEssentialMissingIngredients(topRecipe.missingIngredients).length
    : 0

  const isLoading = ingredientsLoading || recipesLoading
  const syncErrorMessage = !isAppStoreDemo ? ingredientsError?.message ?? recipesError : null
  const handleRetrySync = () => {
    void listIngredients()
    if (group) {
      void listFamilyIngredients()
    }
    refreshRecipes()
  }

  const addStarterIngredients = async () => {
    const payloads = buildStarterIngredientPayloads(ingredients.map((item) => item.name))
    await Promise.all(payloads.map((payload) => addIngredient(payload)))
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-5">
      <section className="mobile-safe-top px-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#9b8979]">소진임박 재료부터</p>
            <h1 className="mt-1 text-[20px] font-black text-[#ea5a1f]">집밥노트</h1>
          </div>
          <Link
            href="/settings#notifications"
            aria-label="알림 설정으로 이동"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3]"
          >
            <Bell size={18} className="text-[#3c2b1e]" />
          </Link>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="mb-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black text-[#9b8979]">있는 재료로 먼저 결정해요</p>
              <h2 className="mt-1 text-[20px] font-black text-[#2f2117]">냉장고부터 볼게요</h2>
            </div>
            <span className="rounded-full bg-[#fff0e4] px-3 py-1.5 text-[11px] font-black text-[#d94d19]">
              {isLoading ? '동기화 중' : `보관 ${activeDisplayIngredients.length}개`}
            </span>
          </div>
          <FridgeIllustration ingredients={activeDisplayIngredients} compact maxItemsPerZone={4} />
          {expiringIngredients.length > 0 ? (
            <div className="mt-3 rounded-[16px] border border-[#ffd1bd] bg-[#fff0e4] px-3 py-3">
              <p className="text-[12px] font-black text-[#7d3f18]">오늘 먼저 쓰기</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {expiringIngredients.map((item) => (
                  <span key={item.id} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#d94d19]">
                    {item.name} {getDday(item.expiryDate) <= 0 ? '오늘까지' : `D-${getDday(item.expiryDate)}`}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {topRecipe ? (
          <div className="mb-4 rounded-[20px] bg-[#2f2117] px-4 py-4 text-white shadow-[0_14px_28px_rgba(47,33,23,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[#ffd8a8]">오늘 뭐 먹지?</p>
                <h2 className="mt-1 line-clamp-1 text-[22px] font-black">{topRecipe.name} 추천</h2>
                <p className="mt-2 text-[12px] font-semibold leading-5 text-[#f4dfc8]">
                  {topRecipe.recommendationReason}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-black text-[#ffe0b7]">
                {topEssentialMissingCount === 0 ? '지금 가능' : `부족 ${topEssentialMissingCount}개`}
              </span>
            </div>
            {topMatchedExpiringIngredient ? (
              <p className="mt-3 rounded-[13px] bg-white/10 px-3 py-2 text-[12px] font-bold text-[#ffe7c9]">
                {topMatchedExpiringIngredient} 먼저 쓰기 좋아요.
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-[1.15fr_0.85fr] gap-2">
              <Link
                href={`/recipe/${topRecipe.id}`}
                className="flex min-h-11 items-center justify-center rounded-[13px] bg-[#ea5a1f] text-[13px] font-black text-white"
              >
                요리 시작
              </Link>
              <Link
                href={`/recipe/${topRecipe.id}#shopping-assistant`}
                className="flex min-h-11 items-center justify-center rounded-[13px] border border-white/18 bg-white/10 text-[13px] font-black text-[#ffe7c9]"
              >
                부족 재료
              </Link>
            </div>
          </div>
        ) : null}
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

      <section className="grid grid-cols-2 gap-2 px-5 pt-4">
        <Link href="/meal-plan" className="jipbab-panel rounded-[16px] px-3 py-3">
          <p className="text-[12px] font-bold text-[#8f7f70]">이번 주</p>
          <p className="mt-1 text-[15px] font-black text-[#2f2117]">식단 계획</p>
        </Link>
        <Link href="/recipe/import" className="jipbab-panel rounded-[16px] px-3 py-3">
          <p className="text-[12px] font-bold text-[#8f7f70]">외부 링크</p>
          <p className="mt-1 text-[15px] font-black text-[#2f2117]">레시피 저장</p>
        </Link>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel rounded-[20px] px-4 py-4">
          <div>
            <p className="text-[13px] font-black text-[#2f2117]">냉장고 재료로 오늘 메뉴 찾기</p>
            <p className="mt-1 text-[12px] leading-5 text-[#7d6d5f]">
              재료를 빠르게 등록하면 부족한 재료와 바로 만들 수 있는 레시피가 함께 보입니다.
            </p>
          </div>
          {!isAppStoreDemo && activeDisplayIngredients.length === 0 ? (
            <div className="mt-3 rounded-[14px] bg-[#fff7ed] px-3 py-3">
              <p className="text-[12px] font-black text-[#4b3929]">처음이면 국민 재료부터 담아보세요.</p>
              <p className="mt-1 text-[11px] font-semibold text-[#8f7f70]">
                {STARTER_INGREDIENT_NAMES.join(' · ')}
              </p>
              <button
                type="button"
                onClick={() => {
                  void addStarterIngredients()
                }}
                className="mt-2 min-h-11 rounded-full bg-[#ea5a1f] px-4 py-2 text-[12px] font-black text-white"
              >
                5개 바로 담기
              </button>
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
            <Link
              href="/fridge?add=1"
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] text-[13px] font-black text-white"
            >
              <Plus size={16} />
              재료 추가
            </Link>
            <Link
              href="/fridge"
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2f2117] text-[13px] font-black text-white"
            >
              <Refrigerator size={16} />
              냉장고
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-black text-[#2f2117]">오늘 바로 가능한 메뉴</h2>
          <Link href="/recipe" className="inline-flex min-h-11 items-center px-2 text-[12px] font-bold text-[#8f7f70]">
            더보기
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
          {isLoading && recommendedRecipes.length === 0 ? (
            <>
              <RecipeCardSkeleton />
              <RecipeCardSkeleton />
            </>
          ) : recommendedRecipes.length === 0 ? (
            <EmptyRecommendation hasIngredients={activeDisplayIngredients.length > 0} />
          ) : (
            recommendedRecipes.map((recipe) => (
              <RecipeHomeCard key={recipe.id} recipe={recipe} />
            ))
          )}
        </div>
      </section>

      <section className="space-y-5 px-5 pt-5">
        {homeRecipeSections.slice(1, 3).map((section) => (
          <div key={section.title}>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[16px] font-black text-[#2f2117]">{section.title}</h2>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-[#8f7f70]">{section.subtitle}</p>
              </div>
              <Link href="/recipe" className="inline-flex min-h-9 min-w-11 shrink-0 items-center justify-center text-[11px] font-black text-[#a66a17]">
                전체
              </Link>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 min-[390px]:grid-cols-3">
              {section.recipes.map((recipe) => (
                <RecipeHomeCard key={`${section.title}-${recipe.id}`} recipe={recipe} compact />
              ))}
            </div>
          </div>
        ))}
      </section>

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
            <Link href="/family" className="inline-flex min-h-9 min-w-11 shrink-0 items-center justify-center text-[11px] font-black text-[#a66a17]">
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
                <RecipeHomeCard key={`family-${recipe.id}`} recipe={recipe} compact scope="family" />
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
              href="/family"
              className="mt-3 flex min-h-11 items-center justify-center rounded-[13px] bg-[#2f2117] px-3 text-[12px] font-black text-white"
            >
              가족 냉장고 만들기
            </Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 px-5 pt-5">
        <QuickLink href="/fridge" icon={<Refrigerator size={18} />} label="냉장고" value={`${activeDisplayIngredients.length}개`} />
        <QuickLink href="/recipe" icon={<Utensils size={18} />} label="레시피" value={`${displayRecipeCatalog.length}개`} />
        <QuickLink href="/shopping" icon={<Search size={18} />} label="장보기" value={`${displayUncheckedCount}개`} />
      </section>
    </div>
  )
}

function RecipeHomeCard({
  recipe,
  compact = false,
  scope = 'personal',
}: {
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
  const recipeHref = `/recipe/${recipe.id}${scope === 'family' ? '?scope=family' : ''}`
  const shoppingHref = `/recipe/${recipe.id}${scope === 'family' ? '?scope=family' : ''}#shopping-assistant`
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

function EmptyRecommendation({ hasIngredients }: { hasIngredients: boolean }) {
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
        href={hasIngredients ? '/recipe' : '/fridge?add=1'}
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
    <Link href={href} className="jipbab-panel flex flex-col items-center rounded-[16px] px-2 py-3 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e4] text-[#ea5a1f]">{icon}</span>
      <span className="mt-2 text-[11px] font-bold text-[#7d6d5f]">{label}</span>
      <span className="mt-0.5 text-[13px] font-black text-[#2f2117]">{value}</span>
    </Link>
  )
}
