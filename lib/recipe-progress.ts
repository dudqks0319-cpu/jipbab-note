export const MAX_RECIPE_PROGRESS_STEPS = 100;
export const MAX_RECIPE_PROGRESS_SERVINGS = 20;
export const MAX_RECIPE_PROGRESS_TIMER_SECONDS = 24 * 60 * 60;

export type RecipeProgressTimerV1 = {
  stepIndex: number;
  endsAt: string;
  durationSeconds: number;
};

export type RecipeProgressV1Input = {
  recipeId: string;
  recipeVersion: number;
  servings: number;
  activeStepIndex: number;
  checkedStepIndexes: number[];
  timer: RecipeProgressTimerV1 | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  baseServerUpdatedAt: string | null;
};

export type RecipeProgressV1Query = Pick<RecipeProgressV1Input, "recipeId" | "servings">;

export type RecipeProgressDatabaseRow = {
  id: string;
  recipe_id: string;
  recipe_version: number;
  servings: number;
  active_step_index: number;
  checked_step_indexes: number[];
  timer_step_index: number | null;
  timer_ends_at: string | null;
  timer_duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  client_updated_at: string;
  created_at: string;
  updated_at: string;
};

export type RecipeProgressV1Data = {
  recipeId: string;
  recipeVersion: number;
  servings: number;
  activeStepIndex: number;
  checkedStepIndexes: number[];
  timer: RecipeProgressTimerV1 | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  serverUpdatedAt: string;
};

export class RecipeProgressValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipeProgressValidationError";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INPUT_KEYS = [
  "recipeId",
  "recipeVersion",
  "servings",
  "activeStepIndex",
  "checkedStepIndexes",
  "timer",
  "startedAt",
  "completedAt",
  "updatedAt",
  "baseServerUpdatedAt",
] as const;
const INPUT_KEY_SET = new Set<string>(INPUT_KEYS);
const TIMER_KEYS = ["stepIndex", "endsAt", "durationSeconds"] as const;
const TIMER_KEY_SET = new Set<string>(TIMER_KEYS);
const QUERY_KEY_SET = new Set(["recipeId", "servings"]);
const MAX_RECIPE_VERSION = 1_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function fail(message: string): never {
  throw new RecipeProgressValidationError(message);
}

function parseCanonicalTimestamp(value: unknown, message: string): string {
  if (typeof value !== "string") {
    fail(message);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(message);
  }
  return value;
}

function parseNullableTimestamp(value: unknown, message: string): string | null {
  return value === null ? null : parseCanonicalTimestamp(value, message);
}

export function normalizeRecipeProgressServerTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    fail("서버 기준 시각을 확인해 주세요.");
  }
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)(?:Z|\+00(?::?00)?)$/,
  );
  if (!match || !Number.isFinite(Date.parse(value))) {
    fail("서버 기준 시각을 확인해 주세요.");
  }
  return `${match[1]}Z`;
}

function parseRecipeId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    fail("레시피 식별자를 확인해 주세요.");
  }
  return value;
}

function parseServings(value: unknown): number {
  if (!isBoundedInteger(value, 1, MAX_RECIPE_PROGRESS_SERVINGS)) {
    fail("인분 수를 확인해 주세요.");
  }
  return value;
}

function parseTimer(value: unknown): RecipeProgressTimerV1 | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    fail("타이머 형식을 확인해 주세요.");
  }
  const keys = Object.keys(value);
  if (
    keys.length !== TIMER_KEYS.length
    || keys.some((key) => !TIMER_KEY_SET.has(key))
    || TIMER_KEYS.some((key) => !(key in value))
  ) {
    fail("허용되지 않은 타이머 항목이 있습니다.");
  }
  if (!isBoundedInteger(value.stepIndex, 1, MAX_RECIPE_PROGRESS_STEPS)) {
    fail("타이머 단계를 확인해 주세요.");
  }
  if (!isBoundedInteger(value.durationSeconds, 1, MAX_RECIPE_PROGRESS_TIMER_SECONDS)) {
    fail("타이머 시간을 확인해 주세요.");
  }
  return {
    stepIndex: value.stepIndex,
    endsAt: parseCanonicalTimestamp(value.endsAt, "타이머 종료 시각을 확인해 주세요."),
    durationSeconds: value.durationSeconds,
  };
}

export function parseRecipeProgressV1Input(value: unknown): RecipeProgressV1Input {
  if (!isRecord(value)) {
    fail("조리 진행 요청 형식을 확인해 주세요.");
  }

  const keys = Object.keys(value);
  if (
    keys.length !== INPUT_KEYS.length
    || keys.some((key) => !INPUT_KEY_SET.has(key))
    || INPUT_KEYS.some((key) => !(key in value))
  ) {
    fail("허용되지 않은 조리 진행 항목이 있습니다.");
  }

  const recipeId = parseRecipeId(value.recipeId);
  if (!isBoundedInteger(value.recipeVersion, 1, MAX_RECIPE_VERSION)) {
    fail("레시피 버전을 확인해 주세요.");
  }
  const servings = parseServings(value.servings);
  if (!isBoundedInteger(value.activeStepIndex, 0, MAX_RECIPE_PROGRESS_STEPS - 1)) {
    fail("현재 조리 단계를 확인해 주세요.");
  }
  if (!Array.isArray(value.checkedStepIndexes)) {
    fail("완료한 조리 단계 형식을 확인해 주세요.");
  }
  const checkedStepIndexes = value.checkedStepIndexes;
  if (
    checkedStepIndexes.length > MAX_RECIPE_PROGRESS_STEPS
    || checkedStepIndexes.some(
      (step) => !isBoundedInteger(step, 1, MAX_RECIPE_PROGRESS_STEPS),
    )
    || checkedStepIndexes.some((step, index) => index > 0 && step <= checkedStepIndexes[index - 1])
  ) {
    fail("완료한 조리 단계는 중복 없이 순서대로 보내 주세요.");
  }

  const timer = parseTimer(value.timer);
  const startedAt = parseNullableTimestamp(value.startedAt, "조리 시작 시각을 확인해 주세요.");
  const completedAt = parseNullableTimestamp(value.completedAt, "조리 완료 시각을 확인해 주세요.");
  if (startedAt && completedAt && Date.parse(completedAt) < Date.parse(startedAt)) {
    fail("조리 완료 시각은 시작 시각보다 빠를 수 없습니다.");
  }

  return {
    recipeId,
    recipeVersion: value.recipeVersion,
    servings,
    activeStepIndex: value.activeStepIndex,
    checkedStepIndexes: [...checkedStepIndexes],
    timer,
    startedAt,
    completedAt,
    updatedAt: parseCanonicalTimestamp(value.updatedAt, "진행 수정 시각을 확인해 주세요."),
    baseServerUpdatedAt: value.baseServerUpdatedAt === null
      ? null
      : normalizeRecipeProgressServerTimestamp(value.baseServerUpdatedAt),
  };
}

export function parseRecipeProgressV1Query(params: URLSearchParams): RecipeProgressV1Query {
  const keys = [...params.keys()];
  if (
    keys.length !== QUERY_KEY_SET.size
    || keys.some((key) => !QUERY_KEY_SET.has(key))
    || [...QUERY_KEY_SET].some((key) => params.getAll(key).length !== 1)
  ) {
    fail("조리 진행 조회 항목을 확인해 주세요.");
  }

  const servingsValue = params.get("servings");
  if (!servingsValue || !/^\d+$/.test(servingsValue)) {
    fail("인분 수를 확인해 주세요.");
  }

  return {
    recipeId: parseRecipeId(params.get("recipeId")),
    servings: parseServings(Number(servingsValue)),
  };
}

export function recipeProgressDatabaseValues(input: RecipeProgressV1Input, userId: string) {
  return {
    recipe_id: input.recipeId,
    recipe_version: input.recipeVersion,
    user_id: userId,
    servings: input.servings,
    active_step_index: input.activeStepIndex,
    checked_step_indexes: input.checkedStepIndexes,
    timer_step_index: input.timer?.stepIndex ?? null,
    timer_ends_at: input.timer?.endsAt ?? null,
    timer_duration_seconds: input.timer?.durationSeconds ?? null,
    started_at: input.startedAt,
    completed_at: input.completedAt,
    client_updated_at: input.updatedAt,
  };
}

function canonicalDatabaseTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("invalid recipe progress database timestamp");
  }
  return new Date(parsed).toISOString();
}

function canonicalNullableDatabaseTimestamp(value: string | null): string | null {
  return value === null ? null : canonicalDatabaseTimestamp(value);
}

export function recipeProgressV1Data(row: RecipeProgressDatabaseRow): RecipeProgressV1Data {
  const hasTimer = row.timer_step_index !== null
    && row.timer_ends_at !== null
    && row.timer_duration_seconds !== null;
  return {
    recipeId: row.recipe_id,
    recipeVersion: row.recipe_version,
    servings: row.servings,
    activeStepIndex: row.active_step_index,
    checkedStepIndexes: [...row.checked_step_indexes],
    timer: hasTimer ? {
      stepIndex: row.timer_step_index as number,
      endsAt: canonicalDatabaseTimestamp(row.timer_ends_at as string),
      durationSeconds: row.timer_duration_seconds as number,
    } : null,
    startedAt: canonicalNullableDatabaseTimestamp(row.started_at),
    completedAt: canonicalNullableDatabaseTimestamp(row.completed_at),
    updatedAt: canonicalDatabaseTimestamp(row.client_updated_at),
    serverUpdatedAt: normalizeRecipeProgressServerTimestamp(row.updated_at),
  };
}
