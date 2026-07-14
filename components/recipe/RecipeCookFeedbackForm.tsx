'use client'

import { useState } from 'react'

import { submitRecipeFeedbackV1 } from '@/lib/recipe-api-v1-client'
import type { RecipeCookFeedback } from '@/lib/recipe-cook-progress'
import {
  calculateRecipeCookDurationSeconds,
  RECIPE_FEEDBACK_FAILURE_REASONS,
  RECIPE_FEEDBACK_REPEAT_INTENTS,
  RECIPE_FEEDBACK_TASTE_RESULTS,
  type RecipeFeedbackCompletionStatus,
  type RecipeFeedbackFailureReason,
  type RecipeFeedbackRepeatIntent,
  type RecipeFeedbackTasteResult,
} from '@/lib/recipe-feedback'
import { getSupabaseClient } from '@/lib/supabase'
import { ensureSignedSupabaseUser } from '@/lib/supabase-session'
import type { RecipeDetailStep } from '@/types'

type FeedbackSubmitState = 'idle' | 'saving' | 'synced' | 'local-only'

type RecipeCookFeedbackFormProps = {
  recipeId: string
  recipeVersion: number
  steps: RecipeDetailStep[]
  startedAt: string | null
  completedAt: string | null
  suggestedFailedStepOrder: number | null
  initialFeedback: RecipeCookFeedback | null
  onFeedbackChange: (feedback: RecipeCookFeedback) => void
}

const COMPLETION_CHOICES: ReadonlyArray<{
  value: RecipeFeedbackCompletionStatus
  label: string
}> = [
  { value: 'completed_independently', label: '네, 잘 완성했어요.' },
  { value: 'completed_with_difficulty', label: '완성했지만 어려웠어요.' },
  { value: 'failed', label: '중간에 실패했어요.' },
]

function matchingFeedback(
  feedback: RecipeCookFeedback | null,
  completionStatus: RecipeFeedbackCompletionStatus,
  difficultStepOrder: number | null,
  failedStepOrder: number | null,
  reasonCode: RecipeFeedbackFailureReason | null,
  tasteResult: RecipeFeedbackTasteResult | null,
  repeatIntent: RecipeFeedbackRepeatIntent | null,
): RecipeCookFeedback | null {
  if (
    feedback?.completionStatus !== completionStatus
    || feedback.difficultStepOrder !== difficultStepOrder
    || feedback.failedStepOrder !== failedStepOrder
    || feedback.reasonCode !== reasonCode
    || feedback.tasteResult !== tasteResult
    || feedback.repeatIntent !== repeatIntent
  ) {
    return null
  }
  return feedback
}

export default function RecipeCookFeedbackForm({
  recipeId,
  recipeVersion,
  steps,
  startedAt,
  completedAt,
  suggestedFailedStepOrder,
  initialFeedback,
  onFeedbackChange,
}: RecipeCookFeedbackFormProps) {
  const [completionStatus, setCompletionStatus] = useState<RecipeFeedbackCompletionStatus | null>(
    initialFeedback?.completionStatus ?? (suggestedFailedStepOrder ? 'failed' : null),
  )
  const [difficultStepOrder, setDifficultStepOrder] = useState<number | null>(
    initialFeedback?.difficultStepOrder ?? null,
  )
  const [failedStepOrder, setFailedStepOrder] = useState<number | null>(
    initialFeedback?.failedStepOrder ?? suggestedFailedStepOrder,
  )
  const [reasonCode, setReasonCode] = useState<RecipeFeedbackFailureReason | null>(
    initialFeedback?.reasonCode ?? null,
  )
  const [tasteResult, setTasteResult] = useState<RecipeFeedbackTasteResult | null>(
    initialFeedback?.tasteResult ?? null,
  )
  const [repeatIntent, setRepeatIntent] = useState<RecipeFeedbackRepeatIntent | null>(
    initialFeedback?.repeatIntent ?? null,
  )
  const [submitState, setSubmitState] = useState<FeedbackSubmitState>(
    initialFeedback?.syncedAt ? 'synced' : initialFeedback ? 'local-only' : 'idle',
  )

  const selectCompletionStatus = (value: RecipeFeedbackCompletionStatus) => {
    setCompletionStatus(value)
    setSubmitState('idle')
    if (value === 'failed') {
      setDifficultStepOrder(null)
      setTasteResult(null)
      setRepeatIntent(null)
      if (!failedStepOrder) {
        setFailedStepOrder(suggestedFailedStepOrder ?? steps[0]?.index ?? null)
      }
    } else {
      setFailedStepOrder(null)
      setReasonCode(null)
      if (value === 'completed_independently') setDifficultStepOrder(null)
    }
  }

  const submitFeedback = async () => {
    if (!completionStatus || (completionStatus === 'failed' && !failedStepOrder)) return

    const submittedAt = new Date().toISOString()
    const saved = matchingFeedback(
      initialFeedback,
      completionStatus,
      completionStatus === 'completed_with_difficulty' ? difficultStepOrder : null,
      completionStatus === 'failed' ? failedStepOrder : null,
      completionStatus === 'failed' ? reasonCode : null,
      completionStatus === 'failed' ? null : tasteResult,
      completionStatus === 'failed' ? null : repeatIntent,
    )
    const localFeedback: RecipeCookFeedback = saved ?? {
      clientSubmissionId: crypto.randomUUID(),
      completionStatus,
      difficultStepOrder: completionStatus === 'completed_with_difficulty' ? difficultStepOrder : null,
      failedStepOrder: completionStatus === 'failed' ? failedStepOrder : null,
      reasonCode: completionStatus === 'failed' ? reasonCode : null,
      tasteResult: completionStatus === 'failed' ? null : tasteResult,
      repeatIntent: completionStatus === 'failed' ? null : repeatIntent,
      actualDurationSeconds: calculateRecipeCookDurationSeconds(
        startedAt,
        completionStatus === 'failed' ? submittedAt : completedAt ?? submittedAt,
      ),
      submittedAt,
      syncedAt: null,
    }

    onFeedbackChange(localFeedback)
    setSubmitState('saving')

    try {
      const client = getSupabaseClient()
      const user = await ensureSignedSupabaseUser(client)
      if (!user) {
        setSubmitState('local-only')
        return
      }
      const { data, error } = await client.auth.getSession()
      const accessToken = data.session?.access_token
      if (error || !accessToken) {
        setSubmitState('local-only')
        return
      }

      await submitRecipeFeedbackV1({
        clientSubmissionId: localFeedback.clientSubmissionId,
        recipeId,
        recipeVersion,
        completionStatus: localFeedback.completionStatus,
        difficultStepOrder: localFeedback.difficultStepOrder,
        failedStepOrder: localFeedback.failedStepOrder,
        reasonCode: localFeedback.reasonCode,
        tasteResult: localFeedback.tasteResult,
        repeatIntent: localFeedback.repeatIntent,
        actualDurationSeconds: localFeedback.actualDurationSeconds,
      }, accessToken)

      onFeedbackChange({ ...localFeedback, syncedAt: new Date().toISOString() })
      setSubmitState('synced')
    } catch {
      setSubmitState('local-only')
    }
  }

  const canSubmit = Boolean(
    completionStatus
    && (completionStatus !== 'failed' || failedStepOrder)
    && submitState !== 'saving'
    && submitState !== 'synced',
  )

  return (
    <div className="mt-4 rounded-[16px] border border-[#dcebd2] bg-[#f4fbef] px-4 py-4">
      <h3 className="text-[18px] font-black text-[#315f2d]">
        {completionStatus === 'failed' ? '조리를 여기서 멈췄어요' : '요리를 완성했어요'}
      </h3>
      <p className="mt-1 text-[13px] font-semibold leading-6 text-[#557b4f]">
        혼자서 완성할 수 있었나요?
      </p>
      <div className="mt-3 grid gap-2" aria-label="조리 완성 상태">
        {COMPLETION_CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            onClick={() => selectCompletionStatus(choice.value)}
            aria-pressed={completionStatus === choice.value}
            className={`min-h-12 rounded-xl px-3 text-left text-[13px] font-black ${
              completionStatus === choice.value
                ? 'bg-[#315f2d] text-white'
                : 'bg-white text-[#557b4f]'
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>

      {completionStatus === 'failed' ? (
        <div className="mt-4 border-t border-[#d7e7cf] pt-4">
          <p className="text-[13px] font-black text-[#315f2d]">어느 단계에서 멈췄나요?</p>
          <div className="mt-2 grid grid-cols-2 gap-2" aria-label="실패 단계">
            {steps.map((step) => (
              <button
                key={step.index}
                type="button"
                onClick={() => {
                  setFailedStepOrder(step.index)
                  setSubmitState('idle')
                }}
                aria-pressed={failedStepOrder === step.index}
                className={`min-h-11 rounded-xl px-3 text-left text-[12px] font-black ${
                  failedStepOrder === step.index
                    ? 'bg-[#74452f] text-white'
                    : 'bg-white text-[#74452f]'
                }`}
              >
                {step.index}단계{step.title ? ` · ${step.title}` : ''}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[13px] font-black text-[#315f2d]">어떤 점이 어려웠나요? (선택)</p>
          <div className="mt-2 grid grid-cols-2 gap-2" aria-label="어려웠던 이유">
            {RECIPE_FEEDBACK_FAILURE_REASONS.map((reason) => (
              <button
                key={reason.code}
                type="button"
                onClick={() => {
                  setReasonCode((current) => current === reason.code ? null : reason.code)
                  setSubmitState('idle')
                }}
                aria-pressed={reasonCode === reason.code}
                className={`min-h-11 rounded-xl px-3 text-left text-[12px] font-black ${
                  reasonCode === reason.code
                    ? 'bg-[#74452f] text-white'
                    : 'bg-white text-[#74452f]'
                }`}
              >
                {reason.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {completionStatus === 'completed_with_difficulty' ? (
        <div className="mt-4 border-t border-[#d7e7cf] pt-4">
          <p className="text-[13px] font-black text-[#315f2d]">어느 단계가 가장 어려웠나요? (선택)</p>
          <div className="mt-2 grid grid-cols-2 gap-2" aria-label="어려웠던 단계">
            {steps.map((step) => (
              <button
                key={step.index}
                type="button"
                onClick={() => {
                  setDifficultStepOrder((current) => current === step.index ? null : step.index)
                  setSubmitState('idle')
                }}
                aria-pressed={difficultStepOrder === step.index}
                className={`min-h-11 rounded-xl px-3 text-left text-[12px] font-black ${
                  difficultStepOrder === step.index
                    ? 'bg-[#74452f] text-white'
                    : 'bg-white text-[#74452f]'
                }`}
              >
                {step.index}단계{step.title ? ` · ${step.title}` : ''}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {completionStatus && completionStatus !== 'failed' ? (
        <div className="mt-4 space-y-4 border-t border-[#d7e7cf] pt-4">
          <div>
            <p className="text-[13px] font-black text-[#315f2d]">맛은 어땠나요? (선택)</p>
            <div className="mt-2 grid gap-2" aria-label="맛 결과">
              {RECIPE_FEEDBACK_TASTE_RESULTS.map((result) => (
                <button
                  key={result.code}
                  type="button"
                  onClick={() => {
                    setTasteResult((current) => current === result.code ? null : result.code)
                    setSubmitState('idle')
                  }}
                  aria-pressed={tasteResult === result.code}
                  className={`min-h-11 rounded-xl px-3 text-left text-[12px] font-black ${
                    tasteResult === result.code
                      ? 'bg-[#315f2d] text-white'
                      : 'bg-white text-[#557b4f]'
                  }`}
                >
                  {result.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-black text-[#315f2d]">다시 만들고 싶나요? (선택)</p>
            <div className="mt-2 grid gap-2" aria-label="다시 만들 의향">
              {RECIPE_FEEDBACK_REPEAT_INTENTS.map((intent) => (
                <button
                  key={intent.code}
                  type="button"
                  onClick={() => {
                    setRepeatIntent((current) => current === intent.code ? null : intent.code)
                    setSubmitState('idle')
                  }}
                  aria-pressed={repeatIntent === intent.code}
                  className={`min-h-11 rounded-xl px-3 text-left text-[12px] font-black ${
                    repeatIntent === intent.code
                      ? 'bg-[#315f2d] text-white'
                      : 'bg-white text-[#557b4f]'
                  }`}
                >
                  {intent.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-4 rounded-xl bg-white px-3 py-3 text-[12px] font-semibold leading-5 text-[#667d61]">
        이름·이메일·자유 입력은 받지 않습니다. 선택한 완성 결과와 단계만 개선에 사용합니다.
      </p>
      <button
        type="button"
        onClick={() => void submitFeedback()}
        disabled={!canSubmit}
        className="mt-3 min-h-12 w-full rounded-xl bg-[#315f2d] px-4 text-[14px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitState === 'saving' ? '저장 중…' : submitState === 'synced' ? '피드백 전송 완료' : '피드백 저장'}
      </button>
      <p className="mt-2 min-h-5 text-[12px] font-semibold leading-5 text-[#667d61]" aria-live="polite">
        {submitState === 'synced'
          ? '서명된 세션으로 안전하게 전송했습니다.'
          : submitState === 'local-only'
            ? '이 기기에 저장했습니다. 서버 연결 후 같은 내용으로 다시 시도할 수 있어요.'
            : ''}
      </p>
    </div>
  )
}
