import { createApiV1Responder } from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  getPublicRecipeDetailV1,
  RecipeApiDependencyError,
} from "@/lib/recipe-api-v1-repository";
import { readBoundedJsonObject } from "@/lib/request-security";
import {
  buildShoppingFromRecipeCandidates,
  buildShoppingFromRecipeUpserts,
  parseShoppingFromRecipeV1Input,
  ShoppingFromRecipeValidationError,
  type ShoppingFromRecipeDatabaseRow,
} from "@/lib/shopping-from-recipe";
import {
  getAuthenticatedServerUser,
  getBearerAccessToken,
  getServerSupabaseAdminClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

const MAX_BODY_BYTES = 8 * 1024;
const SHOPPING_COLUMNS = [
  "id",
  "device_id",
  "user_id",
  "family_group_id",
  "name",
  "quantity",
  "category",
  "checked",
  "source_recipe_id",
  "source_recipe_name",
].join(",");
const DEPENDENCY_ERROR_CODES = new Set(["42P01", "42501", "PGRST204", "PGRST205"]);

function isDependencyError(error: { code?: string | null } | null): boolean {
  return Boolean(error && DEPENDENCY_ERROR_CODES.has(error.code ?? ""));
}

export async function POST(request: Request) {
  const respond = createApiV1Responder("POST /api/v1/shopping/items/from-recipe");
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return respond.error("INVALID_BODY", "요청 본문이 너무 큽니다.", 413);
  }

  const rateLimit = await consumeDistributedRateLimit(request, "shopping:from-recipe", {
    limit: 20,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") {
    return respond.error("RATE_LIMITED", "요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, {
      retryAfter: rateLimit.retryAfter,
    });
  }
  if (rateLimit.status === "unavailable") {
    return respond.error("DEPENDENCY_NOT_READY", "장보기 API를 준비 중입니다.", 503, {
      retryAfter: rateLimit.retryAfter,
    });
  }

  const authorizationHeader = request.headers.get("authorization");
  if (!getBearerAccessToken(authorizationHeader)) {
    return respond.error("UNAUTHORIZED", "서명된 세션이 필요합니다.", 401);
  }

  try {
    const user = await getAuthenticatedServerUser(authorizationHeader);
    if (!user) {
      return respond.error("UNAUTHORIZED", "서명된 세션을 확인하지 못했습니다.", 401);
    }

    const bodyResult = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (bodyResult.status === "too_large") {
      return respond.error("INVALID_BODY", "요청 본문이 너무 큽니다.", 413);
    }
    if (bodyResult.status === "invalid") {
      return respond.error("INVALID_BODY", "장보기 요청 형식을 확인해 주세요.", 400);
    }

    const input = parseShoppingFromRecipeV1Input(bodyResult.value);
    const recipe = await getPublicRecipeDetailV1(input.recipeId);
    if (!recipe) {
      return respond.error("NOT_FOUND", "공개된 레시피를 찾을 수 없습니다.", 404);
    }
    const candidates = buildShoppingFromRecipeCandidates(recipe, input);

    const client = getServerSupabaseAdminClient();
    const existingResult = await client
      .from("shopping_items")
      .select(SHOPPING_COLUMNS)
      .eq("user_id", user.id)
      .is("family_group_id", null)
      .order("updated_at", { ascending: false });
    if (isDependencyError(existingResult.error)) {
      return respond.error("DEPENDENCY_NOT_READY", "장보기 저장소를 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    if (existingResult.error || !Array.isArray(existingResult.data)) {
      return respond.error("INTERNAL_ERROR", "장보기 목록을 확인하지 못했습니다.", 500);
    }

    const existingRows = existingResult.data as unknown as ShoppingFromRecipeDatabaseRow[];
    const upserts = buildShoppingFromRecipeUpserts(existingRows, candidates, user.id);
    const upsertResult = await client
      .from("shopping_items")
      .upsert(upserts.rows, { onConflict: "id" })
      .select(SHOPPING_COLUMNS);
    if (isDependencyError(upsertResult.error)) {
      return respond.error("DEPENDENCY_NOT_READY", "장보기 저장소를 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    const savedRows = upsertResult.data as unknown as ShoppingFromRecipeDatabaseRow[] | null;
    if (
      upsertResult.error ||
      !Array.isArray(savedRows) ||
      savedRows.length !== upserts.rows.length ||
      savedRows.some((row) => row.user_id !== user.id || row.family_group_id !== null)
    ) {
      return respond.error("INTERNAL_ERROR", "장보기 목록에 담지 못했습니다.", 500);
    }

    const mergedIds = new Set(existingRows.map((row) => row.id));
    return respond.success({
      recipeId: input.recipeId,
      servings: input.servings,
      addedCount: upserts.addedCount,
      mergedCount: upserts.mergedCount,
      items: upserts.rows.map((row) => ({
        id: row.id,
        name: row.name,
        quantity: row.quantity,
        category: row.category,
        action: mergedIds.has(row.id) ? "merged" as const : "added" as const,
      })),
    }, upserts.addedCount > 0 ? 201 : 200);
  } catch (error) {
    if (error instanceof ShoppingFromRecipeValidationError) {
      return respond.error("INVALID_BODY", error.message, 400);
    }
    if (error instanceof RecipeApiDependencyError || isMissingServerSupabaseConfigError(error)) {
      return respond.error("DEPENDENCY_NOT_READY", "장보기 API를 준비 중입니다.", 503, {
        retryAfter: 60,
      });
    }
    return respond.error("INTERNAL_ERROR", "장보기 목록에 담지 못했습니다.", 500);
  }
}
