// 이 파일은 모바일 앱 프레임과 탭 노출 규칙을 담당합니다.
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef } from 'react'

import BottomTab from '@/components/layout/BottomTab'

const AUTH_ROUTES = ['/welcome', '/login', '/signup']
const ROOT_ROUTES = ['/', '/fridge', '/recipe', '/shopping', '/mypage']

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const edgeSwipeStart = useRef<{ x: number; y: number } | null>(null)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)
  const canShowBackButton = !ROOT_ROUTES.includes(pathname)

  return (
    <div className="min-h-screen bg-[#f4eee5]">
      <div className="mx-auto flex h-[100dvh] w-full min-w-0 max-w-[430px] flex-col overflow-hidden border-x border-[#ead9c6] bg-[#fbf6ee] shadow-[0_18px_50px_rgba(82,59,35,0.16)]">
        <a
          href="#main-content"
          className="sr-only z-[60] min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#2f2117] px-4 text-sm font-black text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:flex"
        >
          본문으로 건너뛰기
        </a>
        <main
          id="main-content"
          tabIndex={-1}
          className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
          onTouchStart={(event) => {
            const touch = event.changedTouches[0]
            if (!touch || touch.clientX > 24) {
              edgeSwipeStart.current = null
              return
            }
            edgeSwipeStart.current = { x: touch.clientX, y: touch.clientY }
          }}
          onTouchEnd={(event) => {
            const start = edgeSwipeStart.current
            const touch = event.changedTouches[0]
            edgeSwipeStart.current = null
            if (!start || !touch) return

            const deltaX = touch.clientX - start.x
            const deltaY = Math.abs(touch.clientY - start.y)
            if (deltaX > 72 && deltaY < 44) {
              router.back()
            }
          }}
        >
          {canShowBackButton ? (
            <button
              type="button"
              aria-label="이전 화면으로 돌아가기"
              className="absolute left-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#ead9c6] bg-[#fffaf3]/95 text-[#3b2a1d] shadow-[0_8px_24px_rgba(82,59,35,0.16)] backdrop-blur"
              onClick={() => router.back()}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          ) : null}
          {children}
        </main>
        {isAuthRoute ? null : <BottomTab />}
      </div>
    </div>
  )
}
