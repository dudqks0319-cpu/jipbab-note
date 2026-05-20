// 이 파일은 홈 화면을 담당하며 참고 이미지의 앱스토어형 첫 화면을 구현합니다.
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  Bell,
  Plus,
  Refrigerator,
  Search,
  Star,
  Utensils,
} from 'lucide-react'

import { useDemoMode } from '@/hooks/useDemoMode'
import { useIngredients } from '@/hooks/useIngredients'
import { useRecipeCatalog } from '@/hooks/useRecipes'
import { useShopping } from '@/hooks/useShopping'
import {
  buildRecipeRecommendationReason,
  findExpiringMatchedIngredients,
  rankRecipeRecommendations,
} from '@/lib/matching'
import { APPSTORE_DEMO_INGREDIENTS, APPSTORE_DEMO_RECIPES, APPSTORE_DEMO_SHOPPING_ITEMS } from '@/lib/demo-state'
import { STARTER_INGREDIENT_NAMES, buildStarterIngredientPayloads } from '@/lib/starter-ingredients'
import { getDday } from '@/lib/utils'

const FALLBACK_RECIPE_IMAGE =
  '/images/recipes/kimchi-fried-rice.png'

export default function HomePage() {
  const isAppStoreDemo = useDemoMode()
  const { ingredients, loading: ingredientsLoading, addIngredient } = useIngredients()
  const { recipes: recipeCatalog, loading: recipesLoading } = useRecipeCatalog(12)
  const { uncheckedCount } = useShopping()

  const displayIngredients = isAppStoreDemo ? APPSTORE_DEMO_INGREDIENTS : ingredients
  const displayRecipeCatalog = isAppStoreDemo ? APPSTORE_DEMO_RECIPES : recipeCatalog
  const displayUncheckedCount = isAppStoreDemo
    ? APPSTORE_DEMO_SHOPPING_ITEMS.filter((item) => !item.checked).length
    : uncheckedCount

  const activeDisplayIngredients = useMemo(
    () => displayIngredients.filter((item) => !item.consumedAt && !item.discardedAt),
    [displayIngredients],
  )

  const expiringCount = useMemo(
    () => activeDisplayIngredients.filter((item) => getDday(item.expiryDate) <= 3).length,
    [activeDisplayIngredients],
  )

  const recommendedRecipes = useMemo(() => {
    return rankRecipeRecommendations(displayRecipeCatalog, activeDisplayIngredients)
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
      .slice(0, 3)
  }, [activeDisplayIngredients, displayRecipeCatalog])

  const topRecipe = recommendedRecipes[0]
  const topExpiringIngredient = useMemo(() => {
    return activeDisplayIngredients
      .filter((item) => getDday(item.expiryDate) <= 3)
      .sort((left, right) => getDday(left.expiryDate) - getDday(right.expiryDate))[0]
  }, [activeDisplayIngredients])

  const isLoading = ingredientsLoading || recipesLoading
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3]"
          >
            <Bell size={18} className="text-[#3c2b1e]" />
          </Link>
        </div>
      </section>

      <section className="px-5 pt-5">
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
                부족 {topRecipe.missingIngredients.length}개
              </span>
            </div>
            {topExpiringIngredient ? (
              <p className="mt-3 rounded-[13px] bg-white/10 px-3 py-2 text-[12px] font-bold text-[#ffe7c9]">
                {topExpiringIngredient.name} {getDday(topExpiringIngredient.expiryDate) <= 0 ? '오늘까지' : `D-${getDday(topExpiringIngredient.expiryDate)}`}라 먼저 쓰면 좋아요.
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/recipe/${topRecipe.id}`}
                className="flex min-h-11 items-center justify-center rounded-[13px] bg-white text-[13px] font-black text-[#2f2117]"
              >
                요리 시작
              </Link>
              <Link
                href="/shopping"
                className="flex min-h-11 items-center justify-center rounded-[13px] bg-[#ea5a1f] text-[13px] font-black text-white"
              >
                부족 재료 담기
              </Link>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-black text-[#2f2117]">냉장고 요약</h2>
          <span className="text-[11px] font-semibold text-[#8f7f70]">
            {isLoading ? '동기화 중' : `보관 ${activeDisplayIngredients.length}개`}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <SummaryBox label="보관" value={`${activeDisplayIngredients.length}개`} tone="bg-[#fff3d8] text-[#a66a17]" />
          <SummaryBox label="신선" value={`${Math.max(activeDisplayIngredients.length - expiringCount, 0)}개`} tone="bg-[#eef6df] text-[#3d7b38]" />
          <SummaryBox label="소진임박" value={`${expiringCount}개`} tone="bg-[#ffede4] text-[#d64b25]" />
        </div>
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
                className="mt-2 rounded-full bg-[#ea5a1f] px-4 py-2 text-[12px] font-black text-white"
              >
                5개 바로 담기
              </button>
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
            <Link
              href="/fridge"
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#2f2117] text-[13px] font-black text-white"
            >
              <Refrigerator size={16} />
              냉장고 보기
            </Link>
            <Link
              href="/fridge?add=1"
              className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] text-[13px] font-black text-white"
            >
              <Plus size={16} />
              재료 바로 추가
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-black text-[#2f2117]">오늘의 추천 레시피</h2>
          <Link href="/recipe" className="text-[12px] font-bold text-[#8f7f70]">
            더보기
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {recommendedRecipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipe/${recipe.id}`} className="jipbab-pressable min-w-0">
              <article className="overflow-hidden rounded-[16px] bg-[#fffaf3] shadow-[0_8px_22px_rgba(76,51,28,0.08)]">
                <div className="relative h-20 overflow-hidden bg-[#ecd5bd]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={recipe.thumbnailUrl || FALLBACK_RECIPE_IMAGE}
                    alt={recipe.name}
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_RECIPE_IMAGE
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="px-2.5 py-2">
                  <h3 className="line-clamp-1 text-[12px] font-black text-[#2f2117]">{recipe.name}</h3>
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#a66a17]">
                    <Star size={10} className="fill-[#f0a51c] text-[#f0a51c]" />
                    {recipe.missingIngredients.length === 0 ? '바로 가능' : `부족 ${recipe.missingIngredients.length}개`}
                  </div>
                </div>
              </article>
            </Link>
          ))}
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

function SummaryBox({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-[12px] px-3 py-3 ${tone}`}>
      <p className="text-[11px] font-bold">{label}</p>
      <p className="mt-1 text-[14px] font-black">{value}</p>
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
