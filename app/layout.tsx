// 이 파일은 앱 전체의 뼈대(레이아웃)를 담당합니다
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: '집밥노트',
  description: '냉장고 속 재료로 오늘 뭐 해먹지? 집밥노트가 알려줄게!',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen bg-[#f4eee5] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
