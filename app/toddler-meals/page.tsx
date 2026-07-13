import Link from 'next/link'
import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { notFound } from 'next/navigation'

import ToddlerDraftRecipeBrowser from '@/components/child-meals/ToddlerDraftRecipeBrowser'
import { CAREGIVER_SAFETY_COPY } from '@/lib/child-meals/constants'
import { TODDLER_MEALS_ENABLED } from '@/lib/child-meals/feature-flags'

export default function ToddlerMealsPreviewPage() {
  if (!TODDLER_MEALS_ENABLED) {
    notFound()
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-24">
      <header className="mobile-safe-top px-5">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link
            href="/recipe"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]"
            aria-label="레시피 목록으로 돌아가기"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="text-center">
            <p className="text-[10px] font-black text-[#d94d19]">내부 검수 미리보기</p>
            <h1 className="mt-0.5 text-[18px] font-black text-[#2f2117]">24~36개월 유아식</h1>
          </div>
          <span />
        </div>
      </header>

      <main className="px-5 pt-4">
        <section className="rounded-[18px] border border-[#ffd1bd] bg-[#fff0e4] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#d94d19]" />
            <div>
              <h2 className="text-[14px] font-black text-[#4b3929]">아직 운영 공개 전이에요</h2>
              <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#7d553d]">
                아래 레시피는 기능과 문장을 확인하기 위한 초안입니다. 실제 조리, 식품 안전, 아동식, 이미지 권리 검수를 모두 통과하기 전에는 일반 사용자에게 공개하지 않습니다.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-[18px] border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
          <p className="break-keep text-[12px] font-bold leading-5 text-[#426e35]">{CAREGIVER_SAFETY_COPY}</p>
        </section>

        <div className="mt-4">
          <ToddlerDraftRecipeBrowser />
        </div>
      </main>
    </div>
  )
}
