// 이 파일은 URL 쿼리 기반의 앱스토어 데모 모드를 판별합니다.
"use client";

import { useEffect, useState } from "react";

export type DemoModeState = {
  isDemoMode: boolean;
  ready: boolean;
};

export function useDemoModeState(): DemoModeState {
  const [state, setState] = useState<DemoModeState>({ isDemoMode: false, ready: false });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setState({ isDemoMode: params.get("demo") === "appstore", ready: true });
  }, []);

  return state;
}

export function useDemoMode(): boolean {
  return useDemoModeState().isDemoMode;
}
