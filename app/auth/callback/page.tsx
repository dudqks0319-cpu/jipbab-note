// 이 파일은 Supabase OAuth 로그인 후 코드를 세션으로 교환하는 콜백 화면입니다.
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";

function normalizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/mypage";
  }
  return value;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasStartedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    const code = searchParams.get("code");
    const next = normalizeNextPath(searchParams.get("next"));

    if (!code) {
      setErrorMessage("로그인 승인 코드를 찾지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    const run = async () => {
      try {
        const client = getSupabaseClient();
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          throw error;
        }
        router.replace(next);
      } catch (caught) {
        setErrorMessage(caught instanceof Error ? caught.message : "로그인 처리 중 오류가 발생했습니다.");
      }
    };

    void run();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      {errorMessage ? (
        <div className="w-full max-w-sm rounded-3xl bg-white px-5 py-6 shadow-soft">
          <p className="text-base font-bold text-gray-800">로그인을 완료하지 못했습니다.</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">{errorMessage}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/mypage" className="rounded-full bg-mint-100 px-4 py-2 text-sm font-bold text-mint-600">
              마이페이지로 이동
            </Link>
            <Link href="/support" className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600">
              문의하기
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-white px-6 py-8 shadow-soft">
          <LoaderCircle size={28} className="mx-auto animate-spin text-mint-500" />
          <p className="mt-4 text-base font-bold text-gray-800">로그인 연결 중입니다</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">Supabase 세션을 연결한 뒤 원래 화면으로 돌아갑니다.</p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
          <div className="rounded-3xl bg-white px-6 py-8 shadow-soft">
            <LoaderCircle size={28} className="mx-auto animate-spin text-mint-500" />
            <p className="mt-4 text-base font-bold text-gray-800">로그인 연결 중입니다</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">세션 정보를 확인하는 중입니다.</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
