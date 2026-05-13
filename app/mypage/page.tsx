// 이 파일은 마이페이지를 담당하며 OAuth 로그인 상태와 계정 동기화 정보를 보여줍니다.
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, LoaderCircle, LogOut, RefreshCw, Trash2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useFamilyFridge } from '@/hooks/useFamilyFridge'
import type { OAuthProvider } from '@/types'

type MenuItem = {
  emoji: string
  label: string
  href?: string
}

const menuItems: MenuItem[] = [
  { emoji: '❤️', label: '즐겨찾기한 레시피' },
  { emoji: '🔔', label: '알림 설정' },
  { emoji: '📊', label: '냉장고 통계' },
  { emoji: '🔒', label: '개인정보 처리방침', href: '/privacy' },
  { emoji: '📄', label: '이용약관', href: '/terms' },
  { emoji: '💬', label: '지원/문의', href: '/support' },
]

const providerBadges: Record<OAuthProvider, string> = {
  google: '🌐 구글',
  kakao: '💛 카카오',
  apple: '🍎 애플',
}

const providerButtonTone: Record<OAuthProvider, string> = {
  google: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  kakao: 'bg-[#FEE500] text-[#191600] hover:bg-[#f6dd00]',
  apple: 'bg-gray-900 text-white hover:bg-black',
}

export default function MyPage() {
  const {
    user,
    loading,
    signingIn,
    migrating,
    deletingAccount,
    isAuthenticated,
    providers,
    error,
    migrationResult,
    userDisplayName,
    userEmail,
    userAvatarUrl,
    currentProvider,
    signInWithProvider,
    signOut,
    deleteAccount,
    refreshUser,
  } = useAuth()
  const { family, maxMembers, createFamilyFridge, joinFamilyFridge, leaveFamilyFridge } = useFamilyFridge()
  const [familyName, setFamilyName] = useState('나')
  const [inviteCode, setInviteCode] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null)

  const enabledProviders = providers.filter((item) => item.enabled)
  const disabledProviders = providers.filter((item) => !item.enabled)
  const canDeleteAccount = deleteConfirmText.trim() === '계정 삭제'

  const handleDeleteAccount = async () => {
    setDeleteNotice(null)
    const deleted = await deleteAccount()
    if (deleted) {
      setDeleteConfirmText('')
      setDeleteNotice('계정과 계정 기반 데이터 삭제 요청이 완료되었습니다.')
    }
  }

  return (
    <div className="flex flex-col px-5 pt-4">
      {/* 프로필/로그인 카드 */}
      <div className="flex flex-col items-center rounded-[2rem] bg-gradient-to-br from-mint-100 via-cream-100 to-lavender-100 px-4 py-8">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white shadow-soft">
          {userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatarUrl} alt="프로필 이미지" className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl">{isAuthenticated ? '🍳' : '🧊'}</span>
          )}
        </div>

        <p className="mt-4 text-lg font-bold text-gray-800">{userDisplayName}</p>
        <p className="mt-1 text-sm text-gray-500">
          {userEmail ?? '로그인하고 데이터를 안전하게 보관하세요'}
        </p>

        {loading ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
            <LoaderCircle size={16} className="animate-spin" />
            로그인 상태를 확인하고 있어요
          </div>
        ) : null}

        {!loading && !isAuthenticated ? (
          <div className="mt-5 w-full space-y-2">
            {enabledProviders.length > 0 ? (
              enabledProviders.map((provider) => (
                <button
                  key={provider.provider}
                  type="button"
                  disabled={signingIn}
                  onClick={() => {
                    void signInWithProvider(provider.provider)
                  }}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    providerButtonTone[provider.provider]
                  }`}
                >
                  {providerBadges[provider.provider]}로 로그인
                </button>
              ))
            ) : (
              <p className="rounded-xl bg-white/70 px-4 py-3 text-center text-sm text-gray-500">
                사용 가능한 OAuth 제공자가 없습니다.
                <br />
                Supabase Auth Provider 설정을 확인해주세요.
              </p>
            )}

            {disabledProviders.length > 0 ? (
              <p className="pt-1 text-center text-xs text-gray-400">
                비활성 제공자: {disabledProviders.map((item) => item.label).join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}

        {!loading && isAuthenticated ? (
          <div className="mt-5 w-full space-y-2">
            <div className="rounded-xl bg-white/80 px-4 py-3 text-sm text-gray-600">
              현재 로그인: <span className="font-semibold text-gray-800">{currentProvider ?? 'OAuth'}</span>
            </div>

            {migrating ? (
              <div className="flex items-center gap-2 rounded-xl bg-white/80 px-4 py-3 text-sm text-gray-600">
                <LoaderCircle size={16} className="animate-spin" />
                디바이스 데이터를 계정으로 이전하고 있어요
              </div>
            ) : null}

            {migrationResult ? (
              <div className="rounded-xl bg-white/80 px-4 py-3 text-sm text-gray-600">
                계정 이전 완료: <span className="font-bold text-mint-500">{migrationResult.totalMigratedCount}건</span>
                <p className="mt-1 text-xs text-gray-500">로컬 동기화 반영: {migrationResult.localMigratedCount}건</p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  void refreshUser()
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-soft"
              >
                <RefreshCw size={14} />
                상태 새로고침
              </button>

              <button
                type="button"
                onClick={() => {
                  void signOut()
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-600"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 w-full rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error.message}
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-3xl bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-800">가족 냉장고 공유</h3>
            <p className="mt-1 text-sm text-gray-500">최대 {maxMembers}명까지 같은 냉장고를 함께 볼 수 있습니다.</p>
          </div>
          {family.inviteCode ? (
            <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-bold text-mint-500">
              {family.inviteCode}
            </span>
          ) : null}
        </div>

        {family.fridgeId ? (
          <div className="mt-3 space-y-2">
            <div className="rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
              참여 가족: {family.memberNames.join(', ')} ({family.memberNames.length}/{maxMembers})
            </div>
            <button
              type="button"
              onClick={leaveFamilyFridge}
              className="w-full rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600"
            >
              가족 냉장고 나가기
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <input
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              placeholder="내 표시 이름"
              className="w-full rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-mint-300 focus:ring-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => createFamilyFridge(familyName)}
                className="rounded-xl bg-mint-300 px-3 py-2 text-sm font-bold text-white"
              >
                공유 시작
              </button>
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="초대코드"
                className="rounded-xl border border-gray-100 px-3 py-2 text-sm outline-none ring-mint-300 focus:ring-2"
              />
            </div>
            <button
              type="button"
              onClick={() => joinFamilyFridge(inviteCode, familyName)}
              className="w-full rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600"
            >
              초대코드로 참여
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-3xl bg-white p-4 text-sm text-gray-600 shadow-soft">
        <p className="font-bold text-gray-800">구글 로그인 차단 해결 안내</p>
        <p className="mt-1">
          iPhone에서 구글이 앱 내 브라우저를 차단하면 Supabase Redirect URL, iOS URL Scheme, 외부 브라우저 복귀 설정을 맞춰야 합니다.
          현재 앱은 구글/카카오/애플 제공자를 노출하며, 실제 배포 전 Supabase Auth Provider와 Apple/Kakao 개발자 콘솔 값을 연결해야 합니다.
        </p>
      </div>

      <div className="mt-5 rounded-3xl bg-white p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800">계정 삭제</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              로그인 계정, 냉장고 재료, 즐겨찾기, 커뮤니티 활동 등 계정과 연결된 데이터를 삭제합니다.
              삭제 후에는 복구할 수 없습니다.
            </p>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="mt-3 space-y-2">
            <input
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="계정 삭제 라고 입력"
              className="w-full rounded-xl border border-rose-100 px-3 py-2 text-sm outline-none ring-rose-200 focus:ring-2"
            />
            <button
              type="button"
              disabled={!canDeleteAccount || deletingAccount}
              onClick={() => {
                void handleDeleteAccount()
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingAccount ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deletingAccount ? '삭제 요청 중...' : '계정과 데이터 삭제'}
            </button>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
            계정 삭제는 로그인 후 진행할 수 있습니다. 비로그인 로컬 데이터는 브라우저 저장소 삭제로 초기화됩니다.
          </p>
        )}

        {deleteNotice ? (
          <div className="mt-3 rounded-2xl bg-mint-50 px-3 py-2 text-sm font-semibold text-mint-500">
            {deleteNotice}
          </div>
        ) : null}
      </div>

      {/* 메뉴 리스트 */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-soft">
        {menuItems.map((item, idx) => {
          const className = `flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50 ${
            idx < menuItems.length - 1 ? 'border-b border-gray-50' : ''
          }`
          const content = (
            <>
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.emoji}</span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
            </>
          )

          return item.href ? (
            <Link key={item.label} href={item.href} className={className}>
              {content}
            </Link>
          ) : (
            <button key={item.label} type="button" className={className}>
              {content}
            </button>
          )
        })}
      </div>

      <p className="mt-10 pb-6 text-center text-xs text-gray-300">
        집밥노트 v1.0.0 {user ? `• UID ${user.id.slice(0, 8)}` : ''}
      </p>
    </div>
  )
}
