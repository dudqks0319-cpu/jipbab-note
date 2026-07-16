// 외부 유료·사용량 기반 작업의 동시성, 시간, 장애 확산을 한곳에서 제한합니다.
import { logTelemetry } from "./telemetry.ts";

export type CostOperationFailureCode =
  | "CIRCUIT_OPEN"
  | "CONCURRENCY_LIMITED"
  | "OPERATION_FAILED"
  | "OPERATION_TIMED_OUT";

export class CostOperationError extends Error {
  readonly code: CostOperationFailureCode;

  constructor(
    code: CostOperationFailureCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CostOperationError";
    this.code = code;
  }
}

type CircuitState = {
  consecutiveFailures: number;
  openedAt: number | null;
};

type CostBoundedOperationOptions = {
  maxConcurrent: number;
  timeoutMs: number;
  failureThreshold: number;
  cooldownMs: number;
};

const activeOperations = new Map<string, number>();
const circuitStates = new Map<string, CircuitState>();

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

function getCircuitState(operationKey: string): CircuitState {
  const current = circuitStates.get(operationKey);
  if (current) return current;
  const created = { consecutiveFailures: 0, openedAt: null };
  circuitStates.set(operationKey, created);
  return created;
}

export async function runCostBoundedOperation<T>(
  operationKey: string,
  options: CostBoundedOperationOptions,
  task: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  assertPositiveInteger(options.maxConcurrent, "maxConcurrent");
  assertPositiveInteger(options.timeoutMs, "timeoutMs");
  assertPositiveInteger(options.failureThreshold, "failureThreshold");
  assertPositiveInteger(options.cooldownMs, "cooldownMs");

  const now = Date.now();
  const circuit = getCircuitState(operationKey);
  if (circuit.openedAt !== null && now - circuit.openedAt < options.cooldownMs) {
    logTelemetry("warn", "cost_operation.circuit_open", { operationKey });
    throw new CostOperationError("CIRCUIT_OPEN", "외부 서비스 보호 회로가 열려 있습니다.");
  }
  if (circuit.openedAt !== null) {
    circuit.openedAt = null;
    circuit.consecutiveFailures = 0;
  }

  const activeCount = activeOperations.get(operationKey) ?? 0;
  if (activeCount >= options.maxConcurrent) {
    logTelemetry("warn", "cost_operation.concurrency_limited", {
      operationKey,
      activeCount,
    });
    throw new CostOperationError(
      "CONCURRENCY_LIMITED",
      "외부 서비스 동시 요청 한도에 도달했습니다.",
    );
  }

  activeOperations.set(operationKey, activeCount + 1);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const abortPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => reject(new DOMException("The operation timed out.", "AbortError")),
        { once: true },
      );
    });
    const result = await Promise.race([task(controller.signal), abortPromise]);
    circuit.consecutiveFailures = 0;
    circuit.openedAt = null;
    return result;
  } catch (error) {
    circuit.consecutiveFailures += 1;
    if (circuit.consecutiveFailures >= options.failureThreshold) {
      circuit.openedAt = Date.now();
    }

    const timedOut = controller.signal.aborted;
    logTelemetry("error", timedOut ? "cost_operation.timed_out" : "cost_operation.failed", {
      operationKey,
      failureCount: circuit.consecutiveFailures,
      circuitOpened: circuit.openedAt !== null,
      error,
    });
    throw new CostOperationError(
      timedOut ? "OPERATION_TIMED_OUT" : "OPERATION_FAILED",
      timedOut ? "외부 서비스 응답 시간이 초과됐습니다." : "외부 서비스 요청이 실패했습니다.",
      { cause: error },
    );
  } finally {
    clearTimeout(timeoutId);
    const nextCount = Math.max((activeOperations.get(operationKey) ?? 1) - 1, 0);
    if (nextCount === 0) activeOperations.delete(operationKey);
    else activeOperations.set(operationKey, nextCount);
  }
}
