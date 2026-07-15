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
    <nav className="relative z-40 w-full border-t border-[#eadcc9] bg-[#fffaf3]/95 px-2 pt-1 backdrop-blur-xl [padding-bottom:calc(0.35rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const isActive = tab.href === '/'
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className="group flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-1 transition-colors"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-[#c2410c] text-white shadow-[0_5px_12px_rgba(234,90,31,0.22)]'
                    : 'text-[#6b5f55] group-hover:bg-[#fff0e4] group-hover:text-[#4b3929]'
                }`}
              >
                <tab.icon
                  size={18}
                  className="transition-colors"
                />
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  isActive ? 'text-[#a63b13]' : 'text-[#6b5f55]'
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
