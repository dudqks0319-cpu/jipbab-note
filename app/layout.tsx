// 이 파일은 앱 전체의 뼈대(레이아웃)를 담당합니다
import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import BottomTab from '@/components/layout/BottomTab'

export const metadata: Metadata = {
  title: '집밥노트',
  description: '냉장고 속 재료로 오늘 뭐 해먹지? 집밥노트가 알려줄게!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen bg-[#f3efe7] antialiased">
        {/* 배경을 부드럽게 깔고 중앙에 모바일 앱 프레임을 고정합니다 */}
        <div className="bg-app-shell relative min-h-screen overflow-x-hidden">
          <div className="pointer-events-none absolute left-1/2 top-[-7rem] h-64 w-64 -translate-x-1/2 rounded-full bg-mint-200/55 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-28 h-40 w-40 rounded-full bg-peach-200/60 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-16 h-44 w-44 rounded-full bg-lavender-200/65 blur-3xl" />

          <div className="relative mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden border-x border-white/70 bg-[#fffdf9]/92 shadow-[0_18px_60px_rgba(43,54,70,0.18)]">
            <Header />
            <main className="relative flex-1 overflow-y-auto pb-4">
              {children}
            </main>
            <BottomTab />
          </div>
        </div>
      </body>
    </html>
  )
}
