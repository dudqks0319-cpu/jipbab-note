// 이 파일은 검수 전 이유식·유아식 조사 후보를 연령대별로 안전하게 탐색하는 화면입니다.
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertTriangle, Baby, ChevronLeft, Clock3, FlaskConical, ShieldCheck } from 'lucide-react'

import {
  INFANT_TODDLER_RECIPE_CANDIDATES,
  INFANT_TODDLER_STAGE_COUNTS,
  type InfantToddlerStage,
} from '@/lib/infant-toddler-recipes'

const STAGE_FILTERS: Array<'전체' | InfantToddlerStage> = [
  '전체',
  '4~6개월',
  '6~8개월',
  '8~11개월',
  '12개월 이상',
]

const QUANTITY_LABEL = {
  recorded: '조사 정량 있음',
  partial: '일부 정량 검수 필요',
  source_review_required: '정량 검수 필요',
} as const

export default function InfantToddlerRecipePage() {
  const [selectedStage, setSelectedStage] = useState<'전체' | InfantToddlerStage>('전체')
  const visibleRecipes = useMemo(
    () => selectedStage === '전체'
      ? INFANT_TODDLER_RECIPE_CANDIDATES
      : INFANT_TODDLER_RECIPE_CANDIDATES.filter((recipe) => recipe.stage === selectedStage),
    [selectedStage],
  )

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-28">
      <header className="mobile-safe-top px-5">
        <Link
          href="/recipe"
          className="inline-flex min-h-11 items-center gap-1 text-[13px] font-black text-[#7d6d5f]"
        >
          <ChevronLeft size={17} />
          레시피로 돌아가기
        </Link>
        <div className="mt-2 flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#eef4ff] text-[#2f6fec]">
            <Baby size={25} />
          </span>
          <div>
            <p className="text-[12px] font-black text-[#2f6fec]">조사 후보 24개</p>
            <h1 className="mt-0.5 text-[24px] font-black text-[#2f2117]">이유식·유아식 연구실</h1>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-[#7d6d5f]">
              월령과 안전·권리 검수를 마치기 전 참고할 수 있도록 조사 내용을 정리했어요.
            </p>
          </div>
        </div>
      </header>

      <section className="px-5 pt-4" aria-labelledby="infant-safety-title">
        <div className="rounded-[18px] border border-[#f1c997] bg-[#fff8e8] p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={19} className="mt-0.5 shrink-0 text-[#b56a14]" />
            <div>
              <h2 id="infant-safety-title" className="text-[14px] font-black text-[#5b3b16]">검수 전 참고용</h2>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7b5a31]">
                이 화면은 의료 진단이나 개인별 영양 처방을 대신하지 않아요. 시작 시기와 입자 크기는 아이의 발달 상태를 보고 보호자와 소아청소년과가 판단해 주세요.
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-[12px] font-semibold leading-5 text-[#7b5a31]">
            <li>• 새 재료는 한 번에 하나씩 도입하고 이상 반응을 관찰해 주세요.</li>
            <li>• 만 12개월 전에는 꿀과 꿀이 든 가공식품을 주지 마세요.</li>
            <li>• 외부 원문·사진은 사용하지 않았으며 실제 조리·의학·권리 검수 전에는 공개 레시피로 승격하지 않습니다.</li>
          </ul>
        </div>
      </section>

      <section className="px-5 pt-4" aria-label="월령 필터">
        <div data-testid="infant-toddler-stage-filter" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STAGE_FILTERS.map((stage) => {
            const count = stage === '전체' ? INFANT_TODDLER_RECIPE_CANDIDATES.length : INFANT_TODDLER_STAGE_COUNTS[stage]
            const active = selectedStage === stage
            return (
              <button
                key={stage}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedStage(stage)}
                className={`min-h-11 rounded-full border px-3 text-[12px] font-black ${
                  active
                    ? 'border-[#2f6fec] bg-[#eef4ff] text-[#2f6fec]'
                    : 'border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f]'
                }`}
              >
                {stage} · {count}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3 px-5 pt-4" aria-live="polite">
        {visibleRecipes.map((recipe) => (
          <article key={recipe.id} className="jipbab-panel overflow-hidden rounded-[18px]">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#eef4ff] px-2 py-1 text-[11px] font-black text-[#2f6fec]">
                      {recipe.ageLabel}
                    </span>
                    <span className="rounded-full bg-[#fff0e4] px-2 py-1 text-[11px] font-black text-[#d94d19]">
                      {QUANTITY_LABEL[recipe.quantityStatus]}
                    </span>
                  </div>
                  <h2 className="mt-2 text-[17px] font-black text-[#2f2117]">{recipe.name}</h2>
                </div>
                <span className="shrink-0 rounded-full bg-[#f2f7e7] px-2 py-1 text-[11px] font-black text-[#3d7b38]">
                  신뢰도 {recipe.reliability}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold text-[#7d6d5f]">
                <span className="inline-flex items-center gap-1"><Clock3 size={13} />{recipe.timeLabel}</span>
                <span>{recipe.difficulty}</span>
                <span>알레르기: {recipe.allergens.length > 0 ? recipe.allergens.join('·') : '별도 표시 없음'}</span>
              </div>

              <details className="mt-3 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-2.5">
                <summary className="min-h-11 cursor-pointer py-3 text-[13px] font-black text-[#4b3929]">
                  조사된 재료와 조리 흐름 보기
                </summary>
                <div className="border-t border-[#eadcc9] pb-2 pt-3">
                  <h3 className="text-[12px] font-black text-[#4b3929]">재료</h3>
                  <ul className="mt-1.5 space-y-1 text-[12px] font-semibold leading-5 text-[#6f5f51]">
                    {recipe.ingredients.map((ingredient) => <li key={ingredient}>• {ingredient}</li>)}
                  </ul>

                  <h3 className="mt-3 text-[12px] font-black text-[#4b3929]">조리 흐름 요약</h3>
                  <ol className="mt-1.5 space-y-1 text-[12px] font-semibold leading-5 text-[#6f5f51]">
                    {recipe.preparationSummary.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
                  </ol>

                  <div className="mt-3 rounded-[12px] bg-[#fff8e8] p-3 text-[11px] font-semibold leading-5 text-[#7b5a31]">
                    {recipe.safetyNotes.map((note) => <p key={note}>• {note}</p>)}
                  </div>
                  <p className="mt-3 text-[11px] font-semibold leading-5 text-[#8f7f70]">
                    출처 분류: {recipe.sourceName} · {recipe.rightsNote}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-[#8f7f70]">{recipe.storageNote}</p>
                </div>
              </details>
            </div>
          </article>
        ))}
      </section>

      <section className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-2 rounded-[16px] border border-[#eadcc9] bg-[#fffaf3] p-3 text-[11px] font-black text-[#7d6d5f]">
          <span className="inline-flex min-h-11 items-center justify-center gap-1"><FlaskConical size={15} />실제 조리 0/24</span>
          <span className="inline-flex min-h-11 items-center justify-center gap-1"><ShieldCheck size={15} />공개 승인 0/24</span>
        </div>
      </section>
    </div>
  )
}
