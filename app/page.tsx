// 이 파일은 홈 화면을 담당하며 참고 이미지의 앱스토어형 첫 화면을 구현합니다.
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  Bell,
  ChevronRight,
  Refrigerator,
  Search,
  ShoppingBasket,
  Star,
  Utensils,
} from 'lucide-react'

import { useDemoMode } from '@/hooks/useDemoMode'
import { useIngredients } from '@/hooks/useIngredients'
import { useRecipeCatalog } from '@/hooks/useRecipes'
import { useShopping } from '@/hooks/useShopping'
import { calculateRecipeIngredientMatch } from '@/lib/matching'
import { APPSTORE_DEMO_INGREDIENTS, APPSTORE_DEMO_RECIPES, APPSTORE_DEMO_SHOPPING_ITEMS } from '@/lib/demo-state'
import { getDday } from '@/lib/utils'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1627662168806-efa33a7cda86?auto=format&fit=crop&w=1200&q=85'

export default function HomePage() {
  const isAppStoreDemo = useDemoMode()
  const { ingredients, loading: ingredientsLoading } = useIngredients()
  const { recipes: recipeCatalog, loading: recipesLoading } = useRecipeCatalog(12)
  const { uncheckedCount } = useShopping()

  const displayIngredients = isAppStoreDemo ? APPSTORE_DEMO_INGREDIENTS : ingredients
  const displayRecipeCatalog = isAppStoreDemo ? APPSTORE_DEMO_RECIPES : recipeCatalog
  const displayUncheckedCount = isAppStoreDemo
    ? APPSTORE_DEMO_SHOPPING_ITEMS.filter((item) => !item.checked).length
    : uncheckedCount

  const ingredientNames = useMemo(() => displayIngredients.map((item) => item.name), [displayIngredients])

  const expiringCount = useMemo(
    () => displayIngredients.filter((item) => getDday(item.expiryDate) <= 3).length,
    [displayIngredients],
  )

  const recommendedRecipes = useMemo(() => {
    return displayRecipeCatalog
      .map((recipe) => ({
        ...recipe,
        ...calculateRecipeIngredientMatch(ingredientNames, recipe.ingredients),
      }))
      .sort((left, right) => right.matchRate - left.matchRate)
      .slice(0, 3)
  }, [displayRecipeCatalog, ingredientNames])

  const isLoading = ingredientsLoading || recipesLoading

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-5">
      <section className="mobile-safe-top px-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#9b8979]">오늘 뭐 먹지?</p>
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

      <section className="px-5 pt-4">
        <div className="jipbab-panel relative overflow-hidden rounded-[24px] p-4">
          <div className="flex min-h-[152px] items-stretch gap-3">
            <div className="z-10 flex w-[43%] flex-col justify-between py-2">
              <div>
                <p className="text-[12px] font-bold text-[#7c6a59]">집에서 만드는</p>
                <h2 className="mt-1 text-[25px] font-black leading-tight text-[#2f2117]">
                  매콤 든든
                  <br />
                  집밥 추천
                </h2>
              </div>
              <Link
                href="/recipe"
                className="inline-flex w-fit items-center gap-1 rounded-full bg-[#ea5a1f] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(234,90,31,0.25)]"
              >
                레시피 보기
                <ChevronRight size={13} />
              </Link>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-[20px] bg-[#f3dcc3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO_IMAGE} alt="오늘의 집밥 추천 음식" className="h-full w-full object-cover" />
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/65" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/65" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-black text-[#2f2117]">냉장고 요약</h2>
          <span className="text-[11px] font-semibold text-[#8f7f70]">
            {isAppStoreDemo ? '미리보기' : isLoading ? '동기화 중' : `전체 ${displayIngredients.length}개`}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <SummaryBox label="신선" value={`${Math.max(displayIngredients.length - expiringCount, 0)}개`} tone="bg-[#eef6df] text-[#3d7b38]" />
          <SummaryBox label="일반" value={`${displayIngredients.length}개`} tone="bg-[#fff3d8] text-[#a66a17]" />
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
        <Link
          href="/fridge"
          className="jipbab-panel flex items-center justify-between rounded-[20px] px-4 py-3"
        >
          <div>
            <p className="text-[13px] font-black text-[#2f2117]">장보기 리스트</p>
            <p className="mt-1 text-[12px] leading-5 text-[#7d6d5f]">
              필요한 재료를
              <br />
              한 번에 확인해보세요!
            </p>
          </div>
          <div className="flex h-20 w-28 items-center justify-center rounded-[18px] bg-[#f8ecd9]">
            <ShoppingBasket size={40} className="text-[#e06a2b]" />
          </div>
        </Link>
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
                    src={recipe.thumbnailUrl || HERO_IMAGE}
                    alt={recipe.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="px-2.5 py-2">
                  <h3 className="line-clamp-1 text-[12px] font-black text-[#2f2117]">{recipe.name}</h3>
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#a66a17]">
                    <Star size={10} className="fill-[#f0a51c] text-[#f0a51c]" />
                    {recipe.matchRate}% 일치
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 px-5 pt-5">
        <QuickLink href="/fridge" icon={<Refrigerator size={18} />} label="냉장고" value={`${displayIngredients.length}개`} />
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
