'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChefHat, ChevronLeft, ChevronRight, List, Pause, Play, RotateCcw, Timer } from 'lucide-react'

import {
  createRecipeCookTimer,
  normalizeRecipeCookProgress,
  pauseRecipeCookTimer,
  recipeCookProgressKey,
  remainingTimerSeconds,
  resumeRecipeCookTimer,
  upsertRecipeCookTimer,
  type RecipeCookFeedback,
  type RecipeCookTimer,
} from '@/lib/recipe-cook-progress'
import {
  cancelCookTimerNotification,
  scheduleCookTimerNotification,
} from '@/lib/notifications'
import type { RecipeDetailStep } from '@/types'
import { trackProductAnalyticsEvent } from '@/lib/product-analytics'
import RecipeCookingSessionForm from '@/components/recipe/RecipeCookingSessionForm'
import { recordRecentRecipe } from '@/lib/recent-recipes'

type RecipeCookModeProps = {
  recipeId: string
  recipeName: string
  recipeCategory: string
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

export default function RecipeCookMode({ recipeId, recipeName, recipeCategory, steps }: RecipeCookModeProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())
  const [activeTimers, setActiveTimers] = useState<RecipeCookTimer[]>([])
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [feedback, setFeedback] = useState<RecipeCookFeedback | null>(null)
  const [clientSessionId, setClientSessionId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [hydrated, setHydrated] = useState(false)
  const [timerAnnouncement, setTimerAnnouncement] = useState('')
  const [hasStarted, setHasStarted] = useState(false)
  const signaledTimerRef = useRef<Set<number>>(new Set())
  const audioContextRef = useRef<AudioContext | null>(null)
  const completedEventRef = useRef(false)
  const storageKey = recipeCookProgressKey(recipeId)
  const stepIndexes = useMemo(() => steps.map((step) => step.index), [steps])
  const activeStepNumber = steps[Math.min(activeStepIndex, Math.max(steps.length - 1, 0))]?.index ?? 0
  const activeTimer = activeTimers.find((timer) => timer.stepIndex === activeStepNumber) ?? null
  const remainingSeconds = remainingTimerSeconds(activeTimer, now)
  const timerPaused = Boolean(activeTimer && Number.isInteger(activeTimer.pausedRemainingSeconds))
  const timerRunning = Boolean(activeTimer && remainingSeconds > 0 && !timerPaused)
  const hasRunningTimer = activeTimers.some(
    (timer) => remainingTimerSeconds(timer, now) > 0 && !Number.isInteger(timer.pausedRemainingSeconds),
  )
  const allComplete = steps.length > 0 && checkedSteps.size === steps.length
  const progress = steps.length === 0 ? 0 : Math.round((checkedSteps.size / steps.length) * 100)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      const saved = raw ? normalizeRecipeCookProgress(JSON.parse(raw), stepIndexes) : null
      if (saved) {
        setCheckedSteps(new Set(saved.checkedStepIndexes))
        setActiveStepIndex(saved.activeStepIndex)
        setActiveTimers(saved.timers)
        for (const timer of saved.timers) {
          if (remainingTimerSeconds(timer) === 0) signaledTimerRef.current.add(timer.endsAt)
        }
        setCompletedAt(saved.completedAt)
        setFeedback(saved.feedback)
        setClientSessionId(saved.clientSessionId)
        setStartedAt(saved.startedAt)
        setHasStarted(Boolean(saved.checkedStepIndexes.length || saved.timers.length || saved.completedAt))
        completedEventRef.current = Boolean(saved.completedAt)
      }
    } catch {
      window.localStorage.removeItem(storageKey)
    } finally {
      setHydrated(true)
    }
  }, [stepIndexes, storageKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: 2,
        clientSessionId,
        startedAt,
        activeStepIndex,
        checkedStepIndexes: [...checkedSteps].sort((left, right) => left - right),
        timers: activeTimers,
        completedAt,
        feedback,
        updatedAt: new Date().toISOString(),
      }))
    } catch {
      return
    }
  }, [activeStepIndex, activeTimers, checkedSteps, clientSessionId, completedAt, feedback, hydrated, startedAt, storageKey])

  useEffect(() => {
    if (!hasRunningTimer) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    const sync = () => setNow(Date.now())
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [hasRunningTimer])

  useEffect(() => {
    const completedTimers = activeTimers.filter(
      (timer) => remainingTimerSeconds(timer, now) === 0 && !signaledTimerRef.current.has(timer.endsAt),
    )
    if (completedTimers.length === 0) return
    for (const timer of completedTimers) {
      signaledTimerRef.current.add(timer.endsAt)
      trackProductAnalyticsEvent('timer_completed', {
        recipeId,
        stepIndex: timer.stepIndex,
        durationSeconds: timer.durationSeconds,
      })
    }
    setTimerAnnouncement(`${completedTimers.map((timer) => `${timer.stepIndex}단계`).join(', ')} 타이머가 끝났습니다.`)
    playCompletionSignal(audioContextRef.current)
  }, [activeTimers, now, recipeId])

  useEffect(() => () => {
    if (audioContextRef.current) void audioContextRef.current.close()
  }, [])

  useEffect(() => {
    if (!hasRunningTimer) return
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
  }, [hasRunningTimer])

  useEffect(() => {
    if (allComplete && !completedAt) setCompletedAt(new Date().toISOString())
    if (!allComplete && completedAt) {
      setCompletedAt(null)
      setFeedback(null)
    }
  }, [allComplete, completedAt])

  useEffect(() => {
    if (!allComplete || completedEventRef.current) return
    completedEventRef.current = true
    recordRecentRecipe(recipeId, recipeCategory)
    trackProductAnalyticsEvent('cooking_completed', { recipeId, stepIndex: steps.length })
  }, [allComplete, recipeCategory, recipeId, steps.length])

  if (steps.length === 0) return null
  const activeStep = steps[Math.min(activeStepIndex, steps.length - 1)]
  const activeTimerSeconds = stepTimerSeconds(activeStep)

  const toggleStep = (index: number) => {
    setCheckedSteps((previous) => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    if (!checkedSteps.has(index)) {
      trackProductAnalyticsEvent('cooking_step_completed', { recipeId, stepIndex: index })
    }
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
    signaledTimerRef.current.delete(timer.endsAt)
    setTimerAnnouncement('')
    setNow(() => Date.now())
    setActiveTimers((current) => upsertRecipeCookTimer(current, timer))
    void scheduleCookTimerNotification(recipeId, recipeName, timer).catch(() => undefined)
    trackProductAnalyticsEvent('timer_started', {
      recipeId,
      stepIndex: step.index,
      durationSeconds: duration,
    })
  }
  const toggleTimer = (step: RecipeDetailStep) => {
    if (activeTimer?.stepIndex !== step.index || remainingSeconds === 0) {
      startTimer(step)
      return
    }
    const nextTimer = timerPaused
      ? resumeRecipeCookTimer(activeTimer)
      : pauseRecipeCookTimer(activeTimer)
    if (!nextTimer) return
    setNow(() => Date.now())
    if (!timerPaused) {
      trackProductAnalyticsEvent('timer_paused', {
        recipeId,
        stepIndex: step.index,
        durationSeconds: remainingSeconds,
      })
      void cancelCookTimerNotification(recipeId, step.index).catch(() => undefined)
    } else {
      signaledTimerRef.current.delete(nextTimer.endsAt)
      void scheduleCookTimerNotification(recipeId, recipeName, nextTimer).catch(() => undefined)
    }
    setActiveTimers((current) => upsertRecipeCookTimer(current, nextTimer))
  }
  const resetProgress = () => {
    if (hasStarted && !allComplete) {
      trackProductAnalyticsEvent('cooking_abandoned', { recipeId, stepIndex: activeStepIndex + 1 })
    }
    setCheckedSteps(new Set())
    setActiveStepIndex(0)
    for (const timer of activeTimers) {
      void cancelCookTimerNotification(recipeId, timer.stepIndex).catch(() => undefined)
    }
    setActiveTimers([])
    setTimerAnnouncement('')
    setCompletedAt(null)
    setFeedback(null)
    setClientSessionId(null)
    setStartedAt(null)
    setHasStarted(false)
    completedEventRef.current = false
    signaledTimerRef.current.clear()
  }

  const startCooking = () => {
    setClientSessionId(window.crypto.randomUUID())
    setStartedAt(new Date().toISOString())
    setHasStarted(true)
    trackProductAnalyticsEvent('cooking_started', { recipeId, stepIndex: 1 })
    trackProductAnalyticsEvent('cooking_step_viewed', { recipeId, stepIndex: steps[0]?.index ?? 1 })
  }

  const selectStep = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(steps.length - 1, nextIndex))
    setActiveStepIndex(boundedIndex)
    trackProductAnalyticsEvent('cooking_step_viewed', {
      recipeId,
      stepIndex: steps[boundedIndex]?.index ?? boundedIndex + 1,
    })
  }

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
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1e4d7]" role="progressbar" aria-label="조리 진행률" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-[#ea5a1f]" style={{ width: `${progress}%` }} />
        </div>

        {!hasStarted ? (
          <button
            type="button"
            data-testid="recipe-start-cooking"
            onClick={startCooking}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-[15px] bg-[#ea5a1f] px-4 text-[16px] font-black text-white"
          >
            <ChefHat size={18} />
            이 레시피로 요리 시작
          </button>
        ) : null}

        {hasStarted ? <div className="mt-4 rounded-[16px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#2f2117] px-3 py-1 text-[11px] font-black text-white">{activeStep.index}/{steps.length}</span>
            <button type="button" onClick={() => setShowAllSteps((current) => !current)} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[#eadcc9] px-3 text-[11px] font-black text-[#7d6d5f]">
              <List size={13} /> {showAllSteps ? '한 단계씩' : '전체보기'}
            </button>
          </div>
          <h3 className="mt-3 text-[18px] font-black leading-6 text-[#2f2117]">{activeStep.title || `${activeStep.index}단계`}</h3>
          <p className="mt-2 text-[15px] font-bold leading-7 text-[#4b3929]">{activeStep.action || activeStep.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-black">
            <span className="rounded-[12px] bg-[#fff0e4] px-3 py-2 text-[#d94d19]">불: {activeStep.heat}</span>
            <span className="rounded-[12px] bg-[#eef6df] px-3 py-2 text-[#3d7b38]">시간: {formatDurationLabel(activeStep.durationSecondsMin ?? 0)}</span>
          </div>
          <div className="mt-3 space-y-2 text-[12px] font-semibold leading-5">
            {activeStep.visualCue ? <p className="rounded-[12px] bg-white px-3 py-2 text-[#6e431d]">눈으로 확인: {activeStep.visualCue}</p> : null}
            {activeStep.beginnerTip ? <p className="rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[#a66a17]">안전: {activeStep.beginnerTip}</p> : null}
            {activeStep.rescueTip ? <p className="rounded-[12px] bg-[#eef4ff] px-3 py-2 text-[#2f6fec]">망했어요: {activeStep.rescueTip}</p> : null}
          </div>
          <div className="mt-4 grid grid-cols-[0.8fr_1.2fr_0.8fr] gap-2">
            <button type="button" data-testid="cook-previous-step" onClick={() => selectStep(activeStepIndex - 1)} disabled={activeStepIndex === 0} className="flex min-h-12 items-center justify-center gap-1 rounded-[14px] border border-[#eadcc9] text-[12px] font-black text-[#7d6d5f] disabled:opacity-40"><ChevronLeft size={15} /> 이전</button>
            <button type="button" data-testid="cook-complete-step" onClick={() => toggleStep(activeStep.index)} className={`flex min-h-12 items-center justify-center gap-2 rounded-[14px] text-[13px] font-black text-white ${checkedSteps.has(activeStep.index) ? 'bg-[#3d7b38]' : 'bg-[#2f2117]'}`}><Check size={15} /> {checkedSteps.has(activeStep.index) ? '완료됨' : '완료 체크'}</button>
            <button type="button" data-testid="cook-next-step" onClick={() => selectStep(activeStepIndex + 1)} disabled={activeStepIndex >= steps.length - 1} className="flex min-h-12 items-center justify-center gap-1 rounded-[14px] bg-[#ea5a1f] text-[12px] font-black text-white disabled:opacity-40">다음 <ChevronRight size={15} /></button>
          </div>
          {activeTimerSeconds ? (
            <button type="button" data-testid="cook-timer-toggle" onClick={() => toggleTimer(activeStep)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1 rounded-[13px] bg-[#fff0e4] px-3 text-[13px] font-black text-[#d94d19]">
              {activeTimer?.stepIndex === activeStep.index && timerRunning ? <Pause size={14} /> : activeTimer?.stepIndex === activeStep.index && timerPaused ? <Play size={14} /> : <Timer size={14} />}
              {activeTimer?.stepIndex === activeStep.index
                ? remainingSeconds === 0
                  ? '타이머 다시 시작'
                  : timerPaused
                    ? `${formatRemainingTime(remainingSeconds)} 계속`
                    : `${formatRemainingTime(remainingSeconds)} 일시정지`
                : `${formatDurationLabel(activeTimerSeconds)} 타이머`}
            </button>
          ) : null}
          {activeTimers.length > 1 ? (
            <div className="mt-3 rounded-[13px] border border-[#eadcc9] bg-white px-3 py-3" aria-label="실행 중인 타이머">
              <p className="text-[11px] font-black text-[#8f7f70]">동시 타이머 {activeTimers.length}개</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeTimers.map((timer) => {
                  const timerSeconds = remainingTimerSeconds(timer, now)
                  return (
                    <button
                      key={timer.stepIndex}
                      type="button"
                      onClick={() => selectStep(steps.findIndex((step) => step.index === timer.stepIndex))}
                      className={`min-h-11 rounded-full px-3 text-[12px] font-black ${timer.stepIndex === activeStep.index ? 'bg-[#2f2117] text-white' : 'bg-[#fff0e4] text-[#d94d19]'}`}
                    >
                      {timer.stepIndex}단계 {timerSeconds === 0 ? '완료' : formatRemainingTime(timerSeconds)}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          <p className="sr-only" aria-live="assertive">{timerAnnouncement}</p>
        </div> : null}

        {hasStarted && showAllSteps ? (
          <div className="mt-3 space-y-2">
            {steps.map((step) => (
              <button key={step.index} type="button" onClick={() => { selectStep(steps.findIndex((candidate) => candidate.index === step.index)); setShowAllSteps(false) }} className="flex min-h-12 w-full items-start gap-3 rounded-[13px] bg-[#fffaf3] px-3 py-3 text-left">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${checkedSteps.has(step.index) ? 'border-[#3d7b38] bg-[#3d7b38] text-white' : 'border-[#c9b7a4] text-[#8f7f70]'}`}>{checkedSteps.has(step.index) ? <Check size={13} /> : step.index}</span>
                <span className="text-sm font-semibold leading-6 text-[#4b3929]">{step.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {hasStarted && allComplete ? (
          <div className="mt-4 rounded-[16px] border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
            <h3 className="text-[18px] font-black text-[#315f2d]">조리 완료</h3>
            <p className="mt-1 text-[13px] font-semibold leading-6 text-[#557b4f]">진행 기록은 이 기기에 저장되어 앱에 다시 돌아와도 유지됩니다.</p>
            <div className="mt-3 grid grid-cols-3 gap-2" aria-label="조리 난이도 피드백">
              {([['easy', '쉬웠어요'], ['okay', '괜찮아요'], ['hard', '어려웠어요']] as const).map(([value, label]) => (
                <button key={value} type="button" data-testid={`cook-feedback-${value}`} onClick={() => setFeedback(value)} aria-pressed={feedback === value} className={`min-h-11 rounded-xl px-2 text-[12px] font-black ${feedback === value ? 'bg-[#315f2d] text-white' : 'bg-white text-[#557b4f]'}`}>{label}</button>
              ))}
            </div>
            {completedAt ? (
              <RecipeCookingSessionForm
                recipeId={recipeId}
                clientSessionId={clientSessionId}
                startedAt={startedAt}
                completedAt={completedAt}
                difficulty={feedback}
              />
            ) : null}
          </div>
        ) : null}

        {hasStarted ? <button type="button" data-testid="cook-reset" onClick={resetProgress} className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[12px] font-black text-[#8f7f70]"><RotateCcw size={14} /> {allComplete ? '다시 만들기' : '진행 초기화'}</button> : null}
      </div>
    </section>
  )
}
