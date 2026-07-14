export const RECIPE_FEEDBACK_COMPLETION_STATUSES = [
  "completed_independently",
  "completed_with_difficulty",
  "failed",
] as const;

export type RecipeFeedbackCompletionStatus =
  (typeof RECIPE_FEEDBACK_COMPLETION_STATUSES)[number];

export const RECIPE_FEEDBACK_FAILURE_REASONS = [
  { code: "unclear_instructions", label: "설명이 어려움" },
  { code: "not_enough_time", label: "시간 부족" },
  { code: "heat_control", label: "불 세기 문제" },
  { code: "ingredient_quantity", label: "재료 양 문제" },
  { code: "missing_tool", label: "필요한 도구 없음" },
  { code: "timer_issue", label: "타이머 문제" },
  { code: "burned_or_undercooked", label: "음식이 타거나 덜 익음" },
  { code: "other", label: "기타" },
] as const;

export type RecipeFeedbackFailureReason =
  (typeof RECIPE_FEEDBACK_FAILURE_REASONS)[number]["code"];

export type RecipeFeedbackV1Input = {
  clientSubmissionId: string;
  recipeId: string;
  recipeVersion: number;
  completionStatus: RecipeFeedbackCompletionStatus;
  failedStepOrder: number | null;
  reasonCode: RecipeFeedbackFailureReason | null;
  actualDurationSeconds: number | null;
};

export class RecipeFeedbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipeFeedbackValidationError";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INPUT_KEYS = [
  "clientSubmissionId",
  "recipeId",
  "recipeVersion",
  "completionStatus",
  "failedStepOrder",
  "reasonCode",
  "actualDurationSeconds",
] as const;
const INPUT_KEY_SET = new Set<string>(INPUT_KEYS);
const MAX_RECIPE_VERSION = 1_000_000;
const MAX_STEP_ORDER = 100;
export const MAX_RECIPE_FEEDBACK_DURATION_SECONDS = 12 * 60 * 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function fail(message: string): never {
  throw new RecipeFeedbackValidationError(message);
}

export function parseRecipeFeedbackV1Input(value: unknown): RecipeFeedbackV1Input {
  if (!isRecord(value)) {
    fail("피드백 요청 형식을 확인해 주세요.");
  }

  const keys = Object.keys(value);
  if (
    keys.length !== INPUT_KEYS.length
    || keys.some((key) => !INPUT_KEY_SET.has(key))
    || INPUT_KEYS.some((key) => !(key in value))
  ) {
    fail("허용되지 않은 피드백 항목이 있습니다.");
  }

  const clientSubmissionId = value.clientSubmissionId;
  const recipeId = value.recipeId;
  const recipeVersion = value.recipeVersion;
  const completionStatus = value.completionStatus;
  const failedStepOrder = value.failedStepOrder;
  const reasonCode = value.reasonCode;
  const actualDurationSeconds = value.actualDurationSeconds;

  if (typeof clientSubmissionId !== "string" || !UUID_PATTERN.test(clientSubmissionId)) {
    fail("피드백 제출 식별자를 확인해 주세요.");
  }
  if (typeof recipeId !== "string" || !UUID_PATTERN.test(recipeId)) {
    fail("레시피 식별자를 확인해 주세요.");
  }
  if (!isBoundedInteger(recipeVersion, 1, MAX_RECIPE_VERSION)) {
    fail("레시피 버전을 확인해 주세요.");
  }
  if (!RECIPE_FEEDBACK_COMPLETION_STATUSES.includes(
    completionStatus as RecipeFeedbackCompletionStatus,
  )) {
    fail("완성 상태를 확인해 주세요.");
  }
  const normalizedCompletionStatus = completionStatus as RecipeFeedbackCompletionStatus;
  if (
    actualDurationSeconds !== null
    && !isBoundedInteger(actualDurationSeconds, 1, MAX_RECIPE_FEEDBACK_DURATION_SECONDS)
  ) {
    fail("실제 조리시간을 확인해 주세요.");
  }

  if (normalizedCompletionStatus === "failed") {
    if (!isBoundedInteger(failedStepOrder, 1, MAX_STEP_ORDER)) {
      fail("멈춘 단계를 선택해 주세요.");
    }
    if (
      reasonCode !== null
      && !RECIPE_FEEDBACK_FAILURE_REASONS.some((reason) => reason.code === reasonCode)
    ) {
      fail("어려웠던 이유를 확인해 주세요.");
    }
  } else if (failedStepOrder !== null || reasonCode !== null) {
    fail("완성한 조리에는 실패 단계나 이유를 보낼 수 없습니다.");
  }

  return {
    clientSubmissionId,
    recipeId,
    recipeVersion,
    completionStatus: normalizedCompletionStatus,
    failedStepOrder: failedStepOrder as number | null,
    reasonCode: reasonCode as RecipeFeedbackFailureReason | null,
    actualDurationSeconds: actualDurationSeconds as number | null,
  };
}

export function feedbackDifficultyForStatus(
  status: RecipeFeedbackCompletionStatus,
): "manageable" | "difficult" | "blocked" {
  if (status === "completed_independently") return "manageable";
  if (status === "completed_with_difficulty") return "difficult";
  return "blocked";
}

export function calculateRecipeCookDurationSeconds(
  startedAt: string | null,
  endedAt: string | null,
): number | null {
  if (!startedAt || !endedAt) return null;
  const started = Date.parse(startedAt);
  const ended = Date.parse(endedAt);
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started) return null;
  const seconds = Math.round((ended - started) / 1_000);
  return seconds >= 1 && seconds <= MAX_RECIPE_FEEDBACK_DURATION_SECONDS ? seconds : null;
}
