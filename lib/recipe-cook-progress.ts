export type RecipeCookFeedback = "easy" | "okay" | "hard";

export type RecipeCookTimer = {
  stepIndex: number;
  endsAt: number;
  durationSeconds: number;
  pausedRemainingSeconds?: number | null;
};

export type RecipeCookProgress = {
  version: 2;
  clientSessionId: string | null;
  startedAt: string | null;
  activeStepIndex: number;
  checkedStepIndexes: number[];
  timers: RecipeCookTimer[];
  completedAt: string | null;
  feedback: RecipeCookFeedback | null;
  updatedAt: string;
};

const MAX_TIMER_SECONDS = 24 * 60 * 60;

export function recipeCookProgressKey(recipeId: string): string {
  return `jipbab:recipe-cook-progress:v1:${recipeId}`;
}

export function remainingTimerSeconds(timer: RecipeCookTimer | null, now = Date.now()): number {
  if (!timer) return 0;
  if (Number.isInteger(timer.pausedRemainingSeconds) && Number(timer.pausedRemainingSeconds) >= 0) {
    return Number(timer.pausedRemainingSeconds);
  }
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
  return { stepIndex, durationSeconds, endsAt: now + durationSeconds * 1000, pausedRemainingSeconds: null };
}

export function pauseRecipeCookTimer(
  timer: RecipeCookTimer | null,
  now = Date.now(),
): RecipeCookTimer | null {
  if (!timer) return null;
  const remaining = remainingTimerSeconds(timer, now);
  return { ...timer, pausedRemainingSeconds: remaining };
}

export function resumeRecipeCookTimer(
  timer: RecipeCookTimer | null,
  now = Date.now(),
): RecipeCookTimer | null {
  if (!timer || !Number.isInteger(timer.pausedRemainingSeconds)) return timer;
  const remaining = Number(timer.pausedRemainingSeconds);
  return {
    ...timer,
    endsAt: now + remaining * 1000,
    pausedRemainingSeconds: null,
  };
}

export function upsertRecipeCookTimer(
  timers: RecipeCookTimer[],
  timer: RecipeCookTimer,
): RecipeCookTimer[] {
  return [
    ...timers.filter((candidate) => candidate.stepIndex !== timer.stepIndex),
    timer,
  ].sort((left, right) => left.stepIndex - right.stepIndex);
}

function normalizeRecipeCookTimer(
  value: unknown,
  validSteps: Set<number>,
): RecipeCookTimer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const timerRecord = value as Record<string, unknown>;
  if (
    !Number.isInteger(timerRecord.stepIndex) ||
    !validSteps.has(timerRecord.stepIndex as number) ||
    typeof timerRecord.endsAt !== "number" ||
    !Number.isFinite(timerRecord.endsAt) ||
    !Number.isInteger(timerRecord.durationSeconds) ||
    (timerRecord.durationSeconds as number) < 1 ||
    (timerRecord.durationSeconds as number) > MAX_TIMER_SECONDS
  ) {
    return null;
  }

  return {
    stepIndex: timerRecord.stepIndex as number,
    endsAt: timerRecord.endsAt,
    durationSeconds: timerRecord.durationSeconds as number,
    pausedRemainingSeconds:
      timerRecord.pausedRemainingSeconds === null || timerRecord.pausedRemainingSeconds === undefined
        ? null
        : Number.isInteger(timerRecord.pausedRemainingSeconds)
          && Number(timerRecord.pausedRemainingSeconds) >= 0
          && Number(timerRecord.pausedRemainingSeconds) <= Number(timerRecord.durationSeconds)
          ? Number(timerRecord.pausedRemainingSeconds)
          : null,
  };
}

export function normalizeRecipeCookProgress(
  value: unknown,
  stepIndexes: number[],
): RecipeCookProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if ((record.version !== 1 && record.version !== 2) || typeof record.updatedAt !== "string") return null;
  const validSteps = new Set(stepIndexes);
  const activeStepIndex = Number(record.activeStepIndex);
  const checkedStepIndexes = Array.isArray(record.checkedStepIndexes)
    ? [...new Set(record.checkedStepIndexes.filter(
        (item): item is number => Number.isInteger(item) && validSteps.has(item as number),
      ))]
    : [];
  const timerValues = record.version === 1
    ? [record.timer]
    : Array.isArray(record.timers) ? record.timers : [];
  const timerByStep = new Map<number, RecipeCookTimer>();
  for (const timerValue of timerValues) {
    const timer = normalizeRecipeCookTimer(timerValue, validSteps);
    if (timer) timerByStep.set(timer.stepIndex, timer);
  }
  const feedback = record.feedback === "easy" || record.feedback === "okay" || record.feedback === "hard"
    ? record.feedback
    : null;
  const clientSessionId = typeof record.clientSessionId === "string" && record.clientSessionId.length <= 64
    ? record.clientSessionId
    : null;
  const startedAt = typeof record.startedAt === "string" && Number.isFinite(Date.parse(record.startedAt))
    ? new Date(record.startedAt).toISOString()
    : null;

  return {
    version: 2,
    clientSessionId,
    startedAt,
    activeStepIndex:
      Number.isInteger(activeStepIndex) && activeStepIndex >= 0 && activeStepIndex < stepIndexes.length
        ? activeStepIndex
        : 0,
    checkedStepIndexes,
    timers: [...timerByStep.values()].sort((left, right) => left.stepIndex - right.stepIndex),
    completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
    feedback,
    updatedAt: record.updatedAt,
  };
}
