'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Check, Plus, Refrigerator, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { buildHomeHref } from '@/lib/home-actions'
import { STARTER_INGREDIENT_TEMPLATES } from '@/lib/starter-ingredients'
import { getIngredientPhotoUrl } from '@/lib/utils'
import type { IngredientRecord } from '@/types'

type StarterActionCardProps = {
  demoMode?: boolean
  hasIngredients: boolean
  onAddStarterIngredients: (selectedNames: string[]) => void
  starterIngredientNames: string[]
  storageCounts?: {
    cold: number
    frozen: number
    room: number
  }
}

const FRIDGE_IMAGE_SRC = '/images/fridge-freezer-board-animated.png'

export default function StarterActionCard({
  demoMode = false,
  hasIngredients,
  onAddStarterIngredients,
  starterIngredientNames,
  storageCounts,
}: StarterActionCardProps) {
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const visibleStarterNames = starterIngredientNames.slice(0, 8)
  const selectedNameSet = new Set(selectedNames)
  const hasSelection = selectedNames.length > 0
  const previewIngredients = useMemo<IngredientRecord[]>(() => {
    const visibleNameSet = new Set(selectedNames.map((name) => name.toLowerCase()))
    return STARTER_INGREDIENT_TEMPLATES
      .filter((item) => visibleNameSet.has(item.name.toLowerCase()))
      .map((item, index) => ({
        id: `starter-preview-${index}-${item.name}`,
        deviceId: 'starter-preview',
        userId: null,
        name: item.name,
        category: item.category ?? null,
        storageType: item.storageType ?? '냉장',
        quantity: item.quantity ?? null,
        expiryDate: null,
        barcode: null,
        imageUrl: null,
        memo: null,
        createdAt: '',
        updatedAt: '',
      }))
  }, [selectedNames])
  const summaryText = storageCounts
    ? `냉장 ${storageCounts.cold} · 냉동 ${storageCounts.frozen} · 실온 ${storageCounts.room}`
    : null

  const toggleIngredient = (name: string) => {
    setSelectedNames((prev) => (
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    ))
  }

  return (
    <section className="rounded-[22px] border border-[#eadcc9] bg-[#fffaf3] px-5 py-6 shadow-[0_10px_24px_rgba(54,38,24,0.06)]">
      <p className="text-[12px] font-bold text-[#d94d19]">
        {hasIngredients ? '오늘 메뉴 다시 고르기' : '냉장고 열고 고민 끝'}
      </p>
      <h2 className="mt-2 break-keep text-[24px] font-black leading-[1.18] text-[#2f2117]">
        {hasIngredients ? '지금 만들 메뉴를 찾아볼게요' : '있는 재료만 골라주세요'}
      </h2>
      <p className="mt-3 break-keep text-[14px] font-semibold leading-6 text-[#7d6d5f]">
        {hasIngredients
          ? '시간, 도구, 부족 재료 기준으로 바로 할 수 있는 메뉴부터 볼게요.'
          : '계란, 두부, 김치만 있어도 괜찮아요. 먼저 오늘 만들 메뉴부터 찾아볼게요.'}
      </p>

      {!hasIngredients ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleStarterNames.map((name) => {
              const selected = selectedNameSet.has(name)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleIngredient(name)}
                  aria-pressed={selected}
                  className={`min-h-11 cursor-pointer rounded-full border px-4 text-[14px] font-bold transition-colors ${
                    selected
                      ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                      : 'border-[#eadcc9] bg-white text-[#4b3929]'
                  }`}
                >
                  {selected ? <Check size={14} aria-hidden="true" className="mr-1 inline" /> : null}
                  {name}
                </button>
              )
            })}
          </div>
          <p
            aria-live="polite"
            className="mt-3 min-h-5 text-[13px] font-semibold text-[#7d6d5f]"
          >
            {hasSelection
              ? <>선택한 재료 {selectedNames.length}개</>
              : '재료를 하나 이상 고르면 추천할 수 있어요.'}
          </p>
        </>
      ) : null}

      <div className="mt-6">
        {hasIngredients ? (
          <Link
            href={buildHomeHref('/recipe', { demoMode })}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#ea5a1f] px-4 text-[15px] font-black text-white shadow-[0_10px_20px_rgba(234,90,31,0.18)]"
          >
            <Search size={15} />
            메뉴 더 찾기
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onAddStarterIngredients(selectedNames)}
            disabled={!hasSelection}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] px-4 text-[15px] font-black transition-colors ${
              hasSelection
                ? 'cursor-pointer bg-[#ea5a1f] text-white shadow-[0_10px_20px_rgba(234,90,31,0.18)]'
                : 'cursor-not-allowed bg-[#eadcc9] text-[#8f7f70]'
            }`}
          >
            <Plus size={15} />
            {hasSelection ? '이 재료로 메뉴 찾기' : '있는 재료를 골라주세요'}
          </button>
        )}

        {!hasIngredients && hasSelection ? (
          <StarterFridgePreview
            ingredients={previewIngredients}
            selectedCount={selectedNames.length}
          />
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={buildHomeHref('/fridge?add=1', { demoMode })}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] px-2 text-center text-[13px] font-bold text-[#7d6d5f] transition-colors hover:bg-[#fff0e4]"
          >
            <Plus size={14} />
            {hasIngredients ? '재료 더 추가' : '직접 추가하기'}
          </Link>
          <Link
            href={buildHomeHref('/fridge', { demoMode })}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] px-2 text-center text-[13px] font-bold text-[#7d6d5f] transition-colors hover:bg-[#fff0e4]"
          >
            <Refrigerator size={14} />
            내 냉장고 가기
          </Link>
        </div>
      </div>
      {summaryText ? (
        <p className="mt-2 text-center text-[11px] font-semibold text-[#9b8979]">{summaryText}</p>
      ) : null}
    </section>
  )
}

function StarterFridgePreview({
  ingredients,
  selectedCount,
}: {
  ingredients: IngredientRecord[]
  selectedCount: number
}) {
  const visibleIngredients = ingredients.slice(0, 4)
  const remainingCount = Math.max(0, selectedCount - visibleIngredients.length)

  return (
    <div
      data-testid="starter-fridge-preview"
      className="relative mt-4 h-36 overflow-hidden rounded-[18px] border border-[#e5d6c1] bg-[#f5ead8]"
    >
      <Image
        src={FRIDGE_IMAGE_SRC}
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        sizes="(max-width: 640px) calc(100vw - 72px), 420px"
        className="object-cover object-[center_30%] opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-[#fffaf3]/35 to-[#fffaf3]/90" />

      <div className="relative z-10 flex h-full flex-col justify-between p-3">
        <p className="w-fit rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-black text-[#4b3929] shadow-sm">
          냉장고에 담을 재료 {selectedCount}개
        </p>

        <div className="flex gap-2">
          {visibleIngredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[12px] bg-white/95 px-2 py-2 shadow-sm"
            >
              <Image
                src={getIngredientPhotoUrl(ingredient.name, ingredient.category)}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 object-contain"
              />
              <span className="truncate text-[11px] font-bold text-[#4b3929]">
                {ingredient.name}
              </span>
            </div>
          ))}
          {remainingCount > 0 ? (
            <span className="flex min-h-11 min-w-11 items-center justify-center rounded-[12px] bg-[#2f2117] px-2 text-[11px] font-black text-white shadow-sm">
              +{remainingCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
