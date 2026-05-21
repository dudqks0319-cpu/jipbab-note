import assert from "node:assert/strict";
import test from "node:test";

import {
  getRateLimitKey,
  isUuidLike,
  normalizeHttpUrl,
  readJsonObject,
} from "../lib/request-security.ts";

test("builds rate limit keys from network identity before device identity", () => {
  const request = new Request("https://example.com/api/recipes", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.5",
      "x-device-id": "attacker-controlled-device",
    },
  });

  assert.equal(getRateLimitKey(request), "ip:203.0.113.10");
});

test("ignores malformed device identifiers in rate limit keys", () => {
  const request = new Request("https://example.com/api/recipes", {
    headers: {
      "x-real-ip": "198.51.100.4",
      "x-device-id": "bad device id with spaces",
    },
  });

  assert.equal(getRateLimitKey(request), "ip:198.51.100.4");
});

test("normalizes only safe app-local or HTTPS URLs", () => {
  assert.equal(normalizeHttpUrl("/images/recipe.png"), "/images/recipe.png");
  assert.equal(normalizeHttpUrl("//evil.example/image.png"), null);
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHttpUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(normalizeHttpUrl("http://example.com/image.png"), "https://example.com/image.png");
  assert.equal(normalizeHttpUrl("HTTP://example.com/image.png"), "https://example.com/image.png");
});

test("validates UUID-like route identifiers before privileged queries", () => {
  assert.equal(isUuidLike("a36e34ec-5f17-4e4a-8e07-246b8082447e"), true);
  assert.equal(isUuidLike("not-a-uuid"), false);
  assert.equal(isUuidLike("a36e34ec-5f17-4e4a-8e07-246b8082447e/extra"), false);
});

test("reads only JSON objects from request bodies", async () => {
  const valid = await readJsonObject(
    new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ status: "completed" }),
    }),
  );
  const invalid = await readJsonObject(
    new Request("https://example.com", {
      method: "POST",
      body: "not-json",
    }),
  );

  assert.deepEqual(valid, { status: "completed" });
  assert.equal(invalid, null);
});
