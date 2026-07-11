// 서버 API에서 신뢰 가능한 네트워크 키를 우선 사용해 rate limit 우회를 줄입니다.
const MAX_DEVICE_ID_LENGTH = 96;
const DEVICE_ID_PATTERN = /^[0-9A-Za-z._:-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstForwardedIp(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

function normalizeDeviceId(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > MAX_DEVICE_ID_LENGTH || !DEVICE_ID_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function getRateLimitKey(request: Request): string {
  const forwardedFor = firstForwardedIp(request.headers.get("x-forwarded-for"));
  const realIp = request.headers.get("x-real-ip")?.trim() || null;
  const ip = forwardedFor ?? realIp;
  const deviceId = normalizeDeviceId(request.headers.get("x-device-id"));

  if (ip) {
    return `ip:${ip}`;
  }
  if (deviceId) {
    return `device:${deviceId}`;
  }

  const userAgent = request.headers.get("user-agent")?.trim() ?? "unknown-ua";
  return `ua:${userAgent.slice(0, 120)}`;
}

export function normalizeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }
    if (url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function isUuidLike(value: string | null | undefined): value is string {
  return UUID_PATTERN.test(value?.trim() ?? "");
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type BoundedJsonObjectResult =
  | { status: "ok"; value: Record<string, unknown> }
  | { status: "invalid" }
  | { status: "too_large" };

export async function readBoundedJsonObject(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonObjectResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError("maxBytes must be a positive safe integer");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    return { status: "too_large" };
  }
  if (!request.body) {
    return { status: "invalid" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { status: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { status: "invalid" };
  }

  const payload = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(payload);
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { status: "invalid" };
    }
    return { status: "ok", value: value as Record<string, unknown> };
  } catch {
    return { status: "invalid" };
  }
}

export function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store",
  };
}
