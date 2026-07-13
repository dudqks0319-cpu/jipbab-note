import { createHmac } from "node:crypto";

import type { ApiOperationMetadata } from "./operational-telemetry.ts";
import { API_OPERATION_ENDPOINTS } from "./operational-telemetry.ts";
import { logTelemetry, type TelemetrySink } from "./telemetry.ts";

export type OperationalAlertEnvironment = Readonly<{
  [key: string]: string | undefined;
  OPERATIONAL_ALERTS_ENABLED?: string;
  OPERATIONAL_ALERT_WEBHOOK_URL?: string;
  OPERATIONAL_ALERT_HMAC_SECRET?: string;
}>;

export type OperationalAlertFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type OperationalAlertScheduler = (
  task: () => Promise<void>,
) => void;

export type OperationalAlertPayload = {
  schema_version: 1;
  event: "api.request_failed";
  level: "error";
  timestamp: string;
  metadata: {
    request_id: string;
    endpoint: ApiOperationMetadata["endpoint"];
    status: number;
    latency_ms: number;
    error_code: "INTERNAL_ERROR";
    deployment_sha: string;
  };
};

export type OperationalAlertDeliveryResult = {
  status: "disabled" | "skipped" | "delivered" | "failed";
};

type OperationalAlertConfiguration = {
  url: string;
  hmacSecret: string;
};

type DeliverOperationalAlertOptions = {
  environment?: OperationalAlertEnvironment;
  fetch?: OperationalAlertFetch;
  now?: () => Date;
};

type QueueOperationalAlertOptions = DeliverOperationalAlertOptions & {
  schedule: OperationalAlertScheduler;
  sink?: TelemetrySink;
};

const REQUEST_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const DEPLOYMENT_SHA_PATTERN = /^(?:[a-f0-9]{7,64}|unknown)$/i;
const ALERT_TIMEOUT_MS = 2_500;
const MIN_HMAC_SECRET_LENGTH = 32;
const MAX_HMAC_SECRET_LENGTH = 256;

function resolveOperationalAlertConfiguration(
  environment: OperationalAlertEnvironment,
): OperationalAlertConfiguration | null {
  if (environment.OPERATIONAL_ALERTS_ENABLED !== "true") {
    return null;
  }

  const rawUrl = environment.OPERATIONAL_ALERT_WEBHOOK_URL?.trim() ?? "";
  const hmacSecret = environment.OPERATIONAL_ALERT_HMAC_SECRET ?? "";
  if (
    rawUrl.length === 0 ||
    rawUrl.length > 2_048 ||
    hmacSecret.length < MIN_HMAC_SECRET_LENGTH ||
    hmacSecret.length > MAX_HMAC_SECRET_LENGTH ||
    hmacSecret.trim() !== hmacSecret ||
    /[\u0000-\u001f\u007f]/.test(hmacSecret)
  ) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return { url: url.toString(), hmacSecret };
  } catch {
    return null;
  }
}

export function isOperationalAlertCandidate(
  metadata: ApiOperationMetadata,
): metadata is ApiOperationMetadata & { error_code: "INTERNAL_ERROR" } {
  return (
    metadata.status >= 500 &&
    metadata.status <= 599 &&
    metadata.error_code === "INTERNAL_ERROR" &&
    Number.isInteger(metadata.latency_ms) &&
    metadata.latency_ms >= 0 &&
    metadata.latency_ms <= 24 * 60 * 60 * 1_000 &&
    REQUEST_ID_PATTERN.test(metadata.request_id) &&
    API_OPERATION_ENDPOINTS.includes(metadata.endpoint) &&
    DEPLOYMENT_SHA_PATTERN.test(metadata.deployment_sha)
  );
}

export function buildOperationalAlertPayload(
  metadata: ApiOperationMetadata,
  now: () => Date = () => new Date(),
): OperationalAlertPayload {
  if (!isOperationalAlertCandidate(metadata)) {
    throw new Error("operational_alert_not_allowed");
  }

  return {
    schema_version: 1,
    event: "api.request_failed",
    level: "error",
    timestamp: now().toISOString(),
    metadata: {
      request_id: metadata.request_id,
      endpoint: metadata.endpoint,
      status: metadata.status,
      latency_ms: metadata.latency_ms,
      error_code: metadata.error_code,
      deployment_sha: metadata.deployment_sha,
    },
  };
}

export async function deliverOperationalAlert(
  metadata: ApiOperationMetadata,
  options: DeliverOperationalAlertOptions = {},
): Promise<OperationalAlertDeliveryResult> {
  const configuration = resolveOperationalAlertConfiguration(
    options.environment ?? process.env,
  );
  if (!configuration) {
    return { status: "disabled" };
  }
  if (!isOperationalAlertCandidate(metadata)) {
    return { status: "skipped" };
  }

  const body = JSON.stringify(
    buildOperationalAlertPayload(metadata, options.now),
  );
  const signature = createHmac("sha256", configuration.hmacSecret)
    .update(body)
    .digest("hex");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);

  try {
    const response = await (options.fetch ?? fetch)(configuration.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Jipbab-Alert-Signature": `sha256=${signature}`,
        "X-Jipbab-Alert-Version": "1",
      },
      body,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    return { status: response.ok ? "delivered" : "failed" };
  } catch {
    return { status: "failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export function queueOperationalAlert(
  metadata: ApiOperationMetadata,
  options: QueueOperationalAlertOptions,
): boolean {
  const environment = options.environment ?? process.env;
  if (
    !resolveOperationalAlertConfiguration(environment) ||
    !isOperationalAlertCandidate(metadata)
  ) {
    return false;
  }

  try {
    options.schedule(async () => {
      const result = await deliverOperationalAlert(metadata, {
        environment,
        fetch: options.fetch,
        now: options.now,
      });
      if (result.status !== "failed") {
        return;
      }
      try {
        logTelemetry(
          "warn",
          "monitoring.alert_delivery_failed",
          { deployment_sha: metadata.deployment_sha },
          options.sink,
        );
      } catch {}
    });
    return true;
  } catch {
    return false;
  }
}
