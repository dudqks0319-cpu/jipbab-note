// 이 파일은 모바일 앱 프레임과 탭 노출 규칙을 담당합니다.
'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import BottomTab from '@/components/layout/BottomTab'

const AUTH_ROUTES = ['/welcome', '/login', '/signup']

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)

  return (
    <div className="min-h-screen bg-[#f4eee5]">
      <div className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden border-x border-[#ead9c6] bg-[#fbf6ee] shadow-[0_18px_50px_rgba(82,59,35,0.16)]">
        <main className="relative flex-1 overflow-y-auto">{children}</main>
        {isAuthRoute ? null : <BottomTab />}
      </div>
    </div>
  )
}
