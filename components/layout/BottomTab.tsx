// 이 파일은 하단 탭 네비게이션을 담당합니다 - 참고 이미지처럼 둥근 아이콘 스타일
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Refrigerator, ShoppingCart, User } from 'lucide-react'

const tabs = [
  { label: '홈', icon: Home, href: '/' },
  { label: '냉장고', icon: Refrigerator, href: '/fridge' },
  { label: '레시피', icon: BookOpen, href: '/recipe' },
  { label: '장보기', icon: ShoppingCart, href: '/shopping' },
  { label: '마이', icon: User, href: '/mypage' },
]

export default function BottomTab() {
  const pathname = usePathname()

  return (
    <nav className="relative z-40 w-full border-t border-[#eadcc9] bg-[#fffaf3]/95 px-3 pt-2 backdrop-blur-xl [padding-bottom:calc(0.45rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 gap-0.5">
        {tabs.map((tab) => {
          const isActive = tab.href === '/'
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-all ${
                isActive ? 'bg-[#fff3e7]' : 'hover:bg-white/70'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                  isActive
                    ? 'bg-[#ea5a1f] text-white shadow-[0_6px_14px_rgba(234,90,31,0.28)]'
                    : 'text-[#9f9388] group-hover:text-[#4b3929]'
                }`}
              >
                <tab.icon
                  size={18}
                  className="transition-colors"
                />
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  isActive ? 'text-[#ea5a1f]' : 'text-[#9f9388]'
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
