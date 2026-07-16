// 이 파일은 완료된 조리 경험을 로그인 사용자의 비공개 기록으로 명시적으로 저장합니다.
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CheckCircle2, Save } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import {
  COOKING_OUTCOMES,
  COOKING_REMAKE_INTENTS,
  COOKING_TASTES,
  type CookingDifficulty,
  type CookingOutcome,
  type CookingRemakeIntent,
  type CookingTaste,
} from '@/lib/recipe-cooking-session'
import { getSupabaseClient } from '@/lib/supabase'

type RecipeCookingSessionFormProps = {
  recipeId: string
  clientSessionId: string | null
  startedAt: string | null
  completedAt: string
  difficulty: CookingDifficulty | null
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getSession()
  return data.session?.access_token ?? null
}

export default function RecipeCookingSessionForm({
  recipeId,
  clientSessionId,
  startedAt,
  completedAt,
  difficulty,
}: RecipeCookingSessionFormProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [outcome, setOutcome] = useState<CookingOutcome>('success')
  const [taste, setTaste] = useState<CookingTaste>('not_rated')
  const [remakeIntent, setRemakeIntent] = useState<CookingRemakeIntent>('yes')
  const [substituteNotes, setSubstituteNotes] = useState('')
  const [familyReaction, setFamilyReaction] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const actualDurationMinutes = useMemo(() => {
    if (!startedAt) return null
    const duration = Date.parse(completedAt) - Date.parse(startedAt)
    if (!Number.isFinite(duration) || duration < 0) return null
    return Math.max(1, Math.min(1440, Math.ceil(duration / 60_000)))
  }, [completedAt, startedAt])
  const canSave = Boolean(clientSessionId && startedAt && actualDurationMinutes && difficulty)

  const saveSession = async () => {
    if (!canSave || !clientSessionId || !startedAt || !actualDurationMinutes || !difficulty) {
      setMessage('이번 조리는 시작 시각이 없어 기기 기록으로만 유지됩니다. 다시 만들 때부터 저장할 수 있습니다.')
      return
    }
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setMessage('로그인하면 조리 기록을 저장할 수 있습니다.')
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/v1/recipes/${encodeURIComponent(recipeId)}/cooking-sessions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientSessionId,
          startedAt,
          completedAt,
          actualDurationMinutes,
          outcome,
          difficulty,
          taste,
          remakeIntent,
          substituteNotes,
          familyReaction,
          comment,
        }),
      })
      if (!response.ok) {
        setMessage(response.status === 401
          ? '로그인하면 조리 기록을 저장할 수 있습니다.'
          : '조리 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      setSaved(true)
      setMessage('비공개 조리 기록을 저장했습니다. 이 기록은 레시피 검수 완료 증거로 자동 사용되지 않습니다.')
    } catch {
      setMessage('조리 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  if (saved) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-3 text-[12px] font-bold leading-5 text-[#315f2d]">
        <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-[#dcebd2] pt-4">
      <h4 className="text-[14px] font-black text-[#315f2d]">이번 요리 기록 남기기</h4>
      <p className="mt-1 text-[11px] font-semibold leading-5 text-[#557b4f]">
        저장 버튼을 눌렀을 때만 로그인 계정의 비공개 기록으로 보관합니다.
        {actualDurationMinutes ? ` 실제 소요시간 ${actualDurationMinutes}분` : ''}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-label="조리 결과">
        {COOKING_OUTCOMES.map((item) => (
          <button key={item.id} type="button" onClick={() => setOutcome(item.id)} aria-pressed={outcome === item.id} className={`min-h-11 rounded-xl px-2 text-[11px] font-black ${outcome === item.id ? 'bg-[#315f2d] text-white' : 'bg-white text-[#557b4f]'}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-[11px] font-black text-[#557b4f]">
          맛
          <select value={taste} onChange={(event) => setTaste(event.target.value as CookingTaste)} className="min-h-11 rounded-xl border border-[#dcebd2] bg-white px-3 text-[12px] font-bold text-[#315f2d]">
            {COOKING_TASTES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-black text-[#557b4f]">
          다시 만들기
          <select value={remakeIntent} onChange={(event) => setRemakeIntent(event.target.value as CookingRemakeIntent)} className="min-h-11 rounded-xl border border-[#dcebd2] bg-white px-3 text-[12px] font-bold text-[#315f2d]">
            {COOKING_REMAKE_INTENTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-2 grid gap-1 text-[11px] font-black text-[#557b4f]">
        대체한 재료 (선택)
        <input value={substituteNotes} onChange={(event) => setSubstituteNotes(event.target.value.slice(0, 300))} className="min-h-11 rounded-xl border border-[#dcebd2] bg-white px-3 text-[12px] font-semibold text-[#315f2d]" placeholder="예: 대파 대신 쪽파" />
      </label>
      <label className="mt-2 grid gap-1 text-[11px] font-black text-[#557b4f]">
        가족 반응 (선택)
        <input value={familyReaction} onChange={(event) => setFamilyReaction(event.target.value.slice(0, 300))} className="min-h-11 rounded-xl border border-[#dcebd2] bg-white px-3 text-[12px] font-semibold text-[#315f2d]" placeholder="예: 아이가 잘 먹었어요" />
      </label>
      <label className="mt-2 grid gap-1 text-[11px] font-black text-[#557b4f]">
        짧은 메모 (선택)
        <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 500))} className="min-h-20 resize-none rounded-xl border border-[#dcebd2] bg-white px-3 py-2 text-[12px] font-semibold leading-5 text-[#315f2d]" />
      </label>

      {authLoading ? (
        <p className="mt-3 text-[11px] font-bold text-[#557b4f]">로그인 상태를 확인하는 중입니다.</p>
      ) : !isAuthenticated ? (
        <Link href="/login" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[#315f2d] px-4 text-[12px] font-black text-white">로그인하고 기록 저장</Link>
      ) : (
        <button type="button" onClick={saveSession} disabled={submitting || !canSave} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#315f2d] px-4 text-[12px] font-black text-white disabled:opacity-50">
          <Save size={15} /> {submitting ? '저장 중' : '비공개 기록 저장'}
        </button>
      )}
      {message ? <p className="mt-2 text-[11px] font-bold leading-5 text-[#b42318]" role="alert">{message}</p> : null}
    </div>
  )
}
