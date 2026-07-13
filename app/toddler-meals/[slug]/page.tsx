import Link from 'next/link'
import { AlertTriangle, Baby, ChevronLeft, Clock3, CookingPot, ShieldCheck, Users } from 'lucide-react'
import { notFound } from 'next/navigation'

import {
  CAREGIVER_SAFETY_COPY,
  CHILD_ALLERGEN_LABELS,
  CHILD_MEAL_TYPE_LABELS,
} from '@/lib/child-meals/constants'
import { getToddlerDraftRecipe } from '@/lib/child-meals/draft-recipes'
import { TODDLER_MEALS_ENABLED } from '@/lib/child-meals/feature-flags'

type ToddlerMealDetailPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ToddlerMealDetailPage({ params }: ToddlerMealDetailPageProps) {
  if (!TODDLER_MEALS_ENABLED) {
    notFound()
  }

  const { slug } = await params
  const recipe = getToddlerDraftRecipe(slug)
  if (!recipe) {
    notFound()
  }

  return (
    <div className="min-h-full bg-white pb-24 text-[#2b2b2b]">
      <header className="mobile-safe-top px-5">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link
            href="/toddler-meals"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]"
            aria-label="유아식 목록으로 돌아가기"
          >
            <ChevronLeft size={18} />
          </Link>
          <p className="text-center text-[12px] font-black text-[#d94d19]">검수 전 레시피</p>
          <span />
        </div>
      </header>

      <main>
        <section className="px-5 pt-4">
          <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[#fff0e4] via-[#fff8ed] to-[#eaf4df] text-[#d94d19]">
            <CookingPot size={48} aria-hidden="true" />
          </div>
          <p className="mt-5 text-[12px] font-black text-[#d94d19]">
            {recipe.minAgeMonths}~{recipe.maxAgeMonths}개월 참고 · {recipe.mealTypes.map((mealType) => CHILD_MEAL_TYPE_LABELS[mealType]).join(' · ')}
          </p>
          <h1 className="mt-2 break-keep text-[31px] font-black leading-[1.22] text-[#2d2d2d]">{recipe.title}</h1>
          <p className="mt-3 break-keep text-[16px] font-medium leading-7 text-[#5c534b]">{recipe.summary}</p>

          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            <Metric icon={<Baby size={16} />} label={`${recipe.minAgeMonths}개월+`} />
            <Metric icon={<Clock3 size={16} />} label={`손 ${recipe.activeTimeMinutes}분`} />
            <Metric icon={<CookingPot size={16} />} label={`총 ${recipe.totalTimeMinutes}분`} />
            <Metric icon={<Users size={16} />} label={recipe.familySplitSupported ? '가족식 같이' : '아이식'} />
          </div>
        </section>

        <section className="px-5 pt-5">
          <div className="rounded-[18px] border border-[#ffd1bd] bg-[#fff0e4] px-4 py-4">
            <div className="flex items-center gap-2 text-[#d94d19]">
              <AlertTriangle size={18} />
              <h2 className="text-[16px] font-black">운영 공개 전 확인</h2>
            </div>
            <p className="mt-2 break-keep text-[12px] font-semibold leading-5 text-[#7d553d]">
              실제 조리·식품 안전·아동식·이미지 권리 검수가 완료되지 않은 내부 미리보기입니다.
            </p>
          </div>
        </section>

        <section className="px-5 pt-4">
          <div className="rounded-[18px] border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
            <div className="flex items-center gap-2 text-[#426e35]">
              <ShieldCheck size={18} />
              <h2 className="text-[16px] font-black">아이에게 안전하게</h2>
            </div>
            <p className="mt-2 break-keep text-[12px] font-semibold leading-5 text-[#426e35]">{CAREGIVER_SAFETY_COPY}</p>
            <div className="mt-3 space-y-2">
              {recipe.servingShapeNotes.map((note) => (
                <div key={`${note.ingredientName}-${note.instruction}`} className="rounded-[13px] bg-white px-3 py-3">
                  <p className="text-[12px] font-black text-[#365c2e]">{note.ingredientName}</p>
                  <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#5d7655]">{note.instruction}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pt-4">
          <div className="rounded-[18px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
            <h2 className="text-[16px] font-black text-[#2f2117]">알레르겐</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {recipe.allergenCodes.length > 0 ? (
                recipe.allergenCodes.map((code) => (
                  <span key={code} className="rounded-full border border-[#f0c7b2] bg-white px-3 py-2 text-[12px] font-black text-[#a4532d]">
                    {CHILD_ALLERGEN_LABELS[code]}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-white px-3 py-2 text-[12px] font-bold text-[#7d6d5f]">표시 알레르겐 없음</span>
              )}
            </div>
            <p className="mt-3 break-keep text-[11px] font-semibold leading-5 text-[#8f7f70]">
              제품별 원재료와 교차혼입 표시는 구매한 포장 라벨에서 다시 확인해야 합니다.
            </p>
          </div>
        </section>

        {recipe.familySplitSupported ? (
          <section className="px-5 pt-4">
            <div className="rounded-[18px] border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
              <div className="flex items-center gap-2 text-[#426e35]">
                <Users size={18} />
                <h2 className="text-[16px] font-black">아이 몫 먼저 덜기</h2>
              </div>
              <p className="mt-2 break-keep text-[13px] font-bold leading-6 text-[#426e35]">{recipe.familySplitInstruction}</p>
            </div>
          </section>
        ) : null}

        <section className="px-5 pt-7">
          <div className="border-b-2 border-[#2d2d2d] pb-3">
            <h2 className="text-[25px] font-black">재료</h2>
            <p className="mt-1 text-[12px] font-semibold text-[#7a7168]">{recipe.servingLabel}</p>
          </div>
          <ul className="divide-y divide-[#ededed]">
            {recipe.ingredients.map((ingredient) => (
              <li key={`${ingredient.name}-${ingredient.display}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
                <div>
                  <p className="text-[17px] font-bold text-[#303030]">
                    {ingredient.name}
                    {ingredient.optional ? <span className="ml-2 text-[11px] text-[#8d8177]">선택</span> : null}
                  </p>
                  {ingredient.prepNote ? <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a7168]">손질: {ingredient.prepNote}</p> : null}
                </div>
                <span className="text-right text-[16px] font-bold text-[#303030]">{ingredient.display}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-5 pt-6">
          <div className="border-b-2 border-[#2d2d2d] pb-3">
            <h2 className="text-[25px] font-black">조리 순서</h2>
          </div>
          <ol className="mt-4 space-y-4">
            {recipe.steps.map((step) => (
              <li key={step.order} className={`rounded-[18px] border p-4 ${step.familySplitPoint ? 'border-[#b9dca8] bg-[#f4fbef]' : 'border-[#ece8e2] bg-[#faf8f5]'}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2f2117] text-[13px] font-black text-white">{step.order}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[17px] font-black text-[#2f2117]">{step.title}</h3>
                      {step.familySplitPoint ? <span className="rounded-full bg-[#dff1d4] px-2 py-1 text-[10px] font-black text-[#3d7b38]">아이 몫 덜기</span> : null}
                    </div>
                    <p className="mt-2 break-keep text-[14px] font-semibold leading-6 text-[#4f4841]">{step.action}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-black">
                      <p className="rounded-[11px] bg-white px-3 py-2 text-[#8b512d]">불: {step.heat}</p>
                      <p className="rounded-[11px] bg-white px-3 py-2 text-[#4d6f91]">시간: 약 {step.minutes}분</p>
                    </div>
                    <p className="mt-2 rounded-[11px] bg-white px-3 py-2 text-[12px] font-bold leading-5 text-[#3d7b38]">완료 신호: {step.visualCue}</p>
                    <p className="mt-2 rounded-[11px] bg-[#fff8ed] px-3 py-2 text-[12px] font-bold leading-5 text-[#8a5a2a]">안전: {step.safetyNote}</p>
                    <p className="mt-2 text-[11px] font-semibold leading-5 text-[#7a7168]">실수하기 쉬운 점: {step.commonMistake}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-[#5c7c4d]">복구: {step.rescueTip}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="px-5 pt-6">
          <div className="rounded-[18px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
            <h2 className="text-[17px] font-black text-[#2f2117]">잘 안 먹는 날</h2>
            <p className="mt-2 break-keep text-[13px] font-semibold leading-6 text-[#6f5d4f]">{recipe.pickyEatingTip}</p>
          </div>
        </section>

        <section className="px-5 pt-4">
          <div className="rounded-[18px] border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
            <h2 className="text-[17px] font-black text-[#2f2117]">남았을 때</h2>
            <p className="mt-3 rounded-[12px] bg-white px-3 py-3 text-[12px] font-bold leading-5 text-[#5d554d]">보관: {recipe.storageGuide}</p>
            <p className="mt-2 rounded-[12px] bg-white px-3 py-3 text-[12px] font-bold leading-5 text-[#5d554d]">다시 데우기: {recipe.reheatingGuide}</p>
          </div>
        </section>
      </main>
    </div>
  )
}

function Metric({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-[13px] border border-[#ece8e2] bg-[#faf8f5] px-1 py-3">
      <span className="mx-auto flex h-5 w-5 items-center justify-center text-[#78a95f]">{icon}</span>
      <p className="mt-1 break-keep text-[11px] font-black leading-4 text-[#39342f]">{label}</p>
    </div>
  )
}
