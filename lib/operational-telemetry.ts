import type { ApiV1ErrorCode } from "./api-v1-envelope.ts";
import {
  logTelemetry,
  type TelemetryLevel,
  type TelemetrySink,
} from "./telemetry.ts";

export const API_OPERATION_ENDPOINTS = [
  "GET /api/v1/recipes",
  "GET /api/v1/recipes/:id",
  "POST /api/v1/recommendations",
  "POST /api/v1/recipe-feedback",
  "GET /api/v1/recipe-progress",
  "POST /api/v1/recipe-progress",
] as const;

export type ApiOperationEndpoint = (typeof API_OPERATION_ENDPOINTS)[number];

export type OperationalTelemetryEnvironment = Readonly<{
  [key: string]: string | undefined;
  VERCEL_GIT_COMMIT_SHA?: string;
  DEPLOYMENT_SHA?: string;
  GITHUB_SHA?: string;
}>;

export type ApiOperationMetadata = {
  request_id: string;
  endpoint: ApiOperationEndpoint;
  status: number;
  latency_ms: number;
  error_code?: ApiV1ErrorCode;
  deployment_sha: string;
};

type ApiOperationInput = {
  requestId: string;
  endpoint: ApiOperationEndpoint;
  status: number;
  latencyMs: number;
  errorCode?: ApiV1ErrorCode;
  environment?: OperationalTelemetryEnvironment;
};

type ApiOperationRecorderInput = {
  requestId: string;
  endpoint: ApiOperationEndpoint;
  now?: () => number;
  sink?: TelemetrySink;
  environment?: OperationalTelemetryEnvironment;
};

const DEPLOYMENT_SHA_PATTERN = /^[a-f0-9]{7,64}$/i;

export function resolveDeploymentSha(environment: OperationalTelemetryEnvironment): string {
  const candidate = [
    environment.VERCEL_GIT_COMMIT_SHA,
    environment.DEPLOYMENT_SHA,
    environment.GITHUB_SHA,
  ]
    .map((value) => value?.trim() ?? "")
    .find((value) => DEPLOYMENT_SHA_PATTERN.test(value));

  return candidate?.toLowerCase() ?? "unknown";
}

function boundedLatency(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(Math.round(value), 24 * 60 * 60 * 1000);
}

function telemetryLevel(status: number, errorCode?: ApiV1ErrorCode): TelemetryLevel {
  if (status >= 500 && errorCode !== "DEPENDENCY_NOT_READY") {
    return "error";
  }
  if (status >= 400) {
    return "warn";
  }
  return "info";
}

export function buildApiOperationMetadata(input: ApiOperationInput): ApiOperationMetadata {
  return {
    request_id: input.requestId,
    endpoint: input.endpoint,
    status: input.status,
    latency_ms: boundedLatency(input.latencyMs),
    ...(input.errorCode ? { error_code: input.errorCode } : {}),
    deployment_sha: resolveDeploymentSha(input.environment ?? process.env),
  };
}

export function logApiOperation(
  input: ApiOperationInput,
  sink: TelemetrySink = console,
): ApiOperationMetadata {
  const metadata = buildApiOperationMetadata(input);

  try {
    logTelemetry(
      telemetryLevel(metadata.status, metadata.error_code),
      "api.request_completed",
      metadata,
      sink,
    );
  } catch {}

  return metadata;
}

export function createApiOperationRecorder(input: ApiOperationRecorderInput) {
  const now = input.now ?? Date.now;
  const startedAt = now();
  let recorded = false;

  return (status: number, errorCode?: ApiV1ErrorCode): ApiOperationMetadata | null => {
    if (recorded) {
      return null;
    }
    recorded = true;
    return logApiOperation(
      {
        requestId: input.requestId,
        endpoint: input.endpoint,
        status,
        latencyMs: now() - startedAt,
        errorCode,
        environment: input.environment,
      },
      input.sink,
    );
  };
}
