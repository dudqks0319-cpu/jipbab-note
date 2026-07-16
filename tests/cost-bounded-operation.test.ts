import assert from "node:assert/strict";
import test from "node:test";

import {
  CostOperationError,
  runCostBoundedOperation,
} from "../lib/cost-bounded-operation.ts";

const baseOptions = {
  maxConcurrent: 1,
  timeoutMs: 1_000,
  failureThreshold: 2,
  cooldownMs: 60_000,
};

test("rejects concurrency overflow before starting another metered task", async () => {
  const operationKey = `concurrency:${Date.now()}`;
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = runCostBoundedOperation(operationKey, baseOptions, async () => held);

  await assert.rejects(
    () => runCostBoundedOperation(operationKey, baseOptions, async () => "unexpected"),
    (error: unknown) => error instanceof CostOperationError
      && error.code === "CONCURRENCY_LIMITED",
  );
  release();
  await first;
});

test("propagates cancellation and rejects timed out provider work", async () => {
  const operationKey = `timeout:${Date.now()}`;
  await assert.rejects(
    () => runCostBoundedOperation(
      operationKey,
      { ...baseOptions, timeoutMs: 10 },
      async (signal) => new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
      }),
    ),
    (error: unknown) => error instanceof CostOperationError
      && error.code === "OPERATION_TIMED_OUT",
  );
});

test("opens a circuit after bounded consecutive provider failures", async () => {
  const operationKey = `circuit:${Date.now()}`;
  const fail = () => runCostBoundedOperation(
    operationKey,
    baseOptions,
    async () => { throw new Error("provider failed"); },
  );

  await assert.rejects(fail, (error: unknown) => error instanceof CostOperationError
    && error.code === "OPERATION_FAILED");
  await assert.rejects(fail, (error: unknown) => error instanceof CostOperationError
    && error.code === "OPERATION_FAILED");
  await assert.rejects(fail, (error: unknown) => error instanceof CostOperationError
    && error.code === "CIRCUIT_OPEN");
});
