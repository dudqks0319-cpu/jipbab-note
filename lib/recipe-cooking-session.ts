// 이 파일은 사용자가 명시적으로 저장하는 조리 완료 세션의 입력 계약을 검증합니다.

export const COOKING_OUTCOMES = [
  { id: "success", label: "성공했어요" },
  { id: "partial", label: "조금 아쉬워요" },
  { id: "failed", label: "실패했어요" },
] as const;

export const COOKING_TASTES = [
  { id: "not_rated", label: "맛 평가는 건너뛸게요" },
  { id: "bland", label: "싱거웠어요" },
  { id: "balanced", label: "적당했어요" },
  { id: "salty", label: "짰어요" },
] as const;

export const COOKING_REMAKE_INTENTS = [
  { id: "yes", label: "다시 만들래요" },
  { id: "maybe", label: "아직 모르겠어요" },
  { id: "no", label: "다시 만들지 않을래요" },
] as const;

export type CookingOutcome = (typeof COOKING_OUTCOMES)[number]["id"];
export type CookingTaste = (typeof COOKING_TASTES)[number]["id"];
export type CookingRemakeIntent = (typeof COOKING_REMAKE_INTENTS)[number]["id"];
export type CookingDifficulty = "easy" | "okay" | "hard";

const OUTCOME_IDS = new Set<string>(COOKING_OUTCOMES.map((item) => item.id));
const TASTE_IDS = new Set<string>(COOKING_TASTES.map((item) => item.id));
const REMAKE_IDS = new Set<string>(COOKING_REMAKE_INTENTS.map((item) => item.id));
const DIFFICULTY_IDS = new Set<string>(["easy", "okay", "hard"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS = new Set([
  "clientSessionId",
  "startedAt",
  "completedAt",
  "actualDurationMinutes",
  "outcome",
  "difficulty",
  "taste",
  "remakeIntent",
  "substituteNotes",
  "familyReaction",
  "comment",
]);

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("invalid_cooking_session");
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("invalid_cooking_session");
  return normalized;
}

function parseTimestamp(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("invalid_cooking_session");
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("invalid_cooking_session");
  return new Date(timestamp).toISOString();
}

export function parseRecipeCookingSessionInput(value: unknown, now = new Date()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_cooking_session");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !ALLOWED_KEYS.has(key))) {
    throw new Error("invalid_cooking_session");
  }

  const clientSessionId = typeof input.clientSessionId === "string"
    ? input.clientSessionId.trim()
    : "";
  const startedAt = parseTimestamp(input.startedAt);
  const completedAt = parseTimestamp(input.completedAt);
  const actualDurationMinutes = Number(input.actualDurationMinutes);
  const outcome = typeof input.outcome === "string" ? input.outcome.trim() : "";
  const difficulty = typeof input.difficulty === "string" ? input.difficulty.trim() : "";
  const taste = typeof input.taste === "string" ? input.taste.trim() : "";
  const remakeIntent = typeof input.remakeIntent === "string" ? input.remakeIntent.trim() : "";

  if (
    !UUID_PATTERN.test(clientSessionId)
    || !Number.isInteger(actualDurationMinutes)
    || actualDurationMinutes < 1
    || actualDurationMinutes > 1440
    || !OUTCOME_IDS.has(outcome)
    || !DIFFICULTY_IDS.has(difficulty)
    || !TASTE_IDS.has(taste)
    || !REMAKE_IDS.has(remakeIntent)
  ) {
    throw new Error("invalid_cooking_session");
  }

  const startedTimestamp = Date.parse(startedAt);
  const completedTimestamp = Date.parse(completedAt);
  const nowTimestamp = now.getTime();
  if (
    !Number.isFinite(nowTimestamp)
    || completedTimestamp < startedTimestamp
    || completedTimestamp - startedTimestamp > 48 * 60 * 60 * 1000
    || startedTimestamp < nowTimestamp - 48 * 60 * 60 * 1000
    || completedTimestamp > nowTimestamp + 5 * 60 * 1000
  ) {
    throw new Error("invalid_cooking_session");
  }

  return {
    clientSessionId,
    startedAt,
    completedAt,
    actualDurationMinutes,
    outcome: outcome as CookingOutcome,
    difficulty: difficulty as CookingDifficulty,
    taste: taste as CookingTaste,
    remakeIntent: remakeIntent as CookingRemakeIntent,
    substituteNotes: optionalText(input.substituteNotes, 300),
    familyReaction: optionalText(input.familyReaction, 300),
    comment: optionalText(input.comment, 500),
  };
}
