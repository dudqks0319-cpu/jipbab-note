export type CookModeRolloutDecision = {
  enabled: boolean;
  percentage: number;
  bucket: number | null;
  source: "default" | "configured" | "invalid";
};

const ROLLOUT_PERCENT_PATTERN = /^(?:0|[1-9]\d?|100)$/;

export function cookModeRolloutBucket(recipeId: string): number {
  let hash = 2166136261;
  const normalizedRecipeId = recipeId.toLowerCase();

  for (let index = 0; index < normalizedRecipeId.length; index += 1) {
    hash ^= normalizedRecipeId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 100;
}

export function resolveCookModeRollout(
  recipeId: string,
  rawPercentage: string | undefined = process.env.COOK_MODE_ROLLOUT_PERCENT,
): CookModeRolloutDecision {
  if (!recipeId || recipeId !== recipeId.trim()) {
    return {
      enabled: false,
      percentage: 0,
      bucket: null,
      source: "invalid",
    };
  }

  const bucket = cookModeRolloutBucket(recipeId);

  if (rawPercentage === undefined) {
    return {
      enabled: true,
      percentage: 100,
      bucket,
      source: "default",
    };
  }

  if (!ROLLOUT_PERCENT_PATTERN.test(rawPercentage)) {
    return {
      enabled: false,
      percentage: 0,
      bucket,
      source: "invalid",
    };
  }

  const percentage = Number(rawPercentage);
  return {
    enabled: bucket < percentage,
    percentage,
    bucket,
    source: "configured",
  };
}
