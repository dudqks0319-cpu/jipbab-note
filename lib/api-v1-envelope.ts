export type ApiV1ErrorCode =
  | "INVALID_QUERY"
  | "INVALID_BODY"
  | "INVALID_FILTER"
  | "INVALID_CURSOR"
  | "INVALID_LIMIT"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "DEPENDENCY_NOT_READY"
  | "INTERNAL_ERROR";

export function buildApiV1SuccessEnvelope<T>(data: T, requestId: string) {
  return { data, meta: { requestId } };
}

export function buildApiV1ErrorEnvelope(
  code: ApiV1ErrorCode,
  message: string,
  requestId: string,
  details?: Record<string, string | number | boolean>,
) {
  return {
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {}),
    },
  };
}
