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
