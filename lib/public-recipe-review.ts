// 이 파일은 공개 전 운영 검수가 필요한 구조화 요리 후기 입력을 제한합니다.
import type { CookingOutcome, CookingRemakeIntent, CookingTaste } from "./recipe-cooking-session.ts";

const OUTCOMES = new Set<string>(["success", "partial", "failed"]);
const TASTES = new Set<string>(["not_rated", "bland", "balanced", "salty"]);
const REMAKE_INTENTS = new Set<string>(["yes", "maybe", "no"]);
const ALLOWED_KEYS = new Set([
  "content",
  "outcome",
  "taste",
  "remakeIntent",
  "actualDurationMinutes",
  "substitutionNotes",
  "familyReaction",
]);

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("invalid_public_recipe_review");
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("invalid_public_recipe_review");
  return normalized;
}

export function parsePublicRecipeReviewInput(value: unknown): {
  content: string;
  outcome: CookingOutcome;
  taste: CookingTaste;
  remakeIntent: CookingRemakeIntent;
  actualDurationMinutes: number;
  substitutionNotes: string | null;
  familyReaction: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_public_recipe_review");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !ALLOWED_KEYS.has(key))) {
    throw new Error("invalid_public_recipe_review");
  }

  const content = typeof input.content === "string" ? input.content.trim() : "";
  const outcome = typeof input.outcome === "string" ? input.outcome.trim() : "";
  const taste = typeof input.taste === "string" ? input.taste.trim() : "";
  const remakeIntent = typeof input.remakeIntent === "string" ? input.remakeIntent.trim() : "";
  const actualDurationMinutes = Number(input.actualDurationMinutes);
  if (
    content.length < 3 ||
    content.length > 500 ||
    !OUTCOMES.has(outcome) ||
    !TASTES.has(taste) ||
    !REMAKE_INTENTS.has(remakeIntent) ||
    !Number.isInteger(actualDurationMinutes) ||
    actualDurationMinutes < 1 ||
    actualDurationMinutes > 1440
  ) {
    throw new Error("invalid_public_recipe_review");
  }

  return {
    content,
    outcome: outcome as CookingOutcome,
    taste: taste as CookingTaste,
    remakeIntent: remakeIntent as CookingRemakeIntent,
    actualDurationMinutes,
    substitutionNotes: optionalText(input.substitutionNotes, 300),
    familyReaction: optionalText(input.familyReaction, 300),
  };
}

export function parseRecipeReviewModerationInput(value: unknown): {
  status: "visible" | "hidden" | "rejected";
  note: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_recipe_review_moderation");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "status" && key !== "note")) {
    throw new Error("invalid_recipe_review_moderation");
  }
  const status = typeof input.status === "string" ? input.status.trim() : "";
  const note = optionalText(input.note, 1000);
  if (
    !["visible", "hidden", "rejected"].includes(status) ||
    ((status === "hidden" || status === "rejected") && (!note || note.length < 3))
  ) {
    throw new Error("invalid_recipe_review_moderation");
  }
  return { status: status as "visible" | "hidden" | "rejected", note };
}
