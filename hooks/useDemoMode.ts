// 이 파일은 URL 쿼리 기반의 앱스토어 데모 모드를 판별합니다.
"use client";

import { useEffect, useState } from "react";

export function useDemoMode(): boolean {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDemoMode(params.get("demo") === "appstore");
  }, []);

  return isDemoMode;
}
