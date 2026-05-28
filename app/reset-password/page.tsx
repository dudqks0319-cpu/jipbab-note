// 이 파일은 이메일 비밀번호 재설정 요청과 새 비밀번호 저장 화면을 담당합니다.
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, KeyRound, LoaderCircle, Mail } from "lucide-react";

import { buildPasswordResetRedirectUrl } from "@/lib/auth-redirect";
import { getSupabaseClient } from "@/lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function getSafeResetErrorMessage(caught: unknown): string {
  const message = caught instanceof Error ? caught.message.toLowerCase() : "";
  if (message.includes("expired") || message.includes("invalid")) {
    return "비밀번호 변경 링크가 만료되었습니다. 다시 요청해주세요.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "네트워크 연결을 확인한 뒤 다시 시도해주세요.";
  }
  return "비밀번호 재설정을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

function readHashSessionParams(): { accessToken: string; refreshToken: string } | null {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [canUpdatePassword, setCanUpdatePassword] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const code = searchParams.get("code");
    const providerError = searchParams.get("error") ?? searchParams.get("error_description");
    const hashSession = readHashSessionParams();

    if (providerError) {
      setErrorMessage("비밀번호 변경 링크를 확인하지 못했습니다. 다시 요청해주세요.");
      return;
    }

    if (!code && !hashSession) {
      return;
    }

    const connectRecoverySession = async () => {
      setCheckingLink(true);
      setErrorMessage(null);
      try {
        const client = getSupabaseClient();
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } else if (hashSession) {
          const { error } = await client.auth.setSession({
            access_token: hashSession.accessToken,
            refresh_token: hashSession.refreshToken,
          });
          if (error) {
            throw error;
          }
          window.history.replaceState(null, "", window.location.pathname);
        }
        setCanUpdatePassword(true);
        setMessage("새 비밀번호를 입력해주세요.");
      } catch (caught) {
        setCanUpdatePassword(false);
        setErrorMessage(getSafeResetErrorMessage(caught));
      } finally {
        setCheckingLink(false);
      }
    };

    void connectRecoverySession();
  }, [searchParams]);

  const requestResetEmail = async () => {
    const trimmedEmail = email.trim();
    setMessage(null);
    setErrorMessage(null);

    if (!trimmedEmail) {
      setErrorMessage("이메일을 입력해주세요.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setErrorMessage("올바른 이메일 형식으로 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const client = getSupabaseClient();
      const redirectTo = buildPasswordResetRedirectUrl(window.location.origin);
      const { error } = await client.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
      if (error) {
        throw error;
      }
      setMessage("비밀번호 변경 링크를 보냈습니다. 메일함에서 링크를 열어주세요.");
    } catch (caught) {
      setErrorMessage(getSafeResetErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const updatePassword = async () => {
    setMessage(null);
    setErrorMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상 입력해주세요.`);
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      setMessage("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
      setPassword("");
      setPasswordConfirm("");
      window.setTimeout(() => router.push("/login"), 800);
    } catch (caught) {
      setErrorMessage(getSafeResetErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#fbf6ee] px-5 pb-8">
      <section className="mobile-safe-top">
        <Link href="/login" className="flex h-9 w-9 items-center justify-center rounded-full text-[#2f2117]" aria-label="로그인으로 돌아가기">
          <ArrowLeft size={20} />
        </Link>
      </section>

      <section className="pt-6">
        <h1 className="text-[22px] font-black text-[#2f2117]">비밀번호 찾기</h1>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-[#8f7f70]">
          가입한 이메일로 변경 링크를 받고, 링크를 연 뒤 새 비밀번호를 설정하세요.
        </p>
      </section>

      <section className="jipbab-panel mt-6 rounded-[16px] p-4">
        {checkingLink ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-[#7d6d5f]">
            <LoaderCircle size={18} className="animate-spin" />
            재설정 링크 확인 중
          </div>
        ) : canUpdatePassword ? (
          <div className="space-y-3">
            <PasswordInput value={password} onChange={setPassword} placeholder="새 비밀번호" />
            <PasswordInput value={passwordConfirm} onChange={setPasswordConfirm} placeholder="새 비밀번호 확인" />
            <button
              type="button"
              onClick={updatePassword}
              disabled={submitting}
              className="w-full rounded-[14px] bg-[#ea5a1f] py-4 text-sm font-black text-white disabled:opacity-60"
            >
              {submitting ? "변경 중..." : "새 비밀번호 저장"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3.5">
              <Mail size={16} className="text-[#a69585]" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="이메일 주소"
                className="w-full bg-transparent text-sm font-semibold text-[#4b3929] outline-none placeholder:text-[#b5a493]"
              />
            </div>
            <button
              type="button"
              onClick={requestResetEmail}
              disabled={submitting}
              className="w-full rounded-[14px] bg-[#ea5a1f] py-4 text-sm font-black text-white disabled:opacity-60"
            >
              {submitting ? "보내는 중..." : "비밀번호 변경 링크 받기"}
            </button>
          </div>
        )}

        {message ? (
          <p className="mt-3 rounded-[12px] bg-[#eef9ef] px-4 py-3 text-sm font-semibold text-[#257a3e]">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 rounded-[12px] bg-[#fff0e4] px-4 py-3 text-sm font-bold text-[#d94d19]" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-3 py-3.5">
      <KeyRound size={16} className="text-[#a69585]" />
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="new-password"
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-semibold text-[#4b3929] outline-none placeholder:text-[#b5a493]"
      />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#fbf6ee] text-sm font-bold text-[#7d6d5f]">
          비밀번호 재설정 화면을 여는 중입니다.
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
