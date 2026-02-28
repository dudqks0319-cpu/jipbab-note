// 이 파일은 앱 상단 헤더를 담당합니다 - 따뜻한 파스텔 스타일
'use client'

import { Bell, Leaf } from 'lucide-react'

export default function Header() {
  const today = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())

  return (
    <header className="relative z-40 flex h-16 w-full items-center justify-between border-b border-white/70 bg-[#fffdf9]/90 px-5 backdrop-blur-xl">
      {/* 브랜드 블록 */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-mint-200 to-peach-200 shadow-soft">
          <Leaf size={18} className="text-mint-500" />
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-400">JIPBAB NOTE</p>
          <h1 className="text-base font-bold text-gray-800">{today}</h1>
        </div>
      </div>

      {/* 알림 버튼 */}
      <button
        aria-label="알림 보기"
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-mint-100 bg-white shadow-soft"
      >
        <Bell size={18} className="text-mint-500" />
        <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400" />
      </button>
    </header>
  )
}
