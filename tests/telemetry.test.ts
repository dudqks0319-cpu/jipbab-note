import assert from "node:assert/strict";
import test from "node:test";

import { REDACTED_VALUE, buildTelemetryEvent, redactSensitiveData } from "../lib/telemetry.ts";
import {
  buildApiOperationMetadata,
  createApiOperationRecorder,
  logApiOperation,
} from "../lib/operational-telemetry.ts";

test("redacts sensitive object keys recursively", () => {
  const result = redactSensitiveData({
    userId: "user-123",
    password: "raw-password",
    nested: {
      accessToken: "token-value",
      safeValue: "kept",
    },
    items: [{ refresh_token: "refresh-value" }],
  });

  assert.deepEqual(result, {
    userId: "user-123",
    password: REDACTED_VALUE,
    nested: {
      accessToken: REDACTED_VALUE,
      safeValue: "kept",
    },
    items: [{ refresh_token: REDACTED_VALUE }],
  });
});

test("redacts tokens, query secrets, and email addresses inside strings", () => {
  const result = redactSensitiveData(
    "Authorization: Bearer abc.def.ghi email user@example.com callback?token=abc123&next=/home",
  );

  assert.equal(
    result,
    `Authorization: Bearer ${REDACTED_VALUE} email ${REDACTED_VALUE} callback?token=${REDACTED_VALUE}&next=/home`,
  );
});

test("buildTelemetryEvent returns redacted metadata without mutating the source", () => {
  const metadata = {
    requestId: "req-123",
    authorization: "Bearer sensitive-token",
  };

  const event = buildTelemetryEvent("warn", "api.suspicious_request", metadata);

  assert.equal(event.level, "warn");
  assert.equal(event.event, "api.suspicious_request");
  assert.match(event.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(event.metadata, {
    requestId: "req-123",
    authorization: REDACTED_VALUE,
  });
  assert.equal(metadata.authorization, "Bearer sensitive-token");
});

test("operational API metadata keeps only the plan-approved fields", () => {
  const metadata = buildApiOperationMetadata({
    requestId: "req-123",
    endpoint: "GET /api/v1/recipes",
    status: 503,
    latencyMs: 42.6,
    errorCode: "DEPENDENCY_NOT_READY",
    environment: {
      VERCEL_GIT_COMMIT_SHA: "ABCDEF1234567890",
      SUPABASE_SERVICE_ROLE_KEY: "must-not-appear",
    },
  });

  assert.deepEqual(metadata, {
    request_id: "req-123",
    endpoint: "GET /api/v1/recipes",
    status: 503,
    latency_ms: 43,
    error_code: "DEPENDENCY_NOT_READY",
    deployment_sha: "abcdef1234567890",
  });
  assert.equal("SUPABASE_SERVICE_ROLE_KEY" in metadata, false);
});

test("operational telemetry never changes an API result when the sink fails", () => {
  const metadata = logApiOperation(
    {
      requestId: "req-456",
      endpoint: "POST /api/v1/recommendations",
      status: 500,
      latencyMs: -1,
      errorCode: "INTERNAL_ERROR",
      environment: {},
    },
    {
      error() {
        throw new Error("sink unavailable");
      },
    },
  );

  assert.equal(metadata.latency_ms, 0);
  assert.equal(metadata.deployment_sha, "unknown");
});

test("API operation recorder emits one structured completion event", () => {
  const records: unknown[][] = [];
  const times = [1_000, 1_037];
  const record = createApiOperationRecorder({
    requestId: "req-789",
    endpoint: "GET /api/v1/recipes/:id",
    now: () => times.shift() ?? 1_037,
    environment: { DEPLOYMENT_SHA: "abcdef1" },
    sink: {
      warn: (...values) => records.push(values),
    },
  });

  const metadata = record(404, "NOT_FOUND");
  const duplicate = record(500, "INTERNAL_ERROR");

  assert.equal(duplicate, null);
  assert.equal(records.length, 1);
  assert.deepEqual(metadata, {
    request_id: "req-789",
    endpoint: "GET /api/v1/recipes/:id",
    status: 404,
    latency_ms: 37,
    error_code: "NOT_FOUND",
    deployment_sha: "abcdef1",
  });
  assert.deepEqual((records[0][1] as { metadata: unknown }).metadata, metadata);
});
