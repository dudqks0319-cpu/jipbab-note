// 이 파일은 URL 쿼리 기반의 앱스토어 데모 모드를 판별합니다.
"use client";

import { useMemo } from "react";

export function useDemoMode(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("demo") === "appstore";
  }, []);
}
