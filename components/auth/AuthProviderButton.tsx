// 이 파일은 소셜 로그인 버튼을 브랜드 스타일에 맞춰 렌더링합니다.
"use client";

import type { OAuthProvider } from "@/types";

type AuthProviderButtonProps = {
  provider: OAuthProvider;
  disabled?: boolean;
  onClick: () => void;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.72-1.58 2.68-3.92 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.33-1.58-5.04-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3 2.33c.7-2.12 2.7-3.7 5.04-3.7Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M16.37 12.06c.02 2.23 1.95 2.98 1.97 2.99-.02.05-.3 1.03-.98 2.05-.59.88-1.2 1.76-2.17 1.78-.94.02-1.24-.56-2.32-.56-1.08 0-1.42.54-2.3.58-.93.03-1.64-.93-2.24-1.81-1.22-1.76-2.16-4.98-.9-7.17.62-1.09 1.74-1.78 2.95-1.8.92-.02 1.78.62 2.32.62.54 0 1.56-.77 2.64-.66.45.02 1.72.18 2.53 1.36-.06.04-1.5.88-1.48 2.62Zm-2.09-4.69c.49-.6.82-1.43.73-2.26-.7.03-1.56.47-2.07 1.06-.46.53-.86 1.37-.75 2.18.78.06 1.59-.4 2.09-.98Z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M12 4c-4.97 0-9 3.15-9 7.03 0 2.46 1.62 4.63 4.07 5.88l-.83 3.04a.47.47 0 0 0 .71.52l3.65-2.42c.46.05.93.08 1.41.08 4.97 0 9-3.15 9-7.1C21 7.15 16.97 4 12 4Z" />
    </svg>
  );
}

export default function AuthProviderButton({
  provider,
  disabled = false,
  onClick,
}: AuthProviderButtonProps) {
  if (provider === "google") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-3 text-sm font-bold text-[#2f2117] shadow-soft transition-colors hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        <span>Google로 계속하기</span>
      </button>
    );
  }

  if (provider === "apple") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex w-full items-center justify-center gap-3 rounded-[12px] bg-black px-4 py-3 text-sm font-bold text-white shadow-soft transition-colors hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <AppleIcon />
        <span>Apple로 계속하기</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-[12px] bg-[#FEE500] px-4 py-3 text-sm font-bold text-[#191919] shadow-soft transition-colors hover:bg-[#f7dc00] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <KakaoIcon />
      <span>카카오로 시작하기</span>
    </button>
  );
}
