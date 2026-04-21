// 이 파일은 설정 화면을 담당하며 참고 이미지의 단순 리스트 설정 UI를 구현합니다.
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Send, Sparkles, Trash2 } from 'lucide-react'

import { useAppSettings } from '@/hooks/useAppSettings'
import {
  downloadGemmaModel,
  formatBytes,
  generateWithGemma,
  getGemmaStatus,
  isNativeGemmaAvailable,
  removeGemmaModel,
  type GemmaStatus,
} from '@/lib/gemma'
import type { IngredientUnitSystem } from '@/types'

const toggleItems: Array<{
  key: 'expiryAlerts' | 'shoppingReminders' | 'recipeDiscoveryTips'
  title: string
}> = [
  { key: 'expiryAlerts', title: '알림 설정' },
  { key: 'shoppingReminders', title: '푸시 알림' },
  { key: 'recipeDiscoveryTips', title: '레시피 추천' },
]

const unitOptions: Array<{
  key: IngredientUnitSystem
  title: string
}> = [
  { key: 'metric', title: 'ml / g' },
  { key: 'spoon', title: '큰술 / 작은술' },
  { key: 'count', title: '개 / 봉 / 팩' },
]

export default function SettingsPage() {
  const { settings, toggleSetting, setUnitSystem, resetSettings } = useAppSettings()
  const [gemmaStatus, setGemmaStatus] = useState<GemmaStatus | null>(null)
  const [gemmaPrompt, setGemmaPrompt] = useState('양파, 계란, 두부로 오늘 저녁 메뉴 추천해줘')
  const [gemmaAnswer, setGemmaAnswer] = useState('')
  const [gemmaBusy, setGemmaBusy] = useState<'download' | 'remove' | 'generate' | null>(null)
  const [gemmaError, setGemmaError] = useState('')

  useEffect(() => {
    let cancelled = false

    getGemmaStatus()
      .then((status) => {
        if (!cancelled) {
          setGemmaStatus(status)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGemmaStatus(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const runGemmaAction = async (action: 'download' | 'remove' | 'generate') => {
    setGemmaBusy(action)
    setGemmaError('')

    try {
      if (action === 'download') {
        setGemmaStatus(await downloadGemmaModel())
      } else if (action === 'remove') {
        setGemmaStatus(await removeGemmaModel())
        setGemmaAnswer('')
      } else {
        const result = await generateWithGemma(gemmaPrompt)
        setGemmaAnswer(result.text)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemma 실행 중 오류가 발생했습니다.'
      setGemmaError(message)
    } finally {
      setGemmaBusy(null)
    }
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/mypage" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]" aria-label="마이페이지로 돌아가기">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-center text-[16px] font-black text-[#2f2117]">설정</h1>
          <span />
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel divide-y divide-[#eadcc9] overflow-hidden rounded-[16px]">
          <SettingLink title="계정 정보" value="" href="/mypage" />
          {toggleItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleSetting(item.key)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="text-[14px] font-bold text-[#4b3929]">{item.title}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${settings[item.key] ? 'bg-[#eef6df] text-[#3d7b38]' : 'bg-[#f1e4d7] text-[#8f7f70]'}`}>
                {settings[item.key] ? '켜짐' : '꺼짐'}
              </span>
            </button>
          ))}
          <SettingLink title="고객센터" value="" href="/support" />
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel overflow-hidden rounded-[16px] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-[#2f6fec]" />
                <h2 className="text-[15px] font-black text-[#2f2117]">온디바이스 AI</h2>
              </div>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7d6d5f]">
                Gemma-4-E2B-it를 iPhone 안에 내려받아 재료 기반 추천을 테스트합니다.
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${gemmaStatus?.installed ? 'bg-[#eef6df] text-[#3d7b38]' : 'bg-[#f1e4d7] text-[#8f7f70]'}`}>
              {gemmaStatus?.installed ? '설치됨' : '미설치'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <GemmaMetric label="모델" value={gemmaStatus?.modelName ?? 'Gemma-4-E2B'} />
            <GemmaMetric label="크기" value={formatBytes(gemmaStatus?.sizeBytes ?? 2_583_085_056)} />
            <GemmaMetric label="실행" value={gemmaStatus?.backend?.toUpperCase() ?? 'CPU'} />
          </div>

          {!isNativeGemmaAvailable() ? (
            <p className="mt-3 rounded-[12px] bg-[#fff0e4] px-3 py-2 text-[12px] font-bold leading-5 text-[#b45309]">
              이 기능은 TestFlight/iOS 앱에서만 실행됩니다. 웹 브라우저에서는 상태만 표시합니다.
            </p>
          ) : null}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => runGemmaAction('download')}
              disabled={gemmaBusy !== null || gemmaStatus?.installed}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[13px] bg-[#2f6fec] px-3 text-[13px] font-black text-white disabled:bg-[#c8d3e5]"
            >
              <Download size={16} />
              {gemmaBusy === 'download' ? '다운로드 중' : '모델 설치'}
            </button>
            <button
              type="button"
              onClick={() => runGemmaAction('remove')}
              disabled={gemmaBusy !== null || !gemmaStatus?.installed}
              className="flex min-h-11 w-12 items-center justify-center rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f] disabled:opacity-45"
              aria-label="Gemma 모델 삭제"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <textarea
              value={gemmaPrompt}
              onChange={(event) => setGemmaPrompt(event.target.value)}
              className="min-h-[78px] w-full resize-none rounded-[13px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3 text-[13px] font-semibold leading-5 text-[#4b3929] outline-none focus:border-[#2f6fec]"
            />
            <button
              type="button"
              onClick={() => runGemmaAction('generate')}
              disabled={gemmaBusy !== null || !gemmaStatus?.installed}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-[#31a66a] px-3 text-[13px] font-black text-white disabled:bg-[#c9d8ce]"
            >
              <Send size={16} />
              {gemmaBusy === 'generate' ? '생성 중' : '추천 테스트'}
            </button>
          </div>

          {gemmaError ? (
            <p className="mt-3 rounded-[12px] bg-[#fff0e4] px-3 py-2 text-[12px] font-bold leading-5 text-[#b45309]">{gemmaError}</p>
          ) : null}

          {gemmaAnswer ? (
            <div className="mt-3 rounded-[13px] bg-[#f8fff7] px-3 py-3 text-[13px] font-semibold leading-6 text-[#2f4b32]">
              {gemmaAnswer}
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="jipbab-panel divide-y divide-[#eadcc9] overflow-hidden rounded-[16px]">
          <div className="px-4 py-3">
            <p className="text-[14px] font-bold text-[#4b3929]">테마 설정</p>
            <p className="mt-1 text-[12px] font-semibold text-[#8f7f70]">라이트</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[14px] font-bold text-[#4b3929]">언어 설정</p>
            <p className="mt-1 text-[12px] font-semibold text-[#8f7f70]">한국어</p>
          </div>
          <div className="px-4 py-3">
            <p className="mb-2 text-[14px] font-bold text-[#4b3929]">단위 표시</p>
            <div className="grid grid-cols-3 gap-2">
              {unitOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setUnitSystem(option.key)}
                  className={`rounded-[12px] border px-2 py-2 text-[11px] font-black ${
                    settings.unitSystem === option.key
                      ? 'border-[#ea5a1f] bg-[#fff0e4] text-[#d94d19]'
                      : 'border-[#eadcc9] bg-[#fffaf3] text-[#7d6d5f]'
                  }`}
                >
                  {option.title}
                </button>
              ))}
            </div>
          </div>
          <SettingLink title="이용약관" value="" href="/privacy" />
          <SettingLink title="개인정보 처리방침" value="" href="/privacy" />
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[14px] font-bold text-[#4b3929]">앱 정보</span>
            <span className="text-[12px] font-semibold text-[#8f7f70]">v1.0.0</span>
          </div>
        </div>
      </section>

      <section className="px-5 pt-8">
        <button
          type="button"
          onClick={resetSettings}
          className="w-full rounded-[14px] border border-[#ea5a1f] bg-[#fffaf3] py-3 text-sm font-black text-[#d94d19]"
        >
          설정 기본값 복원
        </button>
      </section>
    </div>
  )
}

function SettingLink({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5">
      <span className="text-[14px] font-bold text-[#4b3929]">{title}</span>
      <span className="flex items-center gap-1 text-[12px] font-semibold text-[#8f7f70]">
        {value}
        <ChevronRight size={15} className="text-[#b5a493]" />
      </span>
    </Link>
  )
}

function GemmaMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[#fffaf3] px-2 py-2">
      <p className="text-[10px] font-black text-[#b5a493]">{label}</p>
      <p className="mt-1 truncate text-[11px] font-black text-[#4b3929]">{value}</p>
    </div>
  )
}
