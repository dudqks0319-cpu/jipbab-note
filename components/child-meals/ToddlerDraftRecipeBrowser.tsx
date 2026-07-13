'use client'

import Link from 'next/link'
import { Baby, Check, Clock3, CookingPot, Snowflake, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useChildMealSettings } from '@/hooks/useChildMealSettings'
import {
  CHILD_AGE_BAND_LABELS,
  CHILD_ALLERGEN_LABELS,
  CHILD_MEAL_TYPE_LABELS,
  CHILD_TEXTURE_LABELS,
} from '@/lib/child-meals/constants'
import { TODDLER_DRAFT_RECIPES } from '@/lib/child-meals/draft-recipes'
import { CHILD_ALLERGEN_CODES, type ChildAgeBand } from '@/lib/child-meals/types'
import {
  ageBandToRepresentativeMonths,
  hasExcludedChildAllergen,
  isChildGuidanceAgeEligible,
} from '@/lib/child-meals/validation'

export default function ToddlerDraftRecipeBrowser() {
  const {
    settings,
    excludedAllergenCount,
    setEnabled,
    setPreferredAudience,
    setAgeBand,
    setTexturePreference,
    toggleExcludedAllergen,
    setPreferFamilySplit,
    setPreferMaxActiveMinutes,
  } = useChildMealSettings()
  const [familySplitOnly, setFamilySplitOnly] = useState(false)
  const [freezerOnly, setFreezerOnly] = useState(false)

  const visibleRecipes = useMemo(() => {
    const ageMonths = ageBandToRepresentativeMonths(settings.ageBand)
    return TODDLER_DRAFT_RECIPES.filter((recipe) => {
      if (!isChildGuidanceAgeEligible(recipe, ageMonths)) return false
      if (hasExcludedChildAllergen(recipe, settings.excludedAllergenCodes)) return false
      if (
        settings.preferMaxActiveMinutes !== null &&
        recipe.activeTimeMinutes > settings.preferMaxActiveMinutes
      ) {
        return false
      }
      if (familySplitOnly && !recipe.familySplitSupported) return false
      if (freezerOnly && !recipe.freezerFriendlyCandidate) return false
      return true
    })
  }, [familySplitOnly, freezerOnly, settings.ageBand, settings.excludedAllergenCodes, settings.preferMaxActiveMinutes])

  const chooseAgeBand = (ageBand: ChildAgeBand) => {
    setEnabled(true)
    setPreferredAudience('toddler')
    setAgeBand(ageBand)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[18px] border border-[#e7d7c5] bg-[#fffaf3] p-4">
        <div className="flex items-center gap-2">
          <Baby size={18} className="text-[#d94d19]" />
          <h2 className="text-[15px] font-black text-[#2f2117]">아이 기준</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['24_29', '30_36'] as const).map((ageBand) => (
            <button
              key={ageBand}
              type="button"
              onClick={() => chooseAgeBand(ageBand)}
              aria-pressed={settings.ageBand === ageBand}
              className={`min-h-11 rounded-[13px] border px-3 text-[13px] font-black ${
                settings.ageBand === ageBand
                  ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                  : 'border-[#eadcc9] bg-white text-[#6f5d4f]'
              }`}
            >
              {CHILD_AGE_BAND_LABELS[ageBand]}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['soft_bite', 'family_cut'] as const).map((texture) => (
            <button
              key={texture}
              type="button"
              onClick={() => setTexturePreference(texture)}
              aria-pressed={settings.texturePreference === texture}
              className={`min-h-11 rounded-[13px] border px-3 text-[12px] font-black ${
                settings.texturePreference === texture
                  ? 'border-[#78a95f] bg-[#eef6df] text-[#3d7b38]'
                  : 'border-[#eadcc9] bg-white text-[#6f5d4f]'
              }`}
            >
              {CHILD_TEXTURE_LABELS[texture]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] border border-[#e7d7c5] bg-[#fffaf3] p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-black text-[#2f2117]">제외할 알레르겐</h2>
            <p className="mt-1 text-[11px] font-semibold text-[#8f7f70]">
              진단 기능이 아니라 선택한 재료를 추천에서 제외하는 설정이에요.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#fff0e4] px-2.5 py-1 text-[10px] font-black text-[#d94d19]">
            {excludedAllergenCount}개 제외
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHILD_ALLERGEN_CODES.map((code) => {
            const selected = settings.excludedAllergenCodes.includes(code)
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleExcludedAllergen(code)}
                aria-pressed={selected}
                className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-[12px] font-bold ${
                  selected
                    ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                    : 'border-[#eadcc9] bg-white text-[#6f5d4f]'
                }`}
              >
                {selected ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : null}
                {CHILD_ALLERGEN_LABELS[code]}
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-[18px] border border-[#e7d7c5] bg-[#fffaf3] p-4">
        <h2 className="text-[15px] font-black text-[#2f2117]">오늘 상황</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[10, 15, 20].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setPreferMaxActiveMinutes(minutes as 10 | 15 | 20)}
              aria-pressed={settings.preferMaxActiveMinutes === minutes}
              className={`min-h-11 rounded-[12px] border px-2 text-[11px] font-black ${
                settings.preferMaxActiveMinutes === minutes
                  ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                  : 'border-[#eadcc9] bg-white text-[#6f5d4f]'
              }`}
            >
              손가는 {minutes}분
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setFamilySplitOnly((current) => !current)
              setPreferFamilySplit(!familySplitOnly)
            }}
            aria-pressed={familySplitOnly}
            className={`min-h-11 rounded-[12px] border px-3 text-[12px] font-black ${
              familySplitOnly
                ? 'border-[#78a95f] bg-[#eef6df] text-[#3d7b38]'
                : 'border-[#eadcc9] bg-white text-[#6f5d4f]'
            }`}
          >
            가족식 같이
          </button>
          <button
            type="button"
            onClick={() => setFreezerOnly((current) => !current)}
            aria-pressed={freezerOnly}
            className={`min-h-11 rounded-[12px] border px-3 text-[12px] font-black ${
              freezerOnly
                ? 'border-[#7c9ec7] bg-[#edf6ff] text-[#376991]'
                : 'border-[#eadcc9] bg-white text-[#6f5d4f]'
            }`}
          >
            냉동 후보
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-black text-[#2f2117]">검수 전 유아식</h2>
            <p className="mt-1 text-[11px] font-semibold text-[#8f7f70]">
              조건에 맞는 초안 {visibleRecipes.length}개 · 운영 공개 전 실제 조리가 필요해요.
            </p>
          </div>
        </div>

        {visibleRecipes.length === 0 ? (
          <div className="mt-3 rounded-[18px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-8 text-center">
            <p className="text-[14px] font-black text-[#2f2117]">조건에 맞는 초안이 없어요</p>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-[#8f7f70]">
              월령과 알레르겐은 유지하고 손가는 시간이나 상황 필터를 조금 풀어보세요.
            </p>
            <button
              type="button"
              onClick={() => {
                setPreferMaxActiveMinutes(20)
                setFamilySplitOnly(false)
                setFreezerOnly(false)
              }}
              className="mt-3 min-h-11 rounded-full bg-[#2f2117] px-4 text-[12px] font-black text-white"
            >
              시간·상황 필터 풀기
            </button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {visibleRecipes.map((recipe) => (
              <article key={recipe.slug} className="overflow-hidden rounded-[17px] border border-[#eadcc9] bg-[#fffaf3] shadow-[0_8px_20px_rgba(76,51,28,0.06)]">
                <Link href={`/toddler-meals/${recipe.slug}`} className="block">
                  <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-[#fff0e4] via-[#fff8ed] to-[#eaf4df] text-[#d94d19]">
                    <CookingPot size={30} aria-hidden="true" />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-black text-[#d94d19]">
                      {recipe.minAgeMonths}개월+ · {CHILD_TEXTURE_LABELS[settings.texturePreference]}
                    </p>
                    <h3 className="mt-1 line-clamp-2 min-h-10 text-[14px] font-black leading-5 text-[#2f2117]">
                      {recipe.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold text-[#78695d]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                        <Clock3 size={11} /> 손 {recipe.activeTimeMinutes}분
                      </span>
                      {recipe.familySplitSupported ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef6df] px-2 py-1 text-[#3d7b38]">
                          <Users size={11} /> 아이 몫 먼저
                        </span>
                      ) : null}
                      {recipe.freezerFriendlyCandidate ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6ff] px-2 py-1 text-[#376991]">
                          <Snowflake size={11} /> 냉동 후보
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-1 text-[10px] font-bold text-[#8f7f70]">
                      {recipe.mealTypes.map((mealType) => CHILD_MEAL_TYPE_LABELS[mealType]).join(' · ')}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[10px] font-black text-[#a55c32]">
                      {recipe.allergenCodes.length > 0
                        ? recipe.allergenCodes.map((code) => CHILD_ALLERGEN_LABELS[code]).join(' · ')
                        : '표시 알레르겐 없음'}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
