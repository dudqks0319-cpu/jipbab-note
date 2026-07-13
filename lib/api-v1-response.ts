import { randomUUID } from "node:crypto";

import { after, NextResponse } from "next/server";

import {
  buildApiV1ErrorEnvelope,
  buildApiV1SuccessEnvelope,
  type ApiV1ErrorCode,
} from "./api-v1-envelope.ts";
import {
  createApiOperationRecorder,
  type ApiOperationEndpoint,
  type OperationalTelemetryEnvironment,
} from "./operational-telemetry.ts";
import {
  queueOperationalAlert,
  type OperationalAlertEnvironment,
  type OperationalAlertFetch,
  type OperationalAlertScheduler,
} from "./operational-alerts.ts";
import type { TelemetrySink } from "./telemetry.ts";

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

type ApiV1ResponderOptions = {
  now?: () => number;
  sink?: TelemetrySink;
  environment?: OperationalTelemetryEnvironment & OperationalAlertEnvironment;
  alertFetch?: OperationalAlertFetch;
  scheduleAfterResponse?: OperationalAlertScheduler;
};

export function createApiV1Responder(
  endpoint: ApiOperationEndpoint,
  options: ApiV1ResponderOptions = {},
) {
  const requestId = createApiRequestId();
  const record = createApiOperationRecorder({
    requestId,
    endpoint,
    now: options.now,
    sink: options.sink,
    environment: options.environment,
  });

  function recordAndQueueAlert(status: number, code?: ApiV1ErrorCode) {
    const metadata = record(status, code);
    if (!metadata) {
      return;
    }
    queueOperationalAlert(metadata, {
      environment: options.environment,
      fetch: options.alertFetch,
      schedule: options.scheduleAfterResponse ?? after,
      sink: options.sink,
    });
  }

  return {
    requestId,
    success<T>(data: T, status = 200) {
      const response = apiV1Success(data, requestId, status);
      recordAndQueueAlert(status);
      return response;
    },
    error(
      code: ApiV1ErrorCode,
      message: string,
      status: number,
      responseOptions?: {
        retryAfter?: number;
        details?: Record<string, string | number | boolean>;
      },
    ) {
      const response = apiV1Error(
        code,
        message,
        status,
        requestId,
        responseOptions,
      );
      recordAndQueueAlert(status, code);
      return response;
    },
  };
}
