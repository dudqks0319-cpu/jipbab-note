const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_RETRY_MAX_DELAY_MS = 1_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 5_000;

const CLIENT_REQUEST_ID_PATTERN = /^[0-9A-Za-z._:-]{1,128}$/;
const API_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const SAFE_MESSAGE_PATTERN = /^[^\u0000-\u001f\u007f]{1,240}$/;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 502, 503, 504]);

export interface ApiRetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly retryAfter: number | null;
  readonly retryable: boolean;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    requestId?: string | null;
    retryAfter?: number | null;
    retryable?: boolean;
  }) {
    super(options.message);
    this.name = "ApiClientError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId ?? null;
    this.retryAfter = options.retryAfter ?? null;
    this.retryable = options.retryable ?? RETRYABLE_STATUS_CODES.has(options.status);
  }
}

type ApiDataParser<T> = (value: unknown, requestId: string | null) => T;

export interface ApiDataRequestOptions<T> {
  method?: "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  json?: unknown;
  bearerToken?: string | null;
  clientRequestId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  retry?: boolean | Partial<ApiRetryPolicy>;
  cache?: RequestCache;
  invalidResponseMessage?: string;
  parseData: ApiDataParser<T>;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeRequestId(value: unknown): string | null {
  return typeof value === "string" && CLIENT_REQUEST_ID_PATTERN.test(value) ? value : null;
}

function safeErrorCode(value: unknown): string {
  return typeof value === "string" && API_ERROR_CODE_PATTERN.test(value)
    ? value
    : "INTERNAL_ERROR";
}

function safeErrorMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return SAFE_MESSAGE_PATTERN.test(trimmed) ? trimmed : fallback;
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value ?? fallback), min), max);
}

function resolveTimeoutMs(value: number | undefined): number {
  return boundedInteger(value, DEFAULT_TIMEOUT_MS, 1, MAX_TIMEOUT_MS);
}

function resolveRetryPolicy(
  method: string,
  retry: ApiDataRequestOptions<unknown>["retry"],
): ApiRetryPolicy {
  const defaultsToRetry = method === "GET" || method === "HEAD";
  if (retry === false || (retry === undefined && !defaultsToRetry)) {
    return { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 };
  }
  const overrides = retry && typeof retry === "object" ? retry : {};
  const maxRetries = boundedInteger(
    overrides.maxRetries,
    DEFAULT_MAX_RETRIES,
    0,
    MAX_RETRIES,
  );
  const baseDelayMs = boundedInteger(
    overrides.baseDelayMs,
    DEFAULT_RETRY_BASE_DELAY_MS,
    0,
    MAX_RETRY_DELAY_MS,
  );
  const maxDelayMs = boundedInteger(
    overrides.maxDelayMs,
    DEFAULT_RETRY_MAX_DELAY_MS,
    0,
    MAX_RETRY_DELAY_MS,
  );
  return {
    maxRetries,
    baseDelayMs: Math.min(baseDelayMs, maxDelayMs),
    maxDelayMs,
  };
}

function createClientRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function resolveClientRequestId(value: string | undefined): string {
  if (value === undefined) return createClientRequestId();
  if (!CLIENT_REQUEST_ID_PATTERN.test(value)) {
    throw new TypeError("clientRequestId must be a bounded correlation identifier");
  }
  return value;
}

function resolveHeaders(
  options: ApiDataRequestOptions<unknown>,
  clientRequestId: string,
): Headers {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  headers.set("X-Client-Request-Id", clientRequestId);
  if (options.json !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = options.bearerToken?.trim();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

function parseRetryAfter(response: Response): number | null {
  const value = response.headers.get("retry-after")?.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null;
  }
  const dateMs = Date.parse(value);
  if (!Number.isFinite(dateMs)) return null;
  const seconds = Math.ceil((dateMs - Date.now()) / 1000);
  return seconds > 0 ? seconds : null;
}

async function readJson(response: Response, signal: AbortSignal): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  }
}

function responseRequestId(
  response: Response,
  payload: Record<string, unknown> | null,
): string | null {
  const meta = asObject(payload?.meta);
  const error = asObject(payload?.error);
  return safeRequestId(response.headers.get("x-request-id"))
    ?? safeRequestId(meta?.requestId)
    ?? safeRequestId(error?.requestId);
}

function responseError(
  response: Response,
  payload: Record<string, unknown> | null,
): ApiClientError {
  const error = asObject(payload?.error);
  return new ApiClientError({
    code: safeErrorCode(error?.code),
    message: safeErrorMessage(error?.message, "요청을 처리하지 못했습니다."),
    status: response.status,
    requestId: responseRequestId(response, payload),
    retryAfter: parseRetryAfter(response),
  });
}

function callerAbortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("Aborted", "AbortError");
}

function createAttemptSignal(callerSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort(callerSignal ? callerAbortReason(callerSignal) : undefined);
  callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
  if (callerSignal?.aborted) onCallerAbort();
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    },
  };
}

function retryDelayMs(
  error: ApiClientError,
  completedAttempts: number,
  policy: ApiRetryPolicy,
): number | null {
  if (!error.retryable || completedAttempts > policy.maxRetries) return null;
  if (error.retryAfter !== null) {
    const requestedDelayMs = error.retryAfter * 1000;
    return requestedDelayMs <= policy.maxDelayMs ? requestedDelayMs : null;
  }
  return Math.min(policy.baseDelayMs * 2 ** Math.max(completedAttempts - 1, 0), policy.maxDelayMs);
}

async function waitForRetry(delayMs: number, signal: AbortSignal | undefined): Promise<void> {
  signal?.throwIfAborted();
  if (delayMs <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(signal ? callerAbortReason(signal) : new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function requestApiData<T>(
  url: string,
  options: ApiDataRequestOptions<T>,
): Promise<T> {
  options.signal?.throwIfAborted();
  const method = options.method ?? "GET";
  const timeoutMs = resolveTimeoutMs(options.timeoutMs);
  const retryPolicy = resolveRetryPolicy(method, options.retry);
  const clientRequestId = resolveClientRequestId(options.clientRequestId);
  const headers = resolveHeaders(options, clientRequestId);
  const body = options.json === undefined ? undefined : JSON.stringify(options.json);
  let completedAttempts = 0;

  while (true) {
    options.signal?.throwIfAborted();
    completedAttempts += 1;
    const attempt = createAttemptSignal(options.signal, timeoutMs);
    let response: Response;
    let rawPayload: unknown;
    try {
      response = await fetch(url, {
        method,
        cache: options.cache ?? "no-store",
        headers,
        body,
        signal: attempt.signal,
      });
      rawPayload = await readJson(response, attempt.signal);
    } catch {
      attempt.cleanup();
      if (options.signal?.aborted) throw callerAbortReason(options.signal);
      const error = attempt.didTimeOut()
        ? new ApiClientError({
            code: "REQUEST_TIMEOUT",
            message: "요청 시간이 초과되었습니다.",
            status: 0,
            retryable: true,
          })
        : new ApiClientError({
            code: "NETWORK_ERROR",
            message: "네트워크 연결을 확인해 주세요.",
            status: 0,
            retryable: true,
          });
      const delayMs = retryDelayMs(error, completedAttempts, retryPolicy);
      if (delayMs === null) throw error;
      await waitForRetry(delayMs, options.signal);
      continue;
    }
    attempt.cleanup();

    const payload = asObject(rawPayload);
    if (!response.ok) {
      const error = responseError(response, payload);
      const delayMs = retryDelayMs(error, completedAttempts, retryPolicy);
      if (delayMs === null) throw error;
      await waitForRetry(delayMs, options.signal);
      continue;
    }

    const requestId = responseRequestId(response, payload);
    if (!("data" in (payload ?? {}))) {
      throw new ApiClientError({
        code: "INVALID_RESPONSE",
        message: options.invalidResponseMessage ?? "응답 형식을 확인하지 못했습니다.",
        status: 502,
        requestId,
        retryable: false,
      });
    }
    return options.parseData(payload?.data, requestId);
  }
}
