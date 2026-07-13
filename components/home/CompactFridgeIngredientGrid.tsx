'use client'

import Image from 'next/image'

import {
  buildHomeFridgePreviewCells,
  getHomeFridgeIngredientDisplayName,
  getHomeFridgePreviewWidth,
  HOME_FRIDGE_PREVIEW_COLUMNS,
  HOME_FRIDGE_PREVIEW_MAX_VISIBLE,
} from '@/lib/home-fridge-preview'
import { getIngredientDisplayName } from '@/lib/ingredient-display'
import { getIngredientPhotoUrl } from '@/lib/utils'
import type { IngredientCategory } from '@/types'

type CompactFridgeIngredient = {
  id: string
  name: string
  category: IngredientCategory | null | undefined
}

type CompactFridgeIngredientGridProps = {
  ingredients: CompactFridgeIngredient[]
  maxVisible?: number
  emptyMessage?: string
  className?: string
  testId?: string
}

export default function CompactFridgeIngredientGrid({
  ingredients,
  maxVisible = HOME_FRIDGE_PREVIEW_MAX_VISIBLE,
  emptyMessage = '아래 재료를 눌러 담아보세요',
  className = '',
  testId,
}: CompactFridgeIngredientGridProps) {
  const cells = buildHomeFridgePreviewCells(ingredients, maxVisible)
  const fullIngredientNames = ingredients.map((ingredient) => getIngredientDisplayName(ingredient.name))

  return (
    <div
      data-testid={testId}
      className={`pointer-events-none ${className}`}
      aria-label={ingredients.length > 0 ? `선택한 재료 ${ingredients.length}개` : '선택한 재료 없음'}
    >
      {ingredients.length === 0 ? (
        <div
          className="flex min-h-12 items-center justify-center rounded-[12px] border border-dashed border-white/90 bg-white/78 px-3 text-center text-[10px] font-black leading-4 text-[#7d6d5f] shadow-[0_5px_12px_rgba(47,33,23,0.08)] backdrop-blur-[2px]"
          style={{ width: getHomeFridgePreviewWidth() }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div
          className="grid content-start"
          style={{
            gap: '5px 2px',
            gridTemplateColumns: `repeat(${HOME_FRIDGE_PREVIEW_COLUMNS}, 32px)`,
            width: getHomeFridgePreviewWidth(),
          }}
        >
          {cells.map((cell, index) => {
            if (cell.kind === 'overflow') {
              return (
                <div
                  key={`overflow-${cell.count}`}
                  className="flex min-h-10 w-8 items-center justify-center px-0 text-center text-[9px] font-black leading-3 text-[#2f2117] drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
                  aria-hidden="true"
                >
                  +{cell.count}
                </div>
              )
            }

            const ingredient = cell.ingredient
            const photoName = getIngredientDisplayName(ingredient.name)
            return (
              <div key={`${ingredient.id}-${index}`} className="w-8 min-w-0 px-0 py-0.5 text-center" aria-hidden="true">
                <Image
                  src={getIngredientPhotoUrl(photoName, ingredient.category ?? null)}
                  alt=""
                  width={30}
                  height={30}
                  sizes="24px"
                  className="mx-auto h-6 w-6 object-contain mix-blend-multiply drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
                />
                <p
                  className="mx-auto mt-0.5 w-8 overflow-hidden text-ellipsis whitespace-nowrap text-[8px] font-black text-[#2f2117] drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
                  style={{ lineHeight: '9px' }}
                  title={photoName}
                >
                  {getHomeFridgeIngredientDisplayName(ingredient.name)}
                </p>
              </div>
            )
          })}
        </div>
      )}
      <span className="sr-only">
        {fullIngredientNames.length > 0
          ? `선택한 재료: ${fullIngredientNames.join(', ')}`
          : '선택한 재료가 없습니다.'}
      </span>
    </div>
  )
}
