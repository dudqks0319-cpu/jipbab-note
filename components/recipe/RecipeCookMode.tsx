'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  released?: boolean
  release: () => Promise<void>
  addEventListener?: (
    type: 'release',
    listener: () => void,
    options?: { once?: boolean },
  ) => void
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
}

type WakeLockStatus = 'off' | 'requesting' | 'active' | 'waiting' | 'released' | 'unsupported' | 'failed'

const WAKE_LOCK_STATUS_COPY: Record<WakeLockStatus, string> = {
  off: '기본은 꺼짐이에요. 배터리를 더 사용할 수 있으니 조리 중 필요할 때만 직접 켜세요.',
  requesting: '이 기기에 화면 유지를 요청하고 있어요.',
  active: '화면 유지 중이에요. 다른 앱으로 이동하면 잠시 해제되며, 돌아오면 다시 요청합니다.',
  waiting: '앱을 벗어나 화면 유지가 잠시 해제됐어요. 돌아오면 다시 요청합니다.',
  released: '기기 설정이나 절전 모드로 화면 유지가 해제됐어요. 필요하면 다시 시도하세요.',
  unsupported: '이 기기에서는 자동 화면 유지가 지원되지 않아요. 조리 중 화면을 직접 켜 주세요.',
  failed: '화면 유지를 켜지 못했어요. 절전 모드·브라우저 설정을 확인하거나 화면을 직접 켜 주세요.',
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
  const [wakeLockStatus, setWakeLockStatus] = useState<WakeLockStatus>('off')
  const signaledTimerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const wakeLockConsentRef = useRef(false)
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null)
  const wakeLockRequestIdRef = useRef(0)
  const storageKey = recipeCookProgressKey(recipeId, servings)
  const legacyStorageKey = recipeCookProgressKey(recipeId)
  const stepIndexes = useMemo(() => steps.map((step) => step.index), [steps])
  const remainingSeconds = remainingTimerSeconds(activeTimer, now)
  const timerRunning = Boolean(activeTimer && remainingSeconds > 0)
  const allComplete = steps.length > 0 && checkedSteps.size === steps.length
  const progress = steps.length === 0 ? 0 : Math.round((checkedSteps.size / steps.length) * 100)
  const activeStep = steps[Math.min(activeStepIndex, steps.length - 1)] ?? null
  const activeTimerStepPosition = activeTimer
    ? steps.findIndex((step) => step.index === activeTimer.stepIndex)
    : -1
  const activeTimerStep = activeTimerStepPosition >= 0 ? steps[activeTimerStepPosition] : null
  const activeStepIngredients = useMemo(
    () => activeStep ? resolveRecipeCookStepIngredients(activeStep, ingredientDetails) : [],
    [activeStep, ingredientDetails],
  )
  const wakeLockSelected = wakeLockStatus === 'requesting'
    || wakeLockStatus === 'active'
    || wakeLockStatus === 'waiting'

  const releaseScreenWakeLock = useCallback(() => {
    wakeLockConsentRef.current = false
    wakeLockRequestIdRef.current += 1
    const sentinel = wakeLockSentinelRef.current
    wakeLockSentinelRef.current = null
    setWakeLockStatus('off')
    if (sentinel && !sentinel.released) void sentinel.release().catch(() => undefined)
  }, [])

  const requestScreenWakeLock = useCallback(async () => {
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock
    if (!wakeLock) {
      wakeLockConsentRef.current = false
      setWakeLockStatus('unsupported')
      return
    }
    if (document.visibilityState !== 'visible') {
      setWakeLockStatus('waiting')
      return
    }

    const requestId = wakeLockRequestIdRef.current + 1
    wakeLockRequestIdRef.current = requestId
    setWakeLockStatus('requesting')
    try {
      const sentinel = await wakeLock.request('screen')
      if (requestId !== wakeLockRequestIdRef.current || !wakeLockConsentRef.current) {
        if (!sentinel.released) void sentinel.release().catch(() => undefined)
        return
      }
      wakeLockSentinelRef.current = sentinel
      sentinel.addEventListener?.('release', () => {
        if (wakeLockSentinelRef.current !== sentinel) return
        wakeLockSentinelRef.current = null
        if (!wakeLockConsentRef.current) return
        setWakeLockStatus(document.visibilityState === 'visible' ? 'released' : 'waiting')
      }, { once: true })
      setWakeLockStatus('active')
    } catch {
      if (requestId !== wakeLockRequestIdRef.current) return
      wakeLockConsentRef.current = false
      wakeLockSentinelRef.current = null
      setWakeLockStatus('failed')
    }
  }, [])

  const enableScreenWakeLock = () => {
    wakeLockConsentRef.current = true
    void requestScreenWakeLock()
  }

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
          setTimerAnnouncement(`${saved.timer.stepIndex}단계 타이머가 이미 끝났습니다.`)
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
    wakeLockConsentRef.current = false
    wakeLockRequestIdRef.current += 1
    const sentinel = wakeLockSentinelRef.current
    wakeLockSentinelRef.current = null
    if (sentinel && !sentinel.released) void sentinel.release().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!(navigator as NavigatorWithWakeLock).wakeLock) setWakeLockStatus('unsupported')
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!wakeLockConsentRef.current) return
      if (document.visibilityState !== 'visible') {
        setWakeLockStatus('waiting')
        return
      }
      const sentinel = wakeLockSentinelRef.current
      if (sentinel && !sentinel.released) {
        setWakeLockStatus('active')
        return
      }
      wakeLockSentinelRef.current = null
      void requestScreenWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [requestScreenWakeLock])

  useEffect(() => {
    if (allComplete && !completedAt) setCompletedAt(new Date().toISOString())
    if (!allComplete && completedAt) {
      setCompletedAt(null)
    }
  }, [allComplete, completedAt])

  useEffect(() => {
    if (allComplete && wakeLockConsentRef.current) releaseScreenWakeLock()
  }, [allComplete, releaseScreenWakeLock])

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
    if (activeTimer && timerRunning) return
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
  const dismissTimer = () => {
    const announcement = remainingSeconds > 0
      ? `${activeTimer?.stepIndex ?? ''}단계 타이머를 취소했습니다.`
      : '완료한 타이머를 닫았습니다.'
    setActiveTimer(null)
    signaledTimerRef.current = null
    setTimerAnnouncement(announcement)
  }
  const resetProgress = () => {
    releaseScreenWakeLock()
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

        <section className="mt-4 rounded-[16px] border border-[#e6d7c8] bg-[#fffdf9] px-4 py-4" aria-labelledby="screen-wake-lock-title">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p id="screen-wake-lock-title" className="text-[13px] font-black text-[#3f3025]">조리 중 화면 유지</p>
              <p id="screen-wake-lock-status" aria-live="polite" className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#74675b]">
                {WAKE_LOCK_STATUS_COPY[wakeLockStatus]}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${wakeLockStatus === 'active' ? 'bg-[#e7f6df] text-[#315f2d]' : wakeLockStatus === 'failed' || wakeLockStatus === 'released' ? 'bg-[#fff0e4] text-[#b75022]' : 'bg-[#f1ece6] text-[#74675b]'}`}>
              {wakeLockStatus === 'active'
                ? '켜짐'
                : wakeLockStatus === 'requesting'
                  ? '요청 중'
                  : wakeLockStatus === 'waiting'
                    ? '복귀 대기'
                    : wakeLockStatus === 'unsupported'
                      ? '미지원'
                      : wakeLockStatus === 'failed' || wakeLockStatus === 'released'
                        ? '확인 필요'
                        : '꺼짐'}
            </span>
          </div>
          <p className="mt-2 break-keep text-[11px] font-semibold leading-5 text-[#8f7f70]">
            켜기를 누르면 조리 중 화면 유지에 동의합니다. 페이지를 나가거나 조리를 완료하면 자동으로 종료합니다.
          </p>
          <button
            type="button"
            onClick={wakeLockSelected ? releaseScreenWakeLock : enableScreenWakeLock}
            disabled={wakeLockStatus === 'requesting' || wakeLockStatus === 'unsupported'}
            aria-pressed={wakeLockSelected}
            aria-describedby="screen-wake-lock-status"
            style={{ minHeight: 52 }}
            className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-[13px] border border-[#dec9b7] bg-white px-4 text-[13px] font-black text-[#6f4b2e] disabled:cursor-not-allowed disabled:bg-[#eee9e3] disabled:text-[#8f7f70]"
          >
            {wakeLockStatus === 'active' || wakeLockStatus === 'waiting'
              ? '화면 꺼짐 방지 끄기'
              : wakeLockStatus === 'requesting'
                ? '화면 유지 요청 중'
                : wakeLockStatus === 'released' || wakeLockStatus === 'failed'
                  ? '화면 유지 다시 시도'
                  : wakeLockStatus === 'unsupported'
                    ? '이 기기에서는 지원하지 않음'
                    : '화면 꺼짐 방지 켜기'}
          </button>
        </section>

        {activeTimer && activeTimerStep ? (
          <section
            className={`mt-4 rounded-[16px] border px-4 py-4 ${timerRunning ? 'border-[#efc6a7] bg-[#fff4e9]' : 'border-[#bcd8ad] bg-[#f2faed]'}`}
            aria-labelledby="active-cook-timer-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id="active-cook-timer-title" className={`text-[12px] font-black ${timerRunning ? 'text-[#b75022]' : 'text-[#315f2d]'}`}>
                  {timerRunning ? '실행 중 타이머' : '타이머 완료'} · {activeTimer.stepIndex}단계
                </p>
                <p className="mt-1 break-keep text-[13px] font-bold leading-5 text-[#5d4b3d]">
                  {activeTimerStep.title || `${activeTimer.stepIndex}단계`}
                </p>
              </div>
              <span className={`rounded-full bg-white px-3 py-1 text-[11px] font-black ${timerRunning ? 'text-[#b75022]' : 'text-[#315f2d]'}`}>
                {formatDurationLabel(activeTimer.durationSeconds)} 설정
              </span>
            </div>
            <p
              role="timer"
              aria-label={`${activeTimer.stepIndex}단계 타이머 ${remainingSeconds === 0 ? '완료' : `${formatRemainingTime(remainingSeconds)} 남음`}`}
              className={`mt-3 font-mono text-[40px] font-black tabular-nums leading-none ${timerRunning ? 'text-[#d94d19]' : 'text-[#315f2d]'}`}
            >
              {remainingSeconds === 0 ? '완료' : formatRemainingTime(remainingSeconds)}
            </p>
            <p className="mt-3 break-keep text-[12px] font-semibold leading-5 text-[#7d6d5f]">
              {timerRunning
                ? '다른 단계로 이동해도 계속 계산해요. 앱을 나갔다 돌아오면 저장된 종료 시각으로 남은 시간을 복원합니다.'
                : '소리·진동과 함께 완료 상태를 표시했어요. 알림 권한이 없어도 이 화면에서 확인할 수 있습니다.'}
            </p>
            <p className="mt-1 break-keep text-[11px] font-semibold leading-5 text-[#8f7f70]">
              한 번에 하나만 실행됩니다. 다른 단계 타이머는 현재 타이머를 취소한 뒤 시작하세요.
            </p>
            <div className={`mt-3 grid gap-2 ${activeTimerStepPosition !== activeStepIndex ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {activeTimerStepPosition !== activeStepIndex ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveStepIndex(activeTimerStepPosition)
                    setShowAllSteps(false)
                  }}
                  style={{ minHeight: 52 }}
                  className="flex min-h-[52px] items-center justify-center rounded-[13px] bg-white px-3 text-[13px] font-black text-[#6f4b2e]"
                >
                  {activeTimer.stepIndex}단계로 이동
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismissTimer}
                style={{ minHeight: 52 }}
                className="flex min-h-[52px] items-center justify-center rounded-[13px] border border-[#e4cbb8] bg-white px-3 text-[13px] font-black text-[#7d5a45]"
              >
                {timerRunning ? '타이머 취소' : '완료 알림 닫기'}
              </button>
            </div>
          </section>
        ) : null}

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
            activeTimer?.stepIndex === activeStep.index && timerRunning ? (
              <p className="mt-4 rounded-[13px] bg-[#fff0e4] px-3 py-3 text-center text-[13px] font-black text-[#d94d19]">
                이 단계 타이머가 위에서 실행 중이에요.
              </p>
            ) : activeTimer && timerRunning ? (
              <button type="button" disabled style={{ minHeight: 52 }} className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#eee9e3] px-3 text-[13px] font-black text-[#8f7f70]">
                <Timer size={14} /> {activeTimer.stepIndex}단계 타이머 실행 중 · 취소 후 시작
              </button>
            ) : (
              <button type="button" onClick={() => startTimer(activeStep)} style={{ minHeight: 52 }} className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#fff0e4] px-3 text-[14px] font-black text-[#d94d19]">
                <Timer size={14} />
                {activeTimer?.stepIndex === activeStep.index ? `${formatDurationLabel(activeTimerSeconds)} 타이머 다시 시작` : `${formatDurationLabel(activeTimerSeconds)} 타이머 시작`}
              </button>
            )
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
