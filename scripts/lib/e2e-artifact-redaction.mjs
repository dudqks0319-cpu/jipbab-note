// 이 파일은 브라우저 E2E artifact에서 비밀값, 개인정보, query와 로컬 경로를 제거합니다.
const REDACTED = "[REDACTED]";
const SENSITIVE_KEY = /^(authorization|cookie|set-cookie|token|email|query|headers?)$/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const TOKEN_ASSIGNMENT = /\b(token|secret|password)=([^\s&]+)/gi;
const UNIX_ABSOLUTE_PATH = /(^|[\s"'])\/(Users|home|private|tmp|var)\/[^\s"']+/g;
const WINDOWS_ABSOLUTE_PATH = /\b[A-Za-z]:\\(?:[^\\\s"']+\\)*[^\\\s"']+/g;

function redactUrl(value) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.hash = "";
    if (url.search) url.search = `?${REDACTED}`;
    return url.toString();
  } catch {
    return value;
  }
}

function redactString(value) {
  const urlRedacted = /^https?:\/\//i.test(value) ? redactUrl(value) : value;
  return urlRedacted
    .replace(EMAIL, REDACTED)
    .replace(BEARER, `Bearer ${REDACTED}`)
    .replace(TOKEN_ASSIGNMENT, `$1=${REDACTED}`)
    .replace(UNIX_ABSOLUTE_PATH, `$1${REDACTED}`)
    .replace(WINDOWS_ABSOLUTE_PATH, REDACTED);
}

export function redactE2EArtifact(value, key = "") {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactE2EArtifact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactE2EArtifact(entryValue, entryKey),
      ]),
    );
  }
  return value;
}
