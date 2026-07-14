// 이 파일은 Vercel Preview 자동화 우회 secret을 대상 배포 origin 요청에만 제한합니다.
const minimumSecretLength = 16;
const maximumSecretLength = 512;
const protectedHeaderNames = new Set([
  "x-vercel-protection-bypass",
  "x-vercel-set-bypass-cookie",
]);

export function parseVercelAutomationBypassSecret(value) {
  if (value === undefined || value === "") return null;
  if (value !== value.trim()) {
    throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET must not contain surrounding whitespace");
  }
  if (value.length < minimumSecretLength) {
    throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET must contain at least 16 characters");
  }
  if (value.length > maximumSecretLength || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET contains an invalid header value");
  }
  return value;
}

export function buildVercelBypassFetchPatterns(origin) {
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.origin !== origin) {
    throw new Error("Vercel automation bypass requires an exact origin");
  }
  if (parsedOrigin.protocol !== "https:") {
    throw new Error("Vercel automation bypass requires HTTPS");
  }
  if (!parsedOrigin.hostname.endsWith(".vercel.app")) {
    throw new Error("Vercel automation bypass is restricted to a vercel.app deployment origin");
  }
  return [{
    requestStage: "Request",
    urlPattern: `${origin}/*`,
  }];
}

export function buildVercelBypassRequestHeaders(requestHeaders, secret) {
  const preservedHeaders = Object.entries(requestHeaders)
    .filter(([name]) => !protectedHeaderNames.has(name.toLowerCase()))
    .map(([name, value]) => ({ name, value: String(value) }));

  return [
    ...preservedHeaders,
    { name: "x-vercel-protection-bypass", value: secret },
    { name: "x-vercel-set-bypass-cookie", value: "true" },
  ];
}
