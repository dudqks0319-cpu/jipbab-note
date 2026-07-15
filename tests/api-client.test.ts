import assert from "node:assert/strict";
import test from "node:test";

import { ApiClientError, requestApiData } from "../lib/api-client.ts";

function parseObject(
  value: unknown,
  requestId: string | null,
): { value: Record<string, unknown>; requestId: string | null } {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return { value: value as Record<string, unknown>, requestId };
}

test("common API client sends bounded correlation and JSON headers without exposing bearer tokens", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let capturedHeaders = new Headers();
  let capturedBody: BodyInit | null | undefined;
  globalThis.fetch = async (_input, init) => {
    capturedHeaders = new Headers(init?.headers);
    capturedBody = init?.body;
    return new Response(
      JSON.stringify({ data: { accepted: true }, meta: { requestId: "meta-request" } }),
      {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "server-request" },
      },
    );
  };

  const result = await requestApiData("/api/example", {
    method: "POST",
    bearerToken: "private-test-token",
    clientRequestId: "client-request-1",
    json: { recipeId: "recipe-1" },
    parseData: parseObject,
  });

  assert.equal(capturedHeaders.get("accept"), "application/json");
  assert.equal(capturedHeaders.get("content-type"), "application/json");
  assert.equal(capturedHeaders.get("authorization"), "Bearer private-test-token");
  assert.equal(capturedHeaders.get("x-client-request-id"), "client-request-1");
  assert.equal(capturedBody, JSON.stringify({ recipeId: "recipe-1" }));
  assert.equal(result.requestId, "server-request");
  assert.deepEqual(result.value, { accepted: true });
});

test("common API client retries a retryable GET once with the same correlation ID", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const requestIds: string[] = [];
  globalThis.fetch = async (_input, init) => {
    requestIds.push(new Headers(init?.headers).get("x-client-request-id") ?? "");
    if (requestIds.length === 1) {
      return new Response(
        JSON.stringify({ error: { code: "DEPENDENCY_NOT_READY", message: "준비 중", requestId: "server-1" } }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ data: { ready: true } }), {
      status: 200,
      headers: { "content-type": "application/json", "x-request-id": "server-2" },
    });
  };

  const result = await requestApiData("/api/example", {
    clientRequestId: "client-retry-1",
    retry: { maxRetries: 1, baseDelayMs: 0, maxDelayMs: 0 },
    parseData: parseObject,
  });

  assert.equal(requestIds.length, 2);
  assert.deepEqual(requestIds, ["client-retry-1", "client-retry-1"]);
  assert.deepEqual(result.value, { ready: true });
});

test("common API client does not hammer a 429 whose Retry-After exceeds its retry budget", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMITED", message: "잠시 후 다시 시도", requestId: "rate-1" } }),
      {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "60" },
      },
    );
  };

  await assert.rejects(
    requestApiData("/api/example", {
      retry: { maxRetries: 2, baseDelayMs: 0, maxDelayMs: 1000 },
      parseData: parseObject,
    }),
    (error: unknown) =>
      error instanceof ApiClientError
      && error.code === "RATE_LIMITED"
      && error.status === 429
      && error.retryAfter === 60
      && error.retryable,
  );
  assert.equal(calls, 1);
});

test("common API client treats 401 as a bounded non-retryable auth error", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ error: { code: "AUTH_REQUIRED", message: "로그인이 필요합니다.", requestId: "auth-1" } }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  };

  await assert.rejects(
    requestApiData("/api/example", {
      retry: { maxRetries: 2, baseDelayMs: 0, maxDelayMs: 0 },
      parseData: parseObject,
    }),
    (error: unknown) =>
      error instanceof ApiClientError
      && error.code === "AUTH_REQUIRED"
      && error.status === 401
      && !error.retryable,
  );
  assert.equal(calls, 1);
});

test("common API client stops before fetch when the caller already cancelled", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  };
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    requestApiData("/api/example", {
      signal: controller.signal,
      parseData: parseObject,
    }),
    (error: unknown) => error instanceof DOMException && error.name === "AbortError",
  );
  assert.equal(calls, 0);
});

test("common API client converts its own timeout into a retryable bounded error", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      assert.ok(signal);
      signal.addEventListener(
        "abort",
        () => reject(signal.reason ?? new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });

  await assert.rejects(
    requestApiData("/api/example", {
      timeoutMs: 5,
      retry: false,
      parseData: parseObject,
    }),
    (error: unknown) =>
      error instanceof ApiClientError
      && error.code === "REQUEST_TIMEOUT"
      && error.status === 0
      && error.retryable,
  );
});

test("common API client never copies request secrets into network errors", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => {
    throw new Error("transport contained private-test-token and private-body-value");
  };

  await assert.rejects(
    requestApiData("/api/example", {
      method: "POST",
      bearerToken: "private-test-token",
      json: { note: "private-body-value" },
      retry: false,
      parseData: parseObject,
    }),
    (error: unknown) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.code, "NETWORK_ERROR");
      assert.equal(error.message.includes("private-test-token"), false);
      assert.equal(error.message.includes("private-body-value"), false);
      return true;
    },
  );
});
