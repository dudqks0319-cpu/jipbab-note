'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChefHat, ChevronLeft, ChevronRight, List, RotateCcw, Timer, Wrench } from 'lucide-react'

import RecipeCookCompletion from '@/components/recipe/RecipeCookCompletion'
import RecipeCookFeedbackForm from '@/components/recipe/RecipeCookFeedbackForm'
import RecipeImage from '@/components/recipe/RecipeImage'
import { resolveRecipeCookStepIngredients } from '@/lib/recipe-cook-step'
import {
  createRecipeCookTimer,
  normalizeRecipeCookProgress,
  recipeCookProgressKey,
  remainingTimerSeconds,
  type RecipeCookFeedback,
  type RecipeCookTimer,
} from '@/lib/recipe-cook-progress'
import type {
  RecipeDetailStep,
  RecipeIngredientDetail,
  RecipePublicationEvidence,
} from '@/types'

type RecipeCookModeProps = {
  recipeId: string
  recipeVersion: number
  recipeName: string
  servings: number
  baseServings: number
  category: string
  thumbnailUrl: string | null
  publicationEvidence: RecipePublicationEvidence
  ingredientList: string[]
  ingredientDetails: RecipeIngredientDetail[]
  requiredTools: string[]
  storageTip: string | null
  reheatTip: string | null
  steps: RecipeDetailStep[]
}

type WakeLockSentinelLike = {
  release: () => Promise<void>
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
}

function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function formatDurationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes === 0) return `${remainder}초`
  if (remainder === 0) return `${minutes}분`
  return `${minutes}분 ${remainder}초`
}

function stepTimerSeconds(step: RecipeDetailStep): number | null {
  const seconds = step.timerPresetSeconds ?? step.durationSecondsMin
  return typeof seconds === 'number' && Number.isInteger(seconds) && seconds > 0 ? seconds : null
}

function stepDurationLabel(step: RecipeDetailStep): string | null {
  const minimum = step.durationSecondsMin
  if (typeof minimum !== 'number' || !Number.isInteger(minimum) || minimum <= 0) return null
  const maximum = step.durationSecondsMax
  if (typeof maximum !== 'number' || !Number.isInteger(maximum) || maximum <= minimum) {
    return formatDurationLabel(minimum)
  }
  return `${formatDurationLabel(minimum)}~${formatDurationLabel(maximum)}`
}

function playCompletionSignal(context: AudioContext | null) {
  navigator.vibrate?.([180, 100, 180])
  if (!context) return
  try {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.08, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.35)
  } catch {
    return
  }
}

export default function RecipeCookMode({
  recipeId,
  recipeVersion,
  recipeName,
  servings,
  baseServings,
  category,
  thumbnailUrl,
  publicationEvidence,
  ingredientList,
  ingredientDetails,
  requiredTools,
  storageTip,
  reheatTip,
  steps,
}: RecipeCookModeProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())
  const [activeTimer, setActiveTimer] = useState<RecipeCookTimer | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [suggestedFailedStepOrder, setSuggestedFailedStepOrder] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<RecipeCookFeedback | null>(null)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [hydrated, setHydrated] = useState(false)
  const [timerAnnouncement, setTimerAnnouncement] = useState('')
  const signaledTimerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const storageKey = recipeCookProgressKey(recipeId, servings)
  const legacyStorageKey = recipeCookProgressKey(recipeId)
  const stepIndexes = useMemo(() => steps.map((step) => step.index), [steps])
  const remainingSeconds = remainingTimerSeconds(activeTimer, now)
  const timerRunning = Boolean(activeTimer && remainingSeconds > 0)
  const allComplete = steps.length > 0 && checkedSteps.size === steps.length
  const progress = steps.length === 0 ? 0 : Math.round((checkedSteps.size / steps.length) * 100)
  const activeStep = steps[Math.min(activeStepIndex, steps.length - 1)] ?? null
  const activeStepIngredients = useMemo(
    () => activeStep ? resolveRecipeCookStepIngredients(activeStep, ingredientDetails) : [],
    [activeStep, ingredientDetails],
  )

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
        ?? (servings === baseServings ? window.localStorage.getItem(legacyStorageKey) : null)
      const saved = raw ? normalizeRecipeCookProgress(JSON.parse(raw), stepIndexes) : null
      if (saved) {
        setCheckedSteps(new Set(saved.checkedStepIndexes))
        setActiveStepIndex(saved.activeStepIndex)
        setActiveTimer(saved.timer)
        if (saved.timer && remainingTimerSeconds(saved.timer) === 0) {
          signaledTimerRef.current = saved.timer.endsAt
        }
        setStartedAt(saved.startedAt)
        setCompletedAt(saved.completedAt)
        setFeedback(saved.feedback)
      }
    } catch {
      window.localStorage.removeItem(storageKey)
    } finally {
      setHydrated(true)
    }
  }, [baseServings, legacyStorageKey, servings, stepIndexes, storageKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: 2,
        activeStepIndex,
        checkedStepIndexes: [...checkedSteps].sort((left, right) => left - right),
        timer: activeTimer,
        startedAt,
        completedAt,
        feedback,
        updatedAt: new Date().toISOString(),
      }))
    } catch {
      return
    }
  }, [activeStepIndex, activeTimer, checkedSteps, completedAt, feedback, hydrated, startedAt, storageKey])

  useEffect(() => {
    if (!activeTimer || remainingTimerSeconds(activeTimer) <= 0) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    const completion = window.setTimeout(() => {
      window.clearInterval(interval)
      setNow(Date.now())
    }, remainingTimerSeconds(activeTimer) * 1000 + 50)
    const sync = () => setNow(Date.now())
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(completion)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [activeTimer])

  useEffect(() => {
    if (!activeTimer || remainingSeconds > 0 || signaledTimerRef.current === activeTimer.endsAt) return
    signaledTimerRef.current = activeTimer.endsAt
    setTimerAnnouncement(`${activeTimer.stepIndex}단계 타이머가 끝났습니다.`)
    playCompletionSignal(audioContextRef.current)
  }, [activeTimer, remainingSeconds])

  useEffect(() => () => {
    if (audioContextRef.current) void audioContextRef.current.close()
  }, [])

  useEffect(() => {
    if (!activeTimer || !timerRunning) return
    let sentinel: WakeLockSentinelLike | null = null
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        sentinel = await (navigator as NavigatorWithWakeLock).wakeLock?.request('screen') ?? null
      } catch {
        sentinel = null
      }
    }
    void acquire()
    const reacquire = () => {
      if (document.visibilityState !== 'visible') {
        sentinel = null
        return
      }
      if (document.visibilityState === 'visible' && !sentinel) void acquire()
    }
    document.addEventListener('visibilitychange', reacquire)
    return () => {
      document.removeEventListener('visibilitychange', reacquire)
      if (sentinel) void sentinel.release()
    }
  }, [activeTimer, timerRunning])

  useEffect(() => {
    if (allComplete && !completedAt) setCompletedAt(new Date().toISOString())
    if (!allComplete && completedAt) {
      setCompletedAt(null)
    }
  }, [allComplete, completedAt])

  if (!activeStep) return null
  const activeTimerSeconds = stepTimerSeconds(activeStep)
  const activeDurationLabel = stepDurationLabel(activeStep)
  const activeStepComplete = checkedSteps.has(activeStep.index)
  const isLastStep = activeStepIndex === steps.length - 1

  const markStepComplete = (index: number) => {
    if (!startedAt) setStartedAt(new Date().toISOString())
    setCheckedSteps((previous) => {
      if (previous.has(index)) return previous
      const next = new Set(previous)
      next.add(index)
      return next
    })
  }
  const undoStepComplete = (index: number) => {
    setCheckedSteps((previous) => {
      if (!previous.has(index)) return previous
      const next = new Set(previous)
      next.delete(index)
      return next
    })
  }
  const completeAndContinue = () => {
    markStepComplete(activeStep.index)
    if (!isLastStep) setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))
  }
  const startTimer = (step: RecipeDetailStep) => {
    const duration = stepTimerSeconds(step)
    if (!duration) return
    const timer = createRecipeCookTimer(step.index, duration)
    if (!timer) return
    try {
      audioContextRef.current ??= new window.AudioContext()
    } catch {
      audioContextRef.current = null
    }
    signaledTimerRef.current = null
    if (!startedAt) setStartedAt(new Date().toISOString())
    setTimerAnnouncement('')
    setNow(Date.now())
    setActiveTimer(timer)
  }
  const resetProgress = () => {
    setCheckedSteps(new Set())
    setActiveStepIndex(0)
    setActiveTimer(null)
    setTimerAnnouncement('')
    setFeedbackOpen(false)
    setSuggestedFailedStepOrder(null)
    setStartedAt(null)
    setCompletedAt(null)
    setFeedback(null)
  }

  return (
    <section id="cook-mode" className="scroll-mt-24 px-5 pt-5">
      <div className="jipbab-panel rounded-[16px] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ChefHat size={18} className="shrink-0 text-[#ea5a1f]" />
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-black text-[#2f2117]">조리 모드</h2>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#8f7f70]">{recipeName} · {servings}인분</p>
            </div>
          </div>
          <span className="rounded-full bg-[#fff0e4] px-3 py-1 text-[11px] font-black text-[#d94d19]">{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1e4d7]" role="progressbar" aria-label="조리 진행률" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-[#ea5a1f]" style={{ width: `${progress}%` }} />
        </div>

        <p className="sr-only" aria-live="polite">
          {activeStep.index}단계, {activeStep.title || activeStep.action || activeStep.description}
        </p>

        <div className="mt-4 rounded-[16px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#2f2117] px-3 py-1 text-[11px] font-black text-white">{activeStep.index}/{steps.length}단계</span>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ${activeStepComplete ? 'bg-[#e7f4df] text-[#315f2d]' : 'bg-white text-[#7d6d5f]'}`}>
                {activeStepComplete ? '완료한 단계' : '진행 중'}
              </span>
            </div>
            <button type="button" aria-expanded={showAllSteps} aria-controls="cook-step-list" onClick={() => setShowAllSteps((current) => !current)} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[#eadcc9] px-3 text-[11px] font-black text-[#7d6d5f]">
              <List size={13} /> {showAllSteps ? '한 단계씩' : '전체보기'}
            </button>
          </div>
          {activeStep.imageUrl ? (
            <RecipeImage
              src={activeStep.imageUrl}
              alt={activeStep.imageAlt || `${recipeName} 조리 ${activeStep.index}단계`}
              caption={activeStep.imageCaption}
              className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-[14px] bg-[#f2eee8]"
              imageClassName="h-full w-full object-cover"
            />
          ) : null}
          <h3 className="mt-5 break-keep text-[19px] font-black leading-7 text-[#2f2117]">{activeStep.title || `${activeStep.index}단계`}</h3>
          <p className="mt-2 break-keep text-[21px] font-bold leading-[1.55] text-[#4b3929]">{activeStep.action || activeStep.description}</p>

          {activeStepIngredients.length > 0 ? (
            <section className="mt-5 rounded-[14px] border border-[#eadcc9] bg-white px-3 py-3" aria-labelledby={`cook-step-${activeStep.index}-ingredients`}>
              <h4 id={`cook-step-${activeStep.index}-ingredients`} className="text-[13px] font-black text-[#6f4b2e]">이 단계 재료</h4>
              <ul className="mt-2 divide-y divide-[#f0e8de]">
                {activeStepIngredients.map((ingredient) => (
                  <li key={ingredient.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="min-w-0 text-[14px] font-bold leading-6 text-[#4b3929]">
                      {ingredient.name}
                      {ingredient.usageText ? <small className="block text-[11px] font-semibold leading-4 text-[#8f7f70]">{ingredient.usageText}</small> : null}
                    </span>
                    <strong className="text-right text-[14px] leading-6 text-[#2f2117]">{ingredient.display}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {requiredTools.length > 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[#f4fbef] px-3 py-3 text-[#426e35]">
              <Wrench size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-[12px] font-bold leading-5"><strong>이 레시피 도구:</strong> {requiredTools.join(' · ')}</p>
            </div>
          ) : null}

          {activeStep.heat || activeDurationLabel ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-black">
              {activeStep.heat ? <span className="rounded-[12px] bg-[#fff0e4] px-3 py-2 text-[#d94d19]">불: {activeStep.heat}</span> : <span />}
              {activeDurationLabel ? <span className="rounded-[12px] bg-[#eef6df] px-3 py-2 text-[#3d7b38]">시간: {activeDurationLabel}</span> : null}
            </div>
          ) : null}
          <div className="mt-3 space-y-2 text-[13px] font-semibold leading-6">
            {activeStep.visualCue ? <p className="rounded-[12px] bg-white px-3 py-2 text-[#6e431d]">눈으로 확인: {activeStep.visualCue}</p> : null}
            {activeStep.beginnerTip ? <p className="rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[#a66a17]">초보 팁: {activeStep.beginnerTip}</p> : null}
            {activeStep.safetyNote ? <p className="rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[#a66a17]">안전: {activeStep.safetyNote}</p> : null}
            {activeStep.commonMistake ? <p className="rounded-[12px] bg-[#fff4f0] px-3 py-2 text-[#9d4b34]">주의: {activeStep.commonMistake}</p> : null}
            {activeStep.rescueTip ? <p className="rounded-[12px] bg-[#eef4ff] px-3 py-2 text-[#2f6fec]">막혔을 때: {activeStep.rescueTip}</p> : null}
          </div>
          {activeTimerSeconds ? (
            <button type="button" onClick={() => startTimer(activeStep)} style={{ minHeight: 52 }} className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#fff0e4] px-3 text-[14px] font-black text-[#d94d19]">
              <Timer size={14} />
              {activeTimer?.stepIndex === activeStep.index ? (remainingSeconds === 0 ? '타이머 완료' : formatRemainingTime(remainingSeconds)) : `${formatDurationLabel(activeTimerSeconds)} 타이머`}
            </button>
          ) : null}
          <button
            type="button"
            onClick={completeAndContinue}
            style={{ minHeight: 56 }}
            className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ea5a1f] px-4 text-[15px] font-black text-white shadow-[0_8px_20px_rgba(234,90,31,0.2)]"
          >
            <Check size={17} />
            {isLastStep ? '요리 완성하기' : activeStepComplete ? '다음 단계로' : '이 단계 완료하고 다음으로'}
            {!isLastStep ? <ChevronRight size={17} /> : null}
          </button>
          <div className={`mt-2 grid gap-2 ${activeStepComplete ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button type="button" onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))} disabled={activeStepIndex === 0} style={{ minHeight: 52 }} className="flex min-h-[52px] items-center justify-center gap-1 rounded-[14px] border border-[#eadcc9] bg-white text-[13px] font-black text-[#7d6d5f] disabled:opacity-40"><ChevronLeft size={15} /> 이전 단계</button>
            {activeStepComplete ? (
              <button type="button" onClick={() => undoStepComplete(activeStep.index)} style={{ minHeight: 52 }} className="flex min-h-[52px] items-center justify-center rounded-[14px] border border-[#eadcc9] bg-white px-3 text-[13px] font-black text-[#7d6d5f]">완료 취소</button>
            ) : null}
          </div>
          {!allComplete ? (
            <button
              type="button"
              onClick={() => {
                setSuggestedFailedStepOrder(activeStep.index)
                setFeedbackOpen(true)
              }}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-[13px] px-3 text-[12px] font-black text-[#8f5a43]"
            >
              현재 단계에서 조리를 멈췄어요
            </button>
          ) : null}
          <p className="sr-only" aria-live="assertive">{timerAnnouncement}</p>
        </div>

        {showAllSteps ? (
          <div id="cook-step-list" className="mt-3 space-y-2">
            {steps.map((step) => (
              <button key={step.index} type="button" aria-current={activeStep.index === step.index ? 'step' : undefined} onClick={() => { setActiveStepIndex(steps.findIndex((candidate) => candidate.index === step.index)); setShowAllSteps(false) }} style={{ minHeight: 52 }} className="flex min-h-[52px] w-full items-start gap-3 rounded-[13px] bg-[#fffaf3] px-3 py-3 text-left">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${checkedSteps.has(step.index) ? 'border-[#3d7b38] bg-[#3d7b38] text-white' : 'border-[#c9b7a4] text-[#8f7f70]'}`}>{checkedSteps.has(step.index) ? <Check size={13} /> : step.index}</span>
                <span className="text-sm font-semibold leading-6 text-[#4b3929]">{step.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {allComplete ? (
          <RecipeCookCompletion
            recipeId={recipeId}
            recipeName={recipeName}
            category={category}
            thumbnailUrl={thumbnailUrl}
            publicationEvidence={publicationEvidence}
            ingredientList={ingredientList}
            ingredientDetails={ingredientDetails}
            steps={steps}
            storageTip={storageTip}
            reheatTip={reheatTip}
            startedAt={startedAt}
            completedAt={completedAt}
            feedback={feedback}
          />
        ) : null}

        {feedbackOpen || allComplete ? (
          <RecipeCookFeedbackForm
            recipeId={recipeId}
            recipeVersion={recipeVersion}
            steps={steps}
            startedAt={startedAt}
            completedAt={completedAt}
            suggestedFailedStepOrder={allComplete ? null : suggestedFailedStepOrder}
            initialFeedback={feedback}
            onFeedbackChange={setFeedback}
          />
        ) : null}

        <button type="button" onClick={resetProgress} className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[12px] font-black text-[#8f7f70]"><RotateCcw size={14} /> 진행 초기화</button>
      </div>
    </section>
  )
}
