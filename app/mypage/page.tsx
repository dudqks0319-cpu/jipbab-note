// 이 파일은 마이페이지를 담당하며 OAuth 로그인 상태와 계정 동기화 정보를 보여줍니다.
'use client'

import { ChevronRight, LoaderCircle, LogOut, RefreshCw } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import type { OAuthProvider } from '@/types'

const menuItems = [
  { emoji: '❤️', label: '즐겨찾기한 레시피' },
  { emoji: '🔔', label: '알림 설정' },
  { emoji: '📊', label: '냉장고 통계' },
  { emoji: '⚙️', label: '앱 설정' },
  { emoji: '💬', label: '의견 보내기' },
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
    refreshUser,
  } = useAuth()

  const enabledProviders = providers.filter((item) => item.enabled)
  const disabledProviders = providers.filter((item) => !item.enabled)

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

      {/* 메뉴 리스트 */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-soft">
        {menuItems.map((item, idx) => (
          <button
            key={item.label}
            type="button"
            className={`flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50 ${
              idx < menuItems.length - 1 ? 'border-b border-gray-50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.emoji}</span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        ))}
      </div>

      <p className="mt-10 pb-6 text-center text-xs text-gray-300">
        집밥노트 v1.0.0 {user ? `• UID ${user.id.slice(0, 8)}` : ''}
      </p>
    </div>
  )
}
