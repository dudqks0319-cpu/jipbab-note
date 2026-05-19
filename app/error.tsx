// 이 파일은 앱 전역에서 발생한 예외를 사용자 친화적으로 안내합니다.
"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

const isProduction = process.env.NODE_ENV === "production";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="bg-[#f3efe7]">
        <div className="mx-auto flex min-h-screen max-w-[430px] items-center px-5">
          <div className="w-full rounded-[2rem] bg-white px-5 py-8 text-center shadow-soft">
            <AlertTriangle size={34} className="mx-auto text-rose-500" />
            <h1 className="mt-4 text-xl font-bold text-gray-800">문제가 발생했습니다</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              잠시 후 다시 시도해 주세요. 같은 문제가 반복되면 문의하기 메뉴로 알려주시면 빠르게 확인하겠습니다.
            </p>
            <p className="mt-3 text-xs text-gray-400">
              {isProduction
                ? error.digest
                  ? `오류 코드: ${error.digest}`
                  : "오류 세부 정보는 안전을 위해 숨겼습니다."
                : error.message}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-mint-100 px-4 py-2 text-sm font-bold text-mint-600"
              >
                <RefreshCw size={14} />
                다시 시도
              </button>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600"
              >
                문의하기
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
