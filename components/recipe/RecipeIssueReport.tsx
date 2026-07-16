// 이 파일은 로그인 사용자가 레시피 품질·안전 오류를 비공개로 신고하는 UI를 담당합니다.
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { RECIPE_ISSUE_TYPES, type RecipeIssueType } from '@/lib/recipe-issue-report'
import { getSupabaseClient } from '@/lib/supabase'

const MAX_DETAILS_LENGTH = 500

type RecipeIssueReportProps = {
  recipeId: string
  recipeName: string
}
async function getAccessToken(): Promise<string | null> {
  const client = getSupabaseClient()
  const { data } = await client.auth.getSession()
  return data.session?.access_token ?? null
}

function reportErrorMessage(status: number): string {
  if (status === 401) return '로그인하면 오류를 신고할 수 있습니다.'
  if (status === 429) return '신고 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
  if (status === 404) return '현재 공개된 레시피만 신고할 수 있습니다.'
  return '오류 신고를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export default function RecipeIssueReport({ recipeId, recipeName }: RecipeIssueReportProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [issueType, setIssueType] = useState<RecipeIssueType>('ingredient_amount')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submitReport = async () => {
    const trimmed = details.trim()
    setMessage(null)
    if (trimmed.length < 3 || trimmed.length > MAX_DETAILS_LENGTH) {
      setMessage('확인이 필요한 내용을 3자 이상 500자 이하로 적어 주세요.')
      return
    }
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setMessage('로그인하면 오류를 신고할 수 있습니다.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/v1/recipes/${encodeURIComponent(recipeId)}/issue-reports`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ issueType, details: trimmed }),
      })
      if (!response.ok) {
        setMessage(reportErrorMessage(response.status))
        return
      }
      setSubmitted(true)
      setDetails('')
      setMessage('신고가 접수되었습니다. 운영 검토 전에는 자동으로 레시피를 수정하지 않습니다.')
    } catch {
      setMessage('오류 신고를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="px-5 pt-5">
      <div className="rounded-2xl border border-[#f0dfcb] bg-[#fff9f0] px-4 py-4">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-[15px] font-black text-[#8b451f]">
            <AlertTriangle size={17} /> 레시피 오류 신고
          </span>
          <ChevronDown size={17} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <p className="mt-1 text-[11px] font-semibold leading-5 text-[#8f7f70]">
          {recipeName}의 계량, 조리 순서, 알레르기 또는 안전 정보가 잘못되었다면 알려 주세요.
        </p>

        {open ? (
          authLoading ? (
            <p className="mt-3 text-[12px] font-bold text-[#7d6d5f]">로그인 상태를 확인하는 중입니다.</p>
          ) : !isAuthenticated ? (
            <div className="mt-3 rounded-xl bg-white px-3 py-3">
              <p className="text-[12px] font-bold text-[#6f655b]">스팸 방지를 위해 로그인 후 신고할 수 있습니다.</p>
              <Link href="/login" className="mt-2 inline-flex min-h-11 items-center rounded-full bg-[#8b451f] px-4 text-[12px] font-black text-white">
                로그인하기
              </Link>
            </div>
          ) : submitted ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-3 text-[12px] font-bold leading-5 text-[#315f2d]">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="grid gap-1 text-[11px] font-black text-[#6f655b]">
                오류 유형
                <select
                  value={issueType}
                  onChange={(event) => setIssueType(event.target.value as RecipeIssueType)}
                  className="min-h-11 rounded-xl border border-[#e7d6c2] bg-white px-3 text-[13px] font-bold text-[#4b3929]"
                >
                  {RECIPE_ISSUE_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-[11px] font-black text-[#6f655b]">
                확인할 내용
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value.slice(0, MAX_DETAILS_LENGTH))}
                  placeholder="예: 2단계의 간장 양과 알레르기 표시를 확인해 주세요."
                  className="min-h-24 resize-none rounded-xl border border-[#e7d6c2] bg-white px-3 py-3 text-[13px] font-semibold leading-6 text-[#4b3929]"
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-[#8f7f70]">{details.length}/{MAX_DETAILS_LENGTH}</span>
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={submitting || details.trim().length < 3}
                  className="min-h-11 rounded-full bg-[#8b451f] px-4 text-[12px] font-black text-white disabled:opacity-50"
                >
                  {submitting ? '접수 중' : '비공개 신고 접수'}
                </button>
              </div>
            </div>
          )
        ) : null}
        {!submitted && message ? <p className="mt-3 text-[12px] font-bold text-[#b42318]" role="alert">{message}</p> : null}
      </div>
    </section>
  )
}
