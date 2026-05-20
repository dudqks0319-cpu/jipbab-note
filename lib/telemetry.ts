// 이 파일은 운영 로그에 민감정보가 남지 않도록 가벼운 텔레메트리 도우미를 제공합니다.

export type TelemetryLevel = "debug" | "info" | "warn" | "error";

export type TelemetryEvent = {
  event: string;
  level: TelemetryLevel;
  timestamp: string;
  metadata?: unknown;
};

export type TelemetrySink = {
  debug?: (message?: unknown, ...optionalParams: unknown[]) => void;
  info?: (message?: unknown, ...optionalParams: unknown[]) => void;
  warn?: (message?: unknown, ...optionalParams: unknown[]) => void;
  error?: (message?: unknown, ...optionalParams: unknown[]) => void;
};

export const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_KEY_MARKERS = [
  "authorization",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "password",
  "passwd",
  "privatekey",
  "secret",
  "servicerole",
  "session",
  "token",
  "jwt",
  "cookie",
];

const MAX_REDACTION_DEPTH = 8;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = normalizeKey(key);
  return SENSITIVE_KEY_MARKERS.some((marker) => normalizedKey.includes(marker));
}

function redactString(value: string): string {
  return value
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${REDACTED_VALUE}`)
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED_VALUE)
    .replace(
      /\b(password|passwd|secret|token|api[_-]?key|access[_-]?token|refresh[_-]?token|session)=([^&\s]+)/gi,
      `$1=${REDACTED_VALUE}`,
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED_VALUE);
}

function redactObject(value: object, seen: WeakSet<object>, depth: number): unknown {
  if (seen.has(value)) {
    return "[Circular]";
  }

  if (depth >= MAX_REDACTION_DEPTH) {
    return "[MaxDepth]";
  }

  seen.add(value);

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, seen, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED_VALUE : redactSensitiveData(item, seen, depth + 1),
    ]),
  );
}

export function redactSensitiveData(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return redactObject(value, seen, depth);
}

export function buildTelemetryEvent(
  level: TelemetryLevel,
  event: string,
  metadata?: unknown,
): TelemetryEvent {
  return {
    event,
    level,
    timestamp: new Date().toISOString(),
    ...(metadata === undefined ? {} : { metadata: redactSensitiveData(metadata) }),
  };
}

export function logTelemetry(
  level: TelemetryLevel,
  event: string,
  metadata?: unknown,
  sink: TelemetrySink = console,
): TelemetryEvent {
  const payload = buildTelemetryEvent(level, event, metadata);
  const write = sink[level] ?? sink.info ?? sink.warn;

  write?.(`[${level}] ${event}`, payload);

  return payload;
}
