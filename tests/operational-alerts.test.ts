import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  buildOperationalAlertPayload,
  deliverOperationalAlert,
  queueOperationalAlert,
  type OperationalAlertFetch,
} from "../lib/operational-alerts.ts";
import type { ApiOperationMetadata } from "../lib/operational-telemetry.ts";

const INTERNAL_ERROR_METADATA: ApiOperationMetadata = {
  request_id: "123e4567-e89b-42d3-a456-426614174000",
  endpoint: "GET /api/v1/recipes",
  status: 500,
  latency_ms: 37,
  error_code: "INTERNAL_ERROR",
  deployment_sha: "abcdef1234567890",
};

const ENABLED_ENVIRONMENT = {
  OPERATIONAL_ALERTS_ENABLED: "true",
  OPERATIONAL_ALERT_WEBHOOK_URL: "https://alerts.example.test/v1/jipbab",
  OPERATIONAL_ALERT_HMAC_SECRET: "0123456789abcdef0123456789abcdef",
  SUPABASE_SERVICE_ROLE_KEY: "must-never-leave-the-server",
  ADMIN_EMAILS: "operator@example.com",
} as const;

test("operational alert payload contains only the bounded monitoring allowlist", () => {
  const payload = buildOperationalAlertPayload(
    INTERNAL_ERROR_METADATA,
    () => new Date("2026-07-13T12:00:00.000Z"),
  );

  assert.deepEqual(payload, {
    schema_version: 1,
    event: "api.request_failed",
    level: "error",
    timestamp: "2026-07-13T12:00:00.000Z",
    metadata: INTERNAL_ERROR_METADATA,
  });
  assert.doesNotMatch(JSON.stringify(payload), /operator@example\.com|service-role/i);
});

test("monitoring delivery requires explicit enablement, a safe HTTPS URL, and a strong secret", async () => {
  let requests = 0;
  const fetcher: OperationalAlertFetch = async () => {
    requests += 1;
    return new Response(null, { status: 202 });
  };

  for (const environment of [
    {},
    {
      ...ENABLED_ENVIRONMENT,
      OPERATIONAL_ALERTS_ENABLED: "false",
    },
    {
      ...ENABLED_ENVIRONMENT,
      OPERATIONAL_ALERT_WEBHOOK_URL: "http://alerts.example.test/v1/jipbab",
    },
    {
      ...ENABLED_ENVIRONMENT,
      OPERATIONAL_ALERT_WEBHOOK_URL: "https://alerts.example.test/v1/jipbab?token=secret",
    },
    {
      ...ENABLED_ENVIRONMENT,
      OPERATIONAL_ALERT_HMAC_SECRET: "too-short",
    },
  ]) {
    const result = await deliverOperationalAlert(INTERNAL_ERROR_METADATA, {
      environment,
      fetch: fetcher,
    });
    assert.equal(result.status, "disabled");
  }

  assert.equal(requests, 0);
});

test("monitoring delivery signs the exact allowlisted body and never sends environment secrets", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetcher: OperationalAlertFetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(null, { status: 202 });
  };

  const result = await deliverOperationalAlert(INTERNAL_ERROR_METADATA, {
    environment: ENABLED_ENVIRONMENT,
    fetch: fetcher,
    now: () => new Date("2026-07-13T12:00:00.000Z"),
  });

  assert.equal(result.status, "delivered");
  assert.equal(capturedUrl, ENABLED_ENVIRONMENT.OPERATIONAL_ALERT_WEBHOOK_URL);
  assert.equal(capturedInit?.method, "POST");
  assert.equal(typeof capturedInit?.body, "string");
  if (typeof capturedInit?.body !== "string") {
    throw new Error("expected_string_body");
  }
  const headers = new Headers(capturedInit.headers);
  const expectedSignature = createHmac(
    "sha256",
    ENABLED_ENVIRONMENT.OPERATIONAL_ALERT_HMAC_SECRET,
  )
    .update(capturedInit.body)
    .digest("hex");
  assert.equal(
    headers.get("X-Jipbab-Alert-Signature"),
    `sha256=${expectedSignature}`,
  );
  assert.equal(headers.get("X-Jipbab-Alert-Version"), "1");
  assert.deepEqual(JSON.parse(capturedInit.body), {
    schema_version: 1,
    event: "api.request_failed",
    level: "error",
    timestamp: "2026-07-13T12:00:00.000Z",
    metadata: INTERNAL_ERROR_METADATA,
  });
  assert.doesNotMatch(
    `${capturedUrl}\n${JSON.stringify([...headers])}\n${capturedInit.body}`,
    /must-never-leave|operator@example\.com|0123456789abcdef0123456789abcdef/,
  );
});

test("expected dependency readiness errors and malformed metadata do not trigger alerts", async () => {
  let requests = 0;
  const fetcher: OperationalAlertFetch = async () => {
    requests += 1;
    return new Response(null, { status: 202 });
  };

  const dependencyResult = await deliverOperationalAlert(
    {
      ...INTERNAL_ERROR_METADATA,
      status: 503,
      error_code: "DEPENDENCY_NOT_READY",
    },
    { environment: ENABLED_ENVIRONMENT, fetch: fetcher },
  );
  const malformedResult = await deliverOperationalAlert(
    {
      ...INTERNAL_ERROR_METADATA,
      request_id: "email-operator@example.com",
    },
    { environment: ENABLED_ENVIRONMENT, fetch: fetcher },
  );

  assert.equal(dependencyResult.status, "skipped");
  assert.equal(malformedResult.status, "skipped");
  assert.equal(requests, 0);
});

test("alert delivery and scheduling failures remain isolated from the caller", async () => {
  const scheduled: Array<() => Promise<void>> = [];
  const warnings: unknown[][] = [];
  const queued = queueOperationalAlert(INTERNAL_ERROR_METADATA, {
    environment: ENABLED_ENVIRONMENT,
    now: () => new Date("2026-07-13T12:00:00.000Z"),
    fetch: async () => {
      throw new Error("destination unavailable with token=private-value");
    },
    schedule: (task) => scheduled.push(task),
    sink: {
      warn: (...values) => warnings.push(values),
    },
  });

  assert.equal(queued, true);
  assert.equal(scheduled.length, 1);

  await scheduled[0]();
  assert.equal(warnings.length, 1);
  const warningText = JSON.stringify(warnings);
  assert.match(warningText, /monitoring\.alert_delivery_failed/);
  assert.match(warningText, /abcdef1234567890/);
  assert.doesNotMatch(
    warningText,
    /private-value|alerts\.example\.test|0123456789abcdef0123456789abcdef/,
  );

  const schedulingFailure = queueOperationalAlert(INTERNAL_ERROR_METADATA, {
    environment: ENABLED_ENVIRONMENT,
    schedule() {
      throw new Error("after unavailable");
    },
  });
  assert.equal(schedulingFailure, false);
});
