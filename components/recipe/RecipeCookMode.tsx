// 이 파일은 레시피 상세의 조리 모드 체크리스트를 담당합니다.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChefHat, ChevronLeft, ChevronRight, List, Timer } from 'lucide-react'

import type { RecipeDetailStep } from '@/types'

type RecipeCookModeProps = {
  recipeName: string
  steps: RecipeDetailStep[]
}

export default function RecipeCookMode({ recipeName, steps }: RecipeCookModeProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())
  const [activeTimer, setActiveTimer] = useState<{ stepIndex: number; remainingSeconds: number } | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [showAllSteps, setShowAllSteps] = useState(false)
  const progress = useMemo(() => {
    if (steps.length === 0) {
      return 0
    }
    return Math.round((checkedSteps.size / steps.length) * 100)
  }, [checkedSteps.size, steps.length])

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  useEffect(() => {
    if (!activeTimer || activeTimer.remainingSeconds <= 0) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setActiveTimer((prev) =>
        prev && prev.remainingSeconds > 0
          ? { ...prev, remainingSeconds: prev.remainingSeconds - 1 }
          : prev,
      )
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [activeTimer])

  const getStepTimerMinutes = (description: string): number | null => {
    const match = description.match(/(\d+)\s*분/)
    if (!match) {
      return null
    }
    const minutes = Number(match[1])
    return Number.isFinite(minutes) && minutes > 0 && minutes <= 30 ? minutes : null
  }

  const formatRemainingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }

  if (steps.length === 0) {
    return null
  }
  const activeStep = steps[Math.min(activeStepIndex, steps.length - 1)]
  const activeTimerMinutes = activeStep ? activeStep.minutes ?? getStepTimerMinutes(activeStep.description) : null

  return (
    <section id="cook-mode" className="scroll-mt-24 px-5 pt-5">
      <div className="jipbab-panel rounded-[16px] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ChefHat size={18} className="shrink-0 text-[#ea5a1f]" />
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-black text-[#2f2117]">조리 모드</h2>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#8f7f70]">{recipeName}</p>
            </div>
          </div>
          <span className="rounded-full bg-[#fff0e4] px-3 py-1 text-[11px] font-black text-[#d94d19]">{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1e4d7]">
          <div className="h-full rounded-full bg-[#ea5a1f]" style={{ width: `${progress}%` }} />
        </div>
        {activeStep ? (
          <div className="mt-4 rounded-[16px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#2f2117] px-3 py-1 text-[11px] font-black text-white">
                {activeStep.index}/{steps.length}
              </span>
              <button
                type="button"
                onClick={() => setShowAllSteps((prev) => !prev)}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#eadcc9] px-3 text-[11px] font-black text-[#7d6d5f]"
              >
                <List size={13} />
                {showAllSteps ? '한 단계씩' : '전체보기'}
              </button>
            </div>
            <h3 className="mt-3 text-[18px] font-black leading-6 text-[#2f2117]">
              {activeStep.title || `${activeStep.index}단계`}
            </h3>
            <p className="mt-2 text-[15px] font-bold leading-7 text-[#4b3929]">
              {activeStep.action || activeStep.description}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-black">
              <span className="rounded-[12px] bg-[#fff0e4] px-3 py-2 text-[#d94d19]">불: {activeStep.heat ?? '확인'}</span>
              <span className="rounded-[12px] bg-[#eef6df] px-3 py-2 text-[#3d7b38]">시간: {activeStep.minutes ?? activeTimerMinutes ?? 1}분</span>
            </div>
            <div className="mt-3 space-y-2 text-[12px] font-semibold leading-5">
              {activeStep.visualCue ? (
                <p className="rounded-[12px] bg-white px-3 py-2 text-[#6e431d]">눈으로 확인: {activeStep.visualCue}</p>
              ) : null}
              {activeStep.commonMistake ? (
                <p className="rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[#a66a17]">자주 하는 실수: {activeStep.commonMistake}</p>
              ) : null}
              {activeStep.rescueTip ? (
                <p className="rounded-[12px] bg-[#eef4ff] px-3 py-2 text-[#2f6fec]">망했어요: {activeStep.rescueTip}</p>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-[0.8fr_1.2fr_0.8fr] gap-2">
              <button
                type="button"
                onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeStepIndex === 0}
                className="flex min-h-12 items-center justify-center gap-1 rounded-[14px] border border-[#eadcc9] text-[12px] font-black text-[#7d6d5f] disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                이전
              </button>
              <button
                type="button"
                onClick={() => toggleStep(activeStep.index)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-[14px] text-[13px] font-black ${
                  checkedSteps.has(activeStep.index)
                    ? 'bg-[#3d7b38] text-white'
                    : 'bg-[#2f2117] text-white'
                }`}
              >
                <Check size={15} />
                {checkedSteps.has(activeStep.index) ? '완료됨' : '완료 체크'}
              </button>
              <button
                type="button"
                onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                disabled={activeStepIndex >= steps.length - 1}
                className="flex min-h-12 items-center justify-center gap-1 rounded-[14px] bg-[#ea5a1f] text-[12px] font-black text-white disabled:opacity-40"
              >
                다음
                <ChevronRight size={15} />
              </button>
            </div>
            {activeTimerMinutes ? (
              <button
                type="button"
                onClick={() => setActiveTimer({ stepIndex: activeStep.index, remainingSeconds: activeTimerMinutes * 60 })}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-[13px] bg-[#fff0e4] px-3 text-[12px] font-black text-[#d94d19]"
              >
                <Timer size={13} />
                {activeTimer?.stepIndex === activeStep.index
                  ? activeTimer.remainingSeconds === 0
                    ? '타이머 완료'
                    : formatRemainingTime(activeTimer.remainingSeconds)
                  : `${activeTimerMinutes}분 타이머`}
              </button>
            ) : null}
          </div>
        ) : null}
        {showAllSteps ? (
        <div className="mt-3 space-y-2">
          {steps.map((step) => {
            const checked = checkedSteps.has(step.index)
            const timerMinutes = getStepTimerMinutes(step.description)
            return (
              <div
                key={step.index}
                className="flex w-full items-start gap-3 rounded-[13px] bg-[#fffaf3] px-3 py-3 text-left"
              >
                <button
                  type="button"
                  onClick={() => toggleStep(step.index)}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${checked ? 'border-[#3d7b38] bg-[#3d7b38] text-white' : 'border-[#c9b7a4] text-[#8f7f70]'}`}
                  aria-label={`${step.index}단계 완료 토글`}
                >
                  {checked ? <Check size={13} /> : step.index}
                </button>
                <span className="min-w-0">
                  <span className={`block text-sm leading-6 ${checked ? 'text-[#9f9388] line-through' : 'text-[#4b3929]'}`}>
                    {step.description}
                  </span>
                  {step.beginnerTip ? (
                    <span className={`mt-1 block text-[12px] font-semibold leading-5 ${checked ? 'text-[#b5a493]' : 'text-[#8f7f70]'}`}>
                      {step.beginnerTip}
                    </span>
                  ) : null}
                  {timerMinutes ? (
                    <button
                      type="button"
                      onClick={() => setActiveTimer({ stepIndex: step.index, remainingSeconds: timerMinutes * 60 })}
                      className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-full bg-[#fff0e4] px-3 text-[11px] font-black text-[#d94d19]"
                    >
                      <Timer size={12} />
                      {activeTimer?.stepIndex === step.index
                        ? activeTimer.remainingSeconds === 0
                          ? '타이머 완료'
                          : formatRemainingTime(activeTimer.remainingSeconds)
                        : `${timerMinutes}분 타이머`}
                    </button>
                  ) : null}
                </span>
              </div>
            )
          })}
        </div>
        ) : null}
      </div>
    </section>
  )
}
