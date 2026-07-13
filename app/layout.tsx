// 이 파일은 앱 전체의 뼈대(레이아웃)를 담당합니다
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = {
  metadataBase: new URL('https://jipbab-note-app.vercel.app'),
  title: '집밥노트 | 냉장고 재료로 찾는 초보 집밥 레시피',
  description: '냉장고에 있는 재료를 고르면 지금 만들 수 있는 쉬운 집밥을 추천해요. 부족한 재료 확인부터 장보기, 단계별 조리까지 한 번에 이어집니다.',
  openGraph: {
    title: '집밥노트 | 냉장고 재료로 찾는 초보 집밥 레시피',
    description: '재료를 고르고 오늘 메뉴를 추천받아 장보기와 단계별 조리까지 이어가세요.',
    type: 'website',
    images: [{ url: '/icon.png', width: 1024, height: 1024, alt: '집밥노트 앱 아이콘' }],
  },
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
      <body className="min-h-screen bg-[#f4eee5] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
