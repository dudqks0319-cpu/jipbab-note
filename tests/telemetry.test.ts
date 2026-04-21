import assert from "node:assert/strict";
import test from "node:test";

import { REDACTED_VALUE, buildTelemetryEvent, redactSensitiveData } from "../lib/telemetry.ts";

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
