'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Plus, Refrigerator, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

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
    const visibleNameSet = new Set((hasSelection ? selectedNames : visibleStarterNames.slice(0, 3)).map((name) => name.toLowerCase()))
    return STARTER_INGREDIENT_TEMPLATES
      .filter((item) => visibleNameSet.has(item.name.toLowerCase()))
      .slice(0, 6)
  }, [hasSelection, selectedNames, visibleStarterNames])
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
        {hasIngredients ? '추천을 다시 정리해요' : '처음이면 여기서 시작해요'}
      </p>
      <h2 className="mt-2 break-keep text-[24px] font-black leading-[1.18] text-[#2f2117]">
        {hasIngredients ? '조건에 맞는 메뉴를 찾아볼게요' : '지금 있는 재료를 눌러주세요'}
      </h2>
      <p className="mt-3 break-keep text-[14px] font-semibold leading-6 text-[#7d6d5f]">
        {hasIngredients
          ? '레시피 목록에서 시간, 도구, 부족 재료를 좁혀서 다시 볼 수 있어요.'
          : '수량과 유통기한은 나중에 정리해도 괜찮아요. 먼저 만들 수 있는 요리부터 볼게요.'}
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
                priority
                sizes="(max-width: 430px) 310px, 350px"
                className="object-contain object-center p-2"
              />
              <div className="relative z-10 flex h-full flex-col bg-gradient-to-b from-white/10 via-white/8 to-[#2f2117]/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-black text-[#2f2117] shadow-[0_6px_14px_rgba(76,51,28,0.10)]">
                    냉장고에 담기
                  </p>
                  <p className="rounded-full bg-[#ea5a1f] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_6px_14px_rgba(234,90,31,0.20)]">
                    {hasSelection ? `${selectedNames.length}개 선택` : '미리보기'}
                  </p>
                </div>
                <div className="mx-auto mt-9 grid w-52 grid-cols-2 gap-2">
                  {previewIngredients.map((item) => (
                    <span
                      key={item.name}
                      className="min-w-0 rounded-[12px] border border-white/90 bg-white/92 px-2 py-1.5 text-center text-[11px] font-black text-[#4b3929] shadow-[0_7px_14px_rgba(47,33,23,0.12)] backdrop-blur-[2px]"
                    >
                      <span className="block truncate">{item.name}</span>
                      <span className="mt-0.5 block text-[8px] font-black text-[#9b8979]">{item.storageType}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {visibleStarterNames.map((name) => {
              const selected = selectedNameSet.has(name)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleIngredient(name)}
                  aria-pressed={selected}
                  className={`min-h-10 cursor-pointer rounded-full border px-4 text-[14px] font-bold transition-colors ${
                    selected
                      ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                      : 'border-[#eadcc9] bg-white text-[#4b3929]'
                  }`}
                >
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
            레시피 필터
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
            {hasSelection ? `${selectedNames.length}개 재료로 추천 보기` : '재료를 선택해 주세요'}
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
