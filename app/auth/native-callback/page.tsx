"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  buildNativeAuthCallbackUrl,
  normalizeAuthNextPath,
} from "@/lib/auth-redirect";

function NativeCallbackContent() {
  const searchParams = useSearchParams();
  const hasStartedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nativeCallbackUrl = useMemo(() => {
    const nextPath = normalizeAuthNextPath(searchParams.get("next"));
    const callbackUrl = new URL(buildNativeAuthCallbackUrl(nextPath));

    for (const key of ["code", "error", "error_description"] as const) {
      const value = searchParams.get(key);
      if (value) {
        callbackUrl.searchParams.set(key, value);
      }
    }

    if (!callbackUrl.searchParams.has("code") && !callbackUrl.searchParams.has("error")) {
      callbackUrl.searchParams.set("error", "missing_oauth_code");
    }

    return callbackUrl.toString();
  }, [searchParams]);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    const timer = window.setTimeout(() => {
      setErrorMessage("앱으로 로그인 결과를 넘기지 못했습니다. 앱으로 돌아가 다시 시도해주세요.");
    }, 2500);

    window.location.replace(nativeCallbackUrl);

    return () => {
      window.clearTimeout(timer);
    };
  }, [nativeCallbackUrl]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      {errorMessage ? (
        <div className="w-full max-w-sm rounded-3xl bg-white px-5 py-6 shadow-soft">
          <p className="text-base font-bold text-gray-800">앱으로 돌아가지 못했습니다.</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">{errorMessage}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/login" className="rounded-full bg-mint-100 px-4 py-2 text-sm font-bold text-mint-600">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-white px-6 py-8 shadow-soft">
          <LoaderCircle size={28} className="mx-auto animate-spin text-mint-500" />
          <p className="mt-4 text-base font-bold text-gray-800">앱으로 돌아가는 중입니다</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">로그인 결과를 집밥노트 앱에 전달합니다.</p>
        </div>
      )}
    </div>
  );
}

export default function NativeCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
          <div className="rounded-3xl bg-white px-6 py-8 shadow-soft">
            <LoaderCircle size={28} className="mx-auto animate-spin text-mint-500" />
            <p className="mt-4 text-base font-bold text-gray-800">앱으로 돌아가는 중입니다</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">로그인 결과를 준비하고 있습니다.</p>
          </div>
        </div>
      }
    >
      <NativeCallbackContent />
    </Suspense>
  );
}
