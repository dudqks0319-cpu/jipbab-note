// 이 파일은 로그인/회원가입/웰컴 화면의 공통 인증 UI를 담당합니다.
'use client'

import Image from 'next/image'
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

type AuthFieldErrors = {
  email?: string
  password?: string
  passwordConfirm?: string
  terms?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

export default function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter()
  const { providers, signingIn, error, signInWithProvider, signInWithEmail, signUpWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const quickProviders = providers.filter((item) => item.enabled)

  if (mode === 'welcome') {
    return (
      <div className="relative min-h-full overflow-hidden bg-[#fbf6ee]">
        <div className="absolute inset-0">
          <Image
            src="/images/recipes/jipbab-curated/doenjang-jjigae-basic.png"
            alt="집밥이 놓인 식탁"
            fill
            sizes="(max-width: 430px) 100vw, 430px"
            preload
            className="object-cover opacity-45"
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
    setFieldErrors({})
    setSuccessMessage(null)

    const trimmedEmail = email.trim()
    const nextErrors: AuthFieldErrors = {}

    if (!trimmedEmail) {
      nextErrors.email = '이메일을 입력해주세요.'
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = '올바른 이메일 형식으로 입력해주세요.'
    }

    if (!password) {
      nextErrors.password = '비밀번호를 입력해주세요.'
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상 입력해주세요.`
    }

    if (isSignup && passwordConfirm && password !== passwordConfirm) {
      nextErrors.passwordConfirm = '비밀번호가 서로 일치하지 않습니다.'
    } else if (isSignup && !passwordConfirm) {
      nextErrors.passwordConfirm = '비밀번호 확인을 입력해주세요.'
    }

    if (isSignup && !acceptedTerms) {
      nextErrors.terms = '이용약관 및 개인정보 처리방침에 동의해 주세요.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFormError(Object.values(nextErrors)[0] ?? '입력값을 확인해주세요.')
      return
    }

    if (isSignup) {
      const result = await signUpWithEmail(trimmedEmail, password, nickname)
      if (!result.ok) {
        return
      }

      if (result.requiresEmailConfirmation) {
        setSuccessMessage('인증 메일을 보냈습니다. 메일에서 확인을 완료한 뒤 로그인해주세요.')
        return
      }

      setSuccessMessage('회원가입이 완료되어 로그인되었습니다.')
      router.push('/mypage')
      return
    }

    const result = await signInWithEmail(trimmedEmail, password)
    if (result.ok) {
      setSuccessMessage('로그인되었습니다.')
      router.push('/mypage')
    }
  }

  return (
    <div className="min-h-full bg-[#fbf6ee] px-5 pb-8">
      <section className="mobile-safe-top">
        <Link href="/welcome" className="flex h-11 w-11 items-center justify-center rounded-full text-[#2f2117]" aria-label="인증 시작 화면으로 돌아가기">
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
        {quickProviders.map((provider) => (
          <AuthProviderButton
            key={provider.provider}
            disabled={signingIn}
            provider={provider.provider}
            onClick={() => {
              void signInWithProvider(provider.provider)
            }}
          />
        ))}
        {quickProviders.length === 0 ? (
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

      <form className="space-y-3 pt-6" onSubmit={handleEmailSubmit} noValidate>
        <AuthInput
          icon={<Mail size={16} />}
          placeholder="이메일 주소"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value)
            setFieldErrors((prev) => ({ ...prev, email: undefined }))
          }}
          autoComplete="email"
          error={fieldErrors.email}
        />
        <AuthInput
          icon={<Lock size={16} />}
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(value) => {
            setPassword(value)
            setFieldErrors((prev) => ({ ...prev, password: undefined }))
          }}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          error={fieldErrors.password}
        />
        {isSignup ? (
          <>
            <AuthInput
              icon={<Lock size={16} />}
              placeholder="비밀번호 확인"
              type="password"
              value={passwordConfirm}
              onChange={(value) => {
                setPasswordConfirm(value)
                setFieldErrors((prev) => ({ ...prev, passwordConfirm: undefined }))
              }}
              autoComplete="new-password"
              error={fieldErrors.passwordConfirm}
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
                onChange={(checked) => {
                  setAcceptedTerms(checked)
                  setFieldErrors((prev) => ({ ...prev, terms: undefined }))
                }}
                required
              />
              {fieldErrors.terms ? (
                <p className="rounded-[12px] bg-[#fff0e4] px-3 py-2 text-[12px] font-bold text-[#d94d19]">
                  {fieldErrors.terms}
                </p>
              ) : null}
            <CheckboxLine text="(선택) 마케팅 정보 수신에 동의합니다." />
          </section>
        ) : (
          <section className="flex items-center justify-between pt-2">
            <CheckboxLine text="로그인 상태 유지" />
            <Link href="/reset-password" className="text-[12px] font-bold text-[#7d6d5f]">비밀번호 찾기</Link>
          </section>
        )}

        {authErrorMessage ? (
          <p className="rounded-[12px] bg-[#fff0e4] px-4 py-3 text-sm font-bold text-[#d94d19]" role="alert">
            {authErrorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={signingIn}
          className="mt-2 w-full rounded-[14px] bg-[#ea5a1f] py-4 text-center text-sm font-black text-white shadow-[0_10px_20px_rgba(234,90,31,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingIn ? '처리 중...' : isSignup ? '이메일로 회원가입' : '이메일로 로그인'}
        </button>
      </form>

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
  error,
}: {
  icon: ReactNode
  placeholder: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  error?: string
}) {
  return (
    <div>
      <div className={`flex items-center gap-2 rounded-[12px] border bg-[#fffaf3] px-3 py-3.5 ${
        error ? 'border-[#ea5a1f] ring-2 ring-[#fff0e4]' : 'border-[#eadcc9]'
      }`}>
        <span className="text-[#a69585]">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          className="w-full bg-transparent text-sm font-semibold text-[#4b3929] outline-none placeholder:text-[#b5a493]"
        />
        {type === 'password' ? <Eye size={16} className="text-[#a69585]" /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 rounded-[10px] bg-[#fff0e4] px-3 py-2 text-[12px] font-bold text-[#d94d19]" role="alert">
          {error}
        </p>
      ) : null}
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
