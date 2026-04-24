// 이 파일은 앱 상단 헤더를 담당합니다 - 따뜻한 파스텔 스타일
'use client'

import { Bell, ChevronLeft, ChevronRight, Leaf } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const today = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())

  const goBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }

    if (pathname !== '/') {
      router.push('/')
    }
  }

  return (
    <header className="relative z-40 flex w-full items-center justify-between gap-3 border-b border-white/70 bg-[#fffdf9]/90 px-5 pb-3 pt-[calc(0.9rem+var(--app-safe-area-top))] backdrop-blur-xl">
      {/* 브랜드 블록 */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mint-200 to-peach-200 shadow-soft">
          <Leaf size={18} className="text-mint-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-400">JIPBAB NOTE</p>
          <h1 className="text-base font-bold text-gray-800">{today}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="뒤로가기"
          onClick={goBack}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-soft"
        >
          <ChevronLeft size={17} className="text-gray-500" />
        </button>
        <button
          type="button"
          aria-label="앞으로가기"
          onClick={() => window.history.forward()}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-soft"
        >
          <ChevronRight size={17} className="text-gray-500" />
        </button>
        <button
          aria-label="알림 보기"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-mint-100 bg-white shadow-soft"
        >
          <Bell size={17} className="text-mint-500" />
          <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400" />
        </button>
      </div>
    </header>
  )
}
