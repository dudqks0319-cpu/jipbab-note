// 이 파일은 OAuth 완료 후 이동할 내부 경로만 허용합니다.
const REDIRECT_BASE = "https://jipbab-note.local";

export function normalizeAuthNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/mypage";
  }

  const parsed = new URL(value, REDIRECT_BASE);
  if (parsed.origin !== REDIRECT_BASE) {
    return "/mypage";
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function buildAuthCallbackUrl(origin: string, nextPath = "/mypage"): string {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", normalizeAuthNextPath(nextPath));
  return callbackUrl.toString();
}

export function buildNativeAuthCallbackUrl(nextPath = "/mypage"): string {
  const callbackUrl = new URL("com.jipbab.note://auth/callback");
  callbackUrl.searchParams.set("next", normalizeAuthNextPath(nextPath));
  return callbackUrl.toString();
}

export function buildNativeAuthBridgeUrl(origin: string, nextPath = "/mypage"): string {
  const bridgeUrl = new URL("/auth/native-callback", origin);
  bridgeUrl.searchParams.set("next", normalizeAuthNextPath(nextPath));
  return bridgeUrl.toString();
}

export function isNativeAuthCallbackUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "com.jipbab.note:" && parsed.hostname === "auth" && parsed.pathname === "/callback";
  } catch {
    return false;
  }
}

export function buildEmailConfirmationRedirectUrl(origin: string): string {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("verified", "email");
  return loginUrl.toString();
}

export function buildPasswordResetRedirectUrl(origin: string): string {
  return new URL("/reset-password", origin).toString();
}
