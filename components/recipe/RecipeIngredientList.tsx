// 이 파일은 레시피 인분을 바꾸고 숫자 계량을 함께 환산해 보여줍니다.
'use client'

import { Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { trackProductAnalyticsEvent } from '@/lib/product-analytics'
import { scaleIngredientDisplay } from '@/lib/recipe-serving-scale'
import type { RecipeIngredientDetail } from '@/types'

type RecipeIngredientListProps = {
  recipeId: string
  baseServings: number
  ingredients: RecipeIngredientDetail[]
  isTestFixture?: boolean
}

export default function RecipeIngredientList({
  recipeId,
  baseServings,
  ingredients,
  isTestFixture = false,
}: RecipeIngredientListProps) {
  const [servings, setServings] = useState(baseServings)

  useEffect(() => {
    trackProductAnalyticsEvent('recipe_detail_viewed', {
      recipeId,
      ingredientCount: ingredients.length,
      source: isTestFixture ? 'technical_fixture' : 'publication_api',
    })
  }, [ingredients.length, isTestFixture, recipeId])

  return (
    <section id="ingredients" className="scroll-mt-24 px-5 py-8">
      <div className="flex items-end justify-between gap-3 border-b-2 border-[#2d2d2d] pb-3">
        <div>
          <h2 className="text-[26px] font-black text-[#242424]">재료</h2>
          <p className="mt-1 text-sm font-semibold text-[#7a7168]">{servings}인분 기준</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[#ded7ce] bg-[#faf8f5] p-1" aria-label="인분 변경">
          <button
            type="button"
            onClick={() => setServings((current) => Math.max(1, current - 1))}
            disabled={servings <= 1}
            data-testid="recipe-servings-decrease"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#5d554d] disabled:opacity-40"
            aria-label="인분 줄이기"
          >
            <Minus size={16} />
          </button>
          <span data-testid="recipe-servings-value" className="min-w-10 text-center text-[15px] font-black text-[#303030]">
            {servings}
          </span>
          <button
            type="button"
            onClick={() => setServings((current) => Math.min(12, current + 1))}
            disabled={servings >= 12}
            data-testid="recipe-servings-increase"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#5d554d] disabled:opacity-40"
            aria-label="인분 늘리기"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      {isTestFixture ? (
        <p className="mt-3 rounded-xl bg-[#eef4ff] px-3 py-2 text-[12px] font-black text-[#2f6fec]">
          기술 E2E 전용 레시피 · 사람 검수 통계 제외
        </p>
      ) : null}
      <ul className="divide-y divide-[#ededed]">
        {ingredients.map((ingredient) => (
          <li key={`${ingredient.name}-${ingredient.display}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-4">
            <div className="min-w-0">
              <p className="break-keep text-[18px] font-bold leading-7 text-[#303030]">
                {ingredient.name}
                {ingredient.required === false ? <span className="ml-2 text-xs text-[#8d8177]">선택</span> : null}
              </p>
              {ingredient.prepNote ? <p className="mt-1 text-[13px] font-semibold leading-5 text-[#7a7168]">손질: {ingredient.prepNote}</p> : null}
              {ingredient.substitute ? <p className="mt-1 text-[13px] font-semibold leading-5 text-[#6b8f58]">대체: {ingredient.substitute}</p> : null}
            </div>
            <span className="break-keep text-right text-[17px] font-bold leading-7 text-[#303030]">
              {scaleIngredientDisplay(ingredient.display, baseServings, servings)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
