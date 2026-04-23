// 이 파일은 한 주 식단 계획 화면을 담당합니다.
'use client'

import Link from 'next/link'
import { CalendarDays, ChevronLeft, ShoppingBasket } from 'lucide-react'

import { useAppSettings } from '@/hooks/useAppSettings'
import { useRecipes } from '@/hooks/useRecipes'

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const

export default function MealPlanPage() {
  const { settings } = useAppSettings()
  const { recipes, loading } = useRecipes(7)

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]" aria-label="홈으로 돌아가기">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-center text-[16px] font-black text-[#2f2117]">주간 식단</h1>
          <span />
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel rounded-[18px] px-4 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-[#ea5a1f]" />
            <h2 className="text-[17px] font-black text-[#2f2117]">{settings.servingSize}인 기준 추천</h2>
          </div>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#7d6d5f]">
            {settings.allergyNotes || settings.dislikedIngredients
              ? `제외 참고: ${[settings.allergyNotes, settings.dislikedIngredients].filter(Boolean).join(' · ')}`
              : '취향과 알레르기를 설정하면 더 정확한 계획으로 다듬을 수 있어요.'}
          </p>
        </div>
      </section>

      <section className="px-5 pt-4">
        {loading ? (
          <div className="jipbab-panel rounded-[16px] px-4 py-10 text-center text-sm font-bold text-[#8f7f70]">
            추천 식단을 불러오는 중...
          </div>
        ) : (
          <div className="space-y-2.5">
            {WEEK_DAYS.map((day, index) => {
              const recipe = recipes[index % Math.max(recipes.length, 1)]
              const rowContent = (
                <>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#fff0e4] text-[14px] font-black text-[#d94d19]">
                    {day}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-black text-[#2f2117]">{recipe?.name ?? '냉장고 재료 먼저 등록하기'}</h3>
                    <p className="mt-1 text-[11px] font-semibold text-[#8f7f70]">
                      {recipe ? `${recipe.category} · ${recipe.matchRate}% 일치 · 부족 ${recipe.missingIngredients.length}개` : '추천 가능한 레시피가 없습니다'}
                    </p>
                  </div>
                  {recipe ? (
                    <span className="shrink-0 rounded-full border border-[#eadcc9] px-3 py-1.5 text-[11px] font-black text-[#4b3929]">
                      보기
                    </span>
                  ) : null}
                </>
              )

              return recipe ? (
                <Link
                  key={day}
                  href={`/recipe/${recipe.id}`}
                  className="jipbab-panel flex min-h-[72px] items-center gap-3 rounded-[16px] px-3 py-3"
                  aria-label={`${day}요일 ${recipe.name} 레시피 보기`}
                >
                  {rowContent}
                </Link>
              ) : (
                <article key={day} className="jipbab-panel flex min-h-[72px] items-center gap-3 rounded-[16px] px-3 py-3">
                  {rowContent}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="px-5 pt-4">
        <Link href="/shopping" className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] text-sm font-black text-white">
          <ShoppingBasket size={16} />
          이번 주 장보기 확인
        </Link>
      </section>
    </div>
  )
}
