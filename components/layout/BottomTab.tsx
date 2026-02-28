// 이 파일은 하단 탭 네비게이션을 담당합니다 - 참고 이미지처럼 둥근 아이콘 스타일
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Box, BookOpen, Users, User } from 'lucide-react'

const tabs = [
  { label: '홈', icon: Home, href: '/' },
  { label: '냉장고', icon: Box, href: '/fridge' },
  { label: '레시피', icon: BookOpen, href: '/recipe' },
  { label: '커뮤니티', icon: Users, href: '/community' },
  { label: '마이', icon: User, href: '/mypage' },
]

export default function BottomTab() {
  const pathname = usePathname()

  return (
    <nav className="relative z-40 w-full border-t border-white/80 bg-[#fffdf9]/92 px-3 pt-2 backdrop-blur-xl [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-all ${
                isActive ? 'bg-gradient-to-b from-mint-100 to-white shadow-soft' : 'hover:bg-white/70'
              }`}
            >
              {/* 활성 탭은 볼륨감 있는 아이콘 배경을 보여줍니다 */}
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                  isActive
                    ? 'bg-white text-mint-500 shadow-[0_4px_12px_rgba(61,191,152,0.3)]'
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              >
                <tab.icon
                  size={18}
                  className="transition-colors"
                />
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  isActive ? 'text-mint-500' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
