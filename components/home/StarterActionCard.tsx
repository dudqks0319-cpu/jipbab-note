'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check, Plus, Refrigerator, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import CompactFridgeIngredientGrid from '@/components/home/CompactFridgeIngredientGrid'
import { buildHomeHref } from '@/lib/home-actions'
import { STARTER_INGREDIENT_TEMPLATES } from '@/lib/starter-ingredients'

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
  const previewIngredients = useMemo(() => {
    const visibleNameSet = new Set(selectedNames.map((name) => name.toLowerCase()))
    return STARTER_INGREDIENT_TEMPLATES
      .filter((item) => visibleNameSet.has(item.name.toLowerCase()))
      .map((item) => ({
        id: `starter-${item.name}`,
        name: item.name,
        category: item.category,
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
          : '계란, 두부, 김치만 있어도 괜찮아요. 아래에서 실제로 있는 재료만 골라주세요.'}
      </p>

      {!hasIngredients ? (
        <>
          <div
            data-testid="starter-fridge-preview"
            className="mt-4 overflow-hidden rounded-[18px] border border-[#eadcc9] bg-white shadow-[0_10px_22px_rgba(76,51,28,0.08)]"
          >
            <div className="relative h-64 overflow-hidden bg-[#fff7ed]">
              <Image
                src={FRIDGE_IMAGE_SRC}
                alt=""
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 430px) 310px, 350px"
                className="object-contain object-center p-2"
              />
              <div className="relative z-10 flex h-full flex-col bg-gradient-to-b from-white/10 via-white/8 to-[#2f2117]/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-black text-[#2f2117] shadow-[0_6px_14px_rgba(76,51,28,0.10)]">
                    냉장고에 담기
                  </p>
                  <p
                    className="rounded-full bg-[#ea5a1f] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_6px_14px_rgba(234,90,31,0.20)]"
                    aria-live="polite"
                  >
                    {selectedNames.length}개 선택
                  </p>
                </div>
                <CompactFridgeIngredientGrid
                  ingredients={previewIngredients}
                  maxVisible={12}
                  emptyMessage="아래 재료를 눌러 담아보세요"
                  className="mx-auto mt-8"
                  testId="starter-fridge-ingredient-grid"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="냉장고에 있는 재료 선택">
            {visibleStarterNames.map((name) => {
              const selected = selectedNameSet.has(name)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleIngredient(name)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[14px] font-bold transition-colors ${
                    selected
                      ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                      : 'border-[#eadcc9] bg-white text-[#4b3929]'
                  }`}
                >
                  {selected ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
                  {name}
                </button>
              )
            })}
          </div>
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
