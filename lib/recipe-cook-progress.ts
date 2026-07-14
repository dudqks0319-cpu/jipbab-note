import {
  RECIPE_FEEDBACK_COMPLETION_STATUSES,
  RECIPE_FEEDBACK_FAILURE_REASONS,
  type RecipeFeedbackCompletionStatus,
  type RecipeFeedbackFailureReason,
} from "./recipe-feedback.ts";

export type RecipeCookFeedback = {
  clientSubmissionId: string;
  completionStatus: RecipeFeedbackCompletionStatus;
  failedStepOrder: number | null;
  reasonCode: RecipeFeedbackFailureReason | null;
  actualDurationSeconds: number | null;
  submittedAt: string;
  syncedAt: string | null;
};

export type RecipeCookTimer = {
  stepIndex: number;
  endsAt: number;
  durationSeconds: number;
};

export type RecipeCookProgress = {
  version: 2;
  activeStepIndex: number;
  checkedStepIndexes: number[];
  timer: RecipeCookTimer | null;
  startedAt: string | null;
  completedAt: string | null;
  feedback: RecipeCookFeedback | null;
  updatedAt: string;
};

const MAX_TIMER_SECONDS = 24 * 60 * 60;
const MAX_FEEDBACK_DURATION_SECONDS = 12 * 60 * 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function recipeCookProgressKey(recipeId: string): string {
  return `jipbab:recipe-cook-progress:v1:${recipeId}`;
}

export function remainingTimerSeconds(timer: RecipeCookTimer | null, now = Date.now()): number {
  if (!timer) return 0;
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function createRecipeCookTimer(
  stepIndex: number,
  durationSeconds: number,
  now = Date.now(),
): RecipeCookTimer | null {
  if (!Number.isInteger(stepIndex) || stepIndex < 1) return null;
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > MAX_TIMER_SECONDS) {
    return null;
  }
  return { stepIndex, durationSeconds, endsAt: now + durationSeconds * 1000 };
}

function normalizeIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? value : null;
}

function normalizeFeedback(value: unknown, validSteps: Set<number>): RecipeCookFeedback | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const completionStatus = record.completionStatus;
  const failedStepOrder = record.failedStepOrder;
  const reasonCode = record.reasonCode;
  const actualDurationSeconds = record.actualDurationSeconds;
  const submittedAt = normalizeIsoTimestamp(record.submittedAt);
  const syncedAt = record.syncedAt === null ? null : normalizeIsoTimestamp(record.syncedAt);

  if (
    typeof record.clientSubmissionId !== "string"
    || !UUID_PATTERN.test(record.clientSubmissionId)
    || !RECIPE_FEEDBACK_COMPLETION_STATUSES.includes(
      completionStatus as RecipeFeedbackCompletionStatus,
    )
    || !submittedAt
    || (record.syncedAt !== null && !syncedAt)
    || (
      actualDurationSeconds !== null
      && (
        !Number.isSafeInteger(actualDurationSeconds)
        || Number(actualDurationSeconds) < 1
        || Number(actualDurationSeconds) > MAX_FEEDBACK_DURATION_SECONDS
      )
    )
  ) {
    return null;
  }

  if (completionStatus === "failed") {
    if (!Number.isInteger(failedStepOrder) || !validSteps.has(failedStepOrder as number)) {
      return null;
    }
    if (
      reasonCode !== null
      && !RECIPE_FEEDBACK_FAILURE_REASONS.some((reason) => reason.code === reasonCode)
    ) {
      return null;
    }
  } else if (failedStepOrder !== null || reasonCode !== null) {
    return null;
  }

  return {
    clientSubmissionId: record.clientSubmissionId,
    completionStatus: completionStatus as RecipeFeedbackCompletionStatus,
    failedStepOrder: failedStepOrder as number | null,
    reasonCode: reasonCode as RecipeFeedbackFailureReason | null,
    actualDurationSeconds: actualDurationSeconds as number | null,
    submittedAt,
    syncedAt,
  };
}

export function normalizeRecipeCookProgress(
  value: unknown,
  stepIndexes: number[],
): RecipeCookProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if ((record.version !== 1 && record.version !== 2) || typeof record.updatedAt !== "string") {
    return null;
  }
  const validSteps = new Set(stepIndexes);
  const activeStepIndex = Number(record.activeStepIndex);
  const checkedStepIndexes = Array.isArray(record.checkedStepIndexes)
    ? [...new Set(record.checkedStepIndexes.filter(
        (item): item is number => Number.isInteger(item) && validSteps.has(item as number),
      ))]
    : [];
  const timerRecord = record.timer && typeof record.timer === "object" && !Array.isArray(record.timer)
    ? (record.timer as Record<string, unknown>)
    : null;
  const timer = timerRecord
    && Number.isInteger(timerRecord.stepIndex)
    && validSteps.has(timerRecord.stepIndex as number)
    && typeof timerRecord.endsAt === "number"
    && Number.isFinite(timerRecord.endsAt)
    && Number.isInteger(timerRecord.durationSeconds)
    && (timerRecord.durationSeconds as number) >= 1
    && (timerRecord.durationSeconds as number) <= MAX_TIMER_SECONDS
      ? {
          stepIndex: timerRecord.stepIndex as number,
          endsAt: timerRecord.endsAt,
          durationSeconds: timerRecord.durationSeconds as number,
        }
      : null;

  return {
    version: 2,
    activeStepIndex:
      Number.isInteger(activeStepIndex) && activeStepIndex >= 0 && activeStepIndex < stepIndexes.length
        ? activeStepIndex
        : 0,
    checkedStepIndexes,
    timer,
    startedAt: record.version === 2 ? normalizeIsoTimestamp(record.startedAt) : null,
    completedAt: normalizeIsoTimestamp(record.completedAt),
    feedback: record.version === 2 ? normalizeFeedback(record.feedback, validSteps) : null,
    updatedAt: record.updatedAt,
  };
}
