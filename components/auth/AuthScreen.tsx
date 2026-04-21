// 이 파일은 로그인/회원가입/웰컴 화면의 공통 인증 UI를 담당합니다.
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, Eye, Home, Lock, Mail, UserRound } from 'lucide-react'

import AuthProviderButton from '@/components/auth/AuthProviderButton'
import { useAuth } from '@/hooks/useAuth'

type AuthScreenProps = {
  mode: 'welcome' | 'login' | 'signup'
}

export default function AuthScreen({ mode }: AuthScreenProps) {
  const { providers, signingIn, error, signInWithProvider } = useAuth()
  const quickProviders = providers.filter((item) => item.provider === 'google' || item.provider === 'apple')
  const quickEnabledProviders = quickProviders.filter((item) => item.enabled)

  if (mode === 'welcome') {
    return (
      <div className="relative min-h-full overflow-hidden bg-[#fbf6ee]">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1495195134817-aeb325a55b65?auto=format&fit=crop&w=1200&q=85"
            alt="집밥이 놓인 식탁"
            className="h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-[#fbf6ee]/55" />
        </div>
        <div className="mobile-safe-top relative z-10 flex min-h-full flex-col px-6 pb-8">
          <div className="flex justify-center pt-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-[#ea5a1f] bg-[#fffaf3] text-[#ea5a1f] shadow-soft">
              <Home size={32} />
            </div>
          </div>
          <div className="mt-auto">
            <h1 className="text-center text-[34px] font-black tracking-tight text-[#2f2117]">집밥노트</h1>
            <p className="mt-3 text-center text-[15px] font-semibold leading-6 text-[#6f5b49]">
              오늘의 집밥을
              <br />
              더 맛있고 간편하게
            </p>
            <div className="mt-28 space-y-3">
              <Link href="/login" className="block rounded-[14px] bg-[#ea5a1f] py-4 text-center text-sm font-black text-white shadow-[0_10px_20px_rgba(234,90,31,0.24)]">
                로그인
              </Link>
              <Link href="/signup" className="block rounded-[14px] border border-[#ea5a1f] bg-[#fffaf3] py-4 text-center text-sm font-black text-[#d94d19]">
                회원가입
              </Link>
            </div>
            <Link href="/" className="mt-8 block text-center text-[12px] font-bold text-[#8f7f70]">
              둘러보기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isSignup = mode === 'signup'

  return (
    <div className="min-h-full bg-[#fbf6ee] px-5 pb-8">
      <section className="mobile-safe-top">
        <Link href="/welcome" className="flex h-9 w-9 items-center justify-center rounded-full text-[#2f2117]" aria-label="인증 시작 화면으로 돌아가기">
          <ArrowLeft size={20} />
        </Link>
      </section>

      <section className="pt-6">
        <h1 className="text-[22px] font-black text-[#2f2117]">{isSignup ? '회원가입' : '로그인'}</h1>
        <p className="mt-2 text-[13px] font-semibold text-[#8f7f70]">
          {isSignup ? '간단한 정보로 시작해요!' : '집밥노트에 오신 것을 환영해요!'}
        </p>
      </section>

      <section className="space-y-2 pt-6">
        {quickProviders.map((provider) =>
          provider.enabled ? (
            <AuthProviderButton
              key={provider.provider}
              disabled={signingIn}
              provider={provider.provider}
              onClick={() => {
                void signInWithProvider(provider.provider)
              }}
            />
          ) : (
            <div
              key={provider.provider}
              className="rounded-[12px] border border-dashed border-[#d8c6b3] bg-[#fffaf3] px-4 py-3 text-center text-sm font-bold text-[#8f7f70]"
            >
              {provider.label} 로그인 비활성화: {provider.disabledReason ?? '설정 상태를 확인해주세요.'}
            </div>
          ),
        )}
        {quickEnabledProviders.length === 0 ? (
          <p className="rounded-[12px] bg-[#fff0e4] px-4 py-3 text-center text-sm font-bold text-[#d94d19]">
            Google 또는 Apple OAuth 설정을 확인해주세요.
          </p>
        ) : null}
      </section>

      <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[12px] font-semibold text-[#8f7f70]">
        <span className="h-px bg-[#eadcc9]" />
        또는 이메일로 계속하기
        <span className="h-px bg-[#eadcc9]" />
      </div>

      <section className="space-y-3 pt-6">
        <AuthInput icon={<Mail size={16} />} placeholder="이메일 주소" />
        <AuthInput icon={<Lock size={16} />} placeholder="비밀번호" password />
        {isSignup ? (
          <>
            <AuthInput icon={<Lock size={16} />} placeholder="비밀번호 확인" password />
            <AuthInput icon={<UserRound size={16} />} placeholder="닉네임" />
          </>
        ) : null}
      </section>

      {isSignup ? (
        <section className="space-y-3 pt-5">
          <CheckboxLine text="이용약관 및 개인정보 처리방침에 동의합니다." />
          <CheckboxLine text="(선택) 마케팅 정보 수신에 동의합니다." />
        </section>
      ) : (
        <section className="flex items-center justify-between pt-5">
          <CheckboxLine text="로그인 상태 유지" />
          <Link href="/support" className="text-[12px] font-bold text-[#7d6d5f]">비밀번호 찾기</Link>
        </section>
      )}

      {error ? (
        <p className="mt-3 rounded-[12px] bg-[#fff0e4] px-4 py-3 text-sm font-semibold text-[#d94d19]">
          {error.message}
        </p>
      ) : null}

      <p className="mt-6 text-center text-[13px] font-semibold text-[#8f7f70]">
        {isSignup ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'}{' '}
        <Link href={isSignup ? '/login' : '/signup'} className="font-black text-[#d94d19]">
          {isSignup ? '로그인' : '회원가입'}
        </Link>
      </p>
    </div>
  )
}

function AuthInput({ icon, placeholder, password = false }: { icon: ReactNode; placeholder: string; password?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3.5">
      <span className="text-[#a69585]">{icon}</span>
      <input
        type={password ? 'password' : 'text'}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-semibold text-[#4b3929] outline-none placeholder:text-[#b5a493]"
      />
      {password ? <Eye size={16} className="text-[#a69585]" /> : null}
    </div>
  )
}

function CheckboxLine({ text }: { text: string }) {
  return (
    <label className="flex items-center gap-2 text-[12px] font-semibold text-[#7d6d5f]">
      <input type="checkbox" className="h-4 w-4 rounded border-[#d9c8b6] accent-[#ea5a1f]" />
      <span>{text}</span>
    </label>
  )
}
