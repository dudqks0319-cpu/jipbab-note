// 이 파일은 마이페이지를 담당하며 참고 이미지의 프로필/메뉴 화면을 구현합니다.
'use client'

import Link from 'next/link'
import {
  Bell,
  BookOpen,
  ChevronRight,
  Heart,
  LoaderCircle,
  LogOut,
  MessageCircle,
  RefreshCw,
  Refrigerator,
  Settings,
  ShoppingBasket,
  Star,
  type LucideIcon,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

const menuItems = [
  { icon: BookOpen, label: '내 레시피', href: '/favorites' },
  { icon: Heart, label: '찜한 레시피', href: '/favorites' },
  { icon: Star, label: '작성한 후기', href: '/community' },
  { icon: ShoppingBasket, label: '장보기 리스트', href: '/shopping' },
  { icon: Refrigerator, label: '냉장고 관리', href: '/fridge' },
]

export default function MyPage() {
  const {
    user,
    loading,
    migrating,
    isAuthenticated,
    migrationResult,
    userDisplayName,
    userEmail,
    userAvatarUrl,
    currentProvider,
    signOut,
    refreshUser,
  } = useAuth()

  const isAdminUser = Boolean(userEmail && userEmail === 'dudqks0319@gmail.com')

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-6">
      <section className="mobile-safe-top px-5">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full border border-[#eadcc9] bg-[#f6dcc9]">
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatarUrl} alt="프로필 이미지" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[24px]">🍳</div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-black text-[#2f2117]">{userDisplayName}</h1>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#8f7f70]">
                {userEmail ?? '로그인하고 데이터를 안전하게 보관하세요'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/settings#notifications" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]" aria-label="알림 설정">
              <Bell size={17} />
            </Link>
            <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eadcc9] bg-[#fffaf3] text-[#2f2117]" aria-label="설정">
              <Settings size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pt-4">
        {loading ? (
          <div className="jipbab-panel flex items-center gap-2 rounded-[18px] px-4 py-4 text-sm font-semibold text-[#7d6d5f]">
            <LoaderCircle size={16} className="animate-spin" />
            로그인 상태를 확인하고 있어요
          </div>
        ) : !isAuthenticated ? (
          <div className="jipbab-panel rounded-[20px] px-4 py-5 text-center">
            <p className="text-[17px] font-black text-[#2f2117]">집밥노트를 더 안전하게 사용하세요</p>
            <p className="mt-2 text-sm leading-6 text-[#7d6d5f]">로그인하면 냉장고와 장보기 목록을 계정에 보관할 수 있어요.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/login" className="rounded-[14px] bg-[#ea5a1f] py-3 text-sm font-black text-white">
                로그인
              </Link>
              <Link href="/signup" className="rounded-[14px] border border-[#ea5a1f] bg-[#fffaf3] py-3 text-sm font-black text-[#d94d19]">
                회원가입
              </Link>
            </div>
          </div>
        ) : (
          <div className="jipbab-panel overflow-hidden rounded-[18px] bg-[#2f302d] text-white">
            <div className="grid grid-cols-3 divide-x divide-white/10 px-2 py-4 text-center">
              <ProfileStat label="레시피" value="42" />
              <ProfileStat label="찜한 레시피" value="128" />
              <ProfileStat label="작성한 후기" value="16" />
            </div>
            <div className="border-t border-white/10 px-4 py-3 text-[12px] font-semibold text-white/75">
              현재 로그인: {currentProvider ?? 'OAuth'}
            </div>
          </div>
        )}
      </section>

      {isAuthenticated && migrating ? (
        <section className="px-5 pt-3">
          <div className="jipbab-panel flex items-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold text-[#7d6d5f]">
            <LoaderCircle size={16} className="animate-spin" />
            디바이스 데이터를 계정으로 이전하고 있어요
          </div>
        </section>
      ) : null}

      {migrationResult ? (
        <section className="px-5 pt-3">
          <div className="jipbab-panel rounded-[16px] px-4 py-3 text-sm font-semibold text-[#4b3929]">
            계정 이전 완료: <span className="font-black text-[#d94d19]">{migrationResult.totalMigratedCount}건</span>
          </div>
        </section>
      ) : null}

      <section className="px-5 pt-5">
        <h2 className="mb-2 text-[13px] font-black text-[#4b3929]">메뉴</h2>
        <div className="jipbab-panel divide-y divide-[#eadcc9] overflow-hidden rounded-[16px]">
          {menuItems.map((item) => (
            <MenuLink key={item.label} href={item.href} icon={item.icon} label={item.label} />
          ))}
          <MenuLink href="/support" icon={MessageCircle} label="고객센터" />
          {isAuthenticated ? <MenuLink href="/account-delete" icon={LogOut} label="계정 삭제 요청" danger /> : null}
          {isAdminUser ? <MenuLink href="/admin/account-deletions" icon={Settings} label="운영자 삭제 요청함" /> : null}
        </div>
      </section>

      {isAuthenticated ? (
        <section className="grid grid-cols-2 gap-2 px-5 pt-4">
          <button
            type="button"
            onClick={() => {
              void refreshUser()
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#eadcc9] bg-[#fffaf3] py-3 text-sm font-black text-[#4b3929]"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#ea5a1f] bg-[#fff0e4] py-3 text-sm font-black text-[#d94d19]"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </section>
      ) : null}

      <p className="px-5 pt-8 text-center text-[11px] font-semibold text-[#b5a493]">
        집밥노트 v1.0.0 {user ? `· UID ${user.id.slice(0, 8)}` : ''}
      </p>
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[20px] font-black">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-white/70">{label}</p>
    </div>
  )
}

function MenuLink({
  href,
  icon: Icon,
  label,
  danger = false,
}: {
  href: string
  icon: LucideIcon
  label: string
  danger?: boolean
}) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Icon size={17} className={danger ? 'text-[#d94d19]' : 'text-[#7d6d5f]'} />
        <span className={`text-[14px] font-bold ${danger ? 'text-[#d94d19]' : 'text-[#4b3929]'}`}>{label}</span>
      </div>
      <ChevronRight size={16} className="text-[#b5a493]" />
    </Link>
  )
}
