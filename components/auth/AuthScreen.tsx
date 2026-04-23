// 이 파일은 로그인/회원가입/웰컴 화면의 공통 인증 UI를 담당합니다.
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { ArrowLeft, Eye, Home, Lock, Mail, UserRound } from 'lucide-react'

import AuthProviderButton from '@/components/auth/AuthProviderButton'
import { useAuth } from '@/hooks/useAuth'

type AuthScreenProps = {
  mode: 'welcome' | 'login' | 'signup'
}

export default function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter()
  const { providers, signingIn, error, signInWithProvider, signInWithEmail, signUpWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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
  const authErrorMessage = formError ?? error?.message ?? null

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setFormError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    if (isSignup && password !== passwordConfirm) {
      setFormError('비밀번호가 서로 일치하지 않습니다.')
      return
    }

    if (isSignup && !acceptedTerms) {
      setFormError('이용약관 및 개인정보 처리방침에 동의해 주세요.')
      return
    }

    const succeeded = isSignup
      ? await signUpWithEmail(trimmedEmail, password, nickname)
      : await signInWithEmail(trimmedEmail, password)

    if (succeeded) {
      setSuccessMessage(isSignup ? '회원가입이 완료되었습니다. 메일 확인이 필요한 경우 받은편지함을 확인해주세요.' : '로그인되었습니다.')
      if (!isSignup) {
        router.push('/mypage')
      }
    }
  }

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
              {provider.userDisabledReason ?? '지금은 소셜 로그인을 사용할 수 없습니다. 이메일로 계속해주세요.'}
            </div>
          ),
        )}
        {quickEnabledProviders.length === 0 ? (
          <p className="rounded-[12px] bg-[#fff0e4] px-4 py-3 text-center text-sm font-bold text-[#d94d19]">
            지금은 소셜 로그인을 사용할 수 없습니다. 아래 이메일로 계속해주세요.
          </p>
        ) : null}
      </section>

      <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[12px] font-semibold text-[#8f7f70]">
        <span className="h-px bg-[#eadcc9]" />
        또는 이메일로 계속하기
        <span className="h-px bg-[#eadcc9]" />
      </div>

      <form className="space-y-3 pt-6" onSubmit={handleEmailSubmit}>
        <AuthInput
          icon={<Mail size={16} />}
          placeholder="이메일 주소"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthInput
          icon={<Lock size={16} />}
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
        />
        {isSignup ? (
          <>
            <AuthInput
              icon={<Lock size={16} />}
              placeholder="비밀번호 확인"
              type="password"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              autoComplete="new-password"
            />
            <AuthInput
              icon={<UserRound size={16} />}
              placeholder="닉네임"
              value={nickname}
              onChange={setNickname}
              autoComplete="nickname"
            />
          </>
        ) : null}

        {isSignup ? (
          <section className="space-y-3 pt-2">
            <CheckboxLine
              text="이용약관 및 개인정보 처리방침에 동의합니다."
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              required
            />
            <CheckboxLine text="(선택) 마케팅 정보 수신에 동의합니다." />
          </section>
        ) : (
          <section className="flex items-center justify-between pt-2">
            <CheckboxLine text="로그인 상태 유지" />
            <Link href="/support" className="text-[12px] font-bold text-[#7d6d5f]">비밀번호 찾기</Link>
          </section>
        )}

        <button
          type="submit"
          disabled={signingIn}
          className="mt-2 w-full rounded-[14px] bg-[#ea5a1f] py-4 text-center text-sm font-black text-white shadow-[0_10px_20px_rgba(234,90,31,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingIn ? '처리 중...' : isSignup ? '이메일로 회원가입' : '이메일로 로그인'}
        </button>
      </form>

      {authErrorMessage ? (
        <p className="mt-3 rounded-[12px] bg-[#fff0e4] px-4 py-3 text-sm font-semibold text-[#d94d19]">
          {authErrorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-3 rounded-[12px] bg-[#eef9ef] px-4 py-3 text-sm font-semibold text-[#257a3e]">
          {successMessage}
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

function AuthInput({
  icon,
  placeholder,
  type = 'text',
  value,
  onChange,
  autoComplete,
}: {
  icon: ReactNode
  placeholder: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3.5">
      <span className="text-[#a69585]">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={type !== 'text'}
        className="w-full bg-transparent text-sm font-semibold text-[#4b3929] outline-none placeholder:text-[#b5a493]"
      />
      {type === 'password' ? <Eye size={16} className="text-[#a69585]" /> : null}
    </div>
  )
}

function CheckboxLine({
  text,
  checked,
  onChange,
  required = false,
}: {
  text: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  required?: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] font-semibold text-[#7d6d5f]">
      <input
        type="checkbox"
        checked={checked}
        required={required}
        onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
        className="h-4 w-4 rounded border-[#d9c8b6] accent-[#ea5a1f]"
      />
      <span>{text}</span>
    </label>
  )
}
