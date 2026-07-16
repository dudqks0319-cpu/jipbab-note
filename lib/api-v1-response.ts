import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  buildApiV1ErrorEnvelope,
  buildApiV1SuccessEnvelope,
  type ApiV1ErrorCode,
} from "./api-v1-envelope.ts";

export type { ApiV1ErrorCode } from "./api-v1-envelope.ts";

export function createApiRequestId(): string {
  return randomUUID();
}

function responseHeaders(requestId: string, retryAfter?: number): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Request-Id": requestId,
  });
  if (retryAfter && retryAfter > 0) {
    headers.set("Retry-After", String(Math.ceil(retryAfter)));
  }
  return headers;
}

export function apiV1Success<T>(data: T, requestId: string, status = 200) {
  return NextResponse.json(
    buildApiV1SuccessEnvelope(data, requestId),
    { status, headers: responseHeaders(requestId) },
  );
}

export function apiV1Error(
  code: ApiV1ErrorCode,
  message: string,
  status: number,
  requestId: string,
  options?: { retryAfter?: number; details?: Record<string, string | number | boolean> },
) {
  return NextResponse.json(
    buildApiV1ErrorEnvelope(code, message, requestId, options?.details),
    {
      status,
      headers: responseHeaders(requestId, options?.retryAfter),
    },
  );
}
