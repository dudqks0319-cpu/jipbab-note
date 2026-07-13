import assert from "node:assert/strict";
import test from "node:test";

import { redactE2EArtifact } from "../scripts/lib/e2e-artifact-redaction.mjs";

test("E2E artifact redaction removes secrets, PII, query strings, and local paths", () => {
  const redacted = redactE2EArtifact({
    url: "https://preview.example.com/api/v1/recipes?token=secret&email=user@example.com#frag",
    authorization: "Bearer fixture-secret",
    cookie: "session=secret",
    console: "user@example.com opened /Users/example/project/file.ts with token=secret",
  });
  const serialized = JSON.stringify(redacted);

  assert.doesNotMatch(serialized, /fixture-secret|session=secret|user@example\.com|\/Users\/example|token=secret|#frag/);
  assert.match(serialized, /REDACTED/);
  assert.match(serialized, /https:\/\/preview\.example\.com\/api\/v1\/recipes/);
});
