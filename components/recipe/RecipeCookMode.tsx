'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChefHat, ChevronLeft, ChevronRight, List, RotateCcw, Timer } from 'lucide-react'

import {
  createRecipeCookTimer,
  normalizeRecipeCookProgress,
  recipeCookProgressKey,
  remainingTimerSeconds,
  type RecipeCookFeedback,
  type RecipeCookTimer,
} from '@/lib/recipe-cook-progress'
import type { RecipeDetailStep } from '@/types'

type RecipeCookModeProps = {
  recipeId: string
  recipeName: string
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

export default function RecipeCookMode({ recipeId, recipeName, steps }: RecipeCookModeProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())
  const [activeTimer, setActiveTimer] = useState<RecipeCookTimer | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [feedback, setFeedback] = useState<RecipeCookFeedback | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [hydrated, setHydrated] = useState(false)
  const [timerAnnouncement, setTimerAnnouncement] = useState('')
  const signaledTimerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const storageKey = recipeCookProgressKey(recipeId)
  const stepIndexes = useMemo(() => steps.map((step) => step.index), [steps])
  const remainingSeconds = remainingTimerSeconds(activeTimer, now)
  const timerRunning = Boolean(activeTimer && remainingSeconds > 0)
  const allComplete = steps.length > 0 && checkedSteps.size === steps.length
  const progress = steps.length === 0 ? 0 : Math.round((checkedSteps.size / steps.length) * 100)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      const saved = raw ? normalizeRecipeCookProgress(JSON.parse(raw), stepIndexes) : null
      if (saved) {
        setCheckedSteps(new Set(saved.checkedStepIndexes))
        setActiveStepIndex(saved.activeStepIndex)
        setActiveTimer(saved.timer)
        if (saved.timer && remainingTimerSeconds(saved.timer) === 0) {
          signaledTimerRef.current = saved.timer.endsAt
        }
        setCompletedAt(saved.completedAt)
        setFeedback(saved.feedback)
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
        version: 1,
        activeStepIndex,
        checkedStepIndexes: [...checkedSteps].sort((left, right) => left - right),
        timer: activeTimer,
        completedAt,
        feedback,
        updatedAt: new Date().toISOString(),
      }))
    } catch {
      return
    }
  }, [activeStepIndex, activeTimer, checkedSteps, completedAt, feedback, hydrated, storageKey])

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
      setFeedback(null)
    }
  }, [allComplete, completedAt])

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
    setTimerAnnouncement('')
    setNow(Date.now())
    setActiveTimer(timer)
  }
  const resetProgress = () => {
    setCheckedSteps(new Set())
    setActiveStepIndex(0)
    setActiveTimer(null)
    setTimerAnnouncement('')
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
              <p className="mt-1 truncate text-[12px] font-semibold text-[#8f7f70]">{recipeName}</p>
            </div>
          </div>
          <span className="rounded-full bg-[#fff0e4] px-3 py-1 text-[11px] font-black text-[#d94d19]">{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1e4d7]" role="progressbar" aria-label="조리 진행률" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-[#ea5a1f]" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 rounded-[16px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-4">
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
            <button type="button" onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))} disabled={activeStepIndex === 0} className="flex min-h-12 items-center justify-center gap-1 rounded-[14px] border border-[#eadcc9] text-[12px] font-black text-[#7d6d5f] disabled:opacity-40"><ChevronLeft size={15} /> 이전</button>
            <button type="button" onClick={() => toggleStep(activeStep.index)} className={`flex min-h-12 items-center justify-center gap-2 rounded-[14px] text-[13px] font-black text-white ${checkedSteps.has(activeStep.index) ? 'bg-[#3d7b38]' : 'bg-[#2f2117]'}`}><Check size={15} /> {checkedSteps.has(activeStep.index) ? '완료됨' : '완료 체크'}</button>
            <button type="button" onClick={() => setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))} disabled={activeStepIndex >= steps.length - 1} className="flex min-h-12 items-center justify-center gap-1 rounded-[14px] bg-[#ea5a1f] text-[12px] font-black text-white disabled:opacity-40">다음 <ChevronRight size={15} /></button>
          </div>
          {activeTimerSeconds ? (
            <button type="button" onClick={() => startTimer(activeStep)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1 rounded-[13px] bg-[#fff0e4] px-3 text-[13px] font-black text-[#d94d19]">
              <Timer size={14} />
              {activeTimer?.stepIndex === activeStep.index ? (remainingSeconds === 0 ? '타이머 완료' : formatRemainingTime(remainingSeconds)) : `${formatDurationLabel(activeTimerSeconds)} 타이머`}
            </button>
          ) : null}
          <p className="sr-only" aria-live="assertive">{timerAnnouncement}</p>
        </div>

        {showAllSteps ? (
          <div className="mt-3 space-y-2">
            {steps.map((step) => (
              <button key={step.index} type="button" onClick={() => { setActiveStepIndex(steps.findIndex((candidate) => candidate.index === step.index)); setShowAllSteps(false) }} className="flex min-h-12 w-full items-start gap-3 rounded-[13px] bg-[#fffaf3] px-3 py-3 text-left">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${checkedSteps.has(step.index) ? 'border-[#3d7b38] bg-[#3d7b38] text-white' : 'border-[#c9b7a4] text-[#8f7f70]'}`}>{checkedSteps.has(step.index) ? <Check size={13} /> : step.index}</span>
                <span className="text-sm font-semibold leading-6 text-[#4b3929]">{step.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {allComplete ? (
          <div className="mt-4 rounded-[16px] border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
            <h3 className="text-[18px] font-black text-[#315f2d]">조리 완료</h3>
            <p className="mt-1 text-[13px] font-semibold leading-6 text-[#557b4f]">진행 기록은 이 기기에 저장되어 앱에 다시 돌아와도 유지됩니다.</p>
            <div className="mt-3 grid grid-cols-3 gap-2" aria-label="조리 난이도 피드백">
              {([['easy', '쉬웠어요'], ['okay', '괜찮아요'], ['hard', '어려웠어요']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFeedback(value)} aria-pressed={feedback === value} className={`min-h-11 rounded-xl px-2 text-[12px] font-black ${feedback === value ? 'bg-[#315f2d] text-white' : 'bg-white text-[#557b4f]'}`}>{label}</button>
              ))}
            </div>
          </div>
        ) : null}

        <button type="button" onClick={resetProgress} className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[12px] font-black text-[#8f7f70]"><RotateCcw size={14} /> 진행 초기화</button>
      </div>
    </section>
  )
}
