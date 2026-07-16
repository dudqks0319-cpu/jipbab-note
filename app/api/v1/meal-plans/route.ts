// 이 파일은 로그인 사용자의 실제 주간 식단을 조회하고 원자적으로 교체합니다.
import { createApiV1Responder } from "@/lib/api-v1-response";
import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { parseMealPlanInput } from "@/lib/meal-plan";
import { readBoundedJsonObject } from "@/lib/request-security";
import { isPermanentSupabaseUser } from "@/lib/supabase-session";
import {
  getAuthenticatedServerUser,
  getServerSupabaseAdminClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

const MAX_BODY_BYTES = 32 * 1024;

async function requireUser(request: Request) {
  const user = await getAuthenticatedServerUser(request.headers.get("authorization"));
  return isPermanentSupabaseUser(user) ? user : null;
}

export async function GET(request: Request) {
  const respond = createApiV1Responder("GET /api/v1/meal-plans");
  const rateLimit = await consumeDistributedRateLimit(request, "meal-plans:read", {
    limit: 30,
    windowSeconds: 60,
  });
  if (rateLimit.status !== "allowed") {
    return respond.error(
      rateLimit.status === "limited" ? "RATE_LIMITED" : "DEPENDENCY_NOT_READY",
      "식단을 잠시 후 다시 불러와 주세요.",
      rateLimit.status === "limited" ? 429 : 503,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  try {
    const user = await requireUser(request);
    if (!user) return respond.error("UNAUTHORIZED", "로그인하면 식단을 동기화할 수 있습니다.", 401);
    const url = new URL(request.url);
    let weekStart: string;
    try {
      weekStart = parseMealPlanInput({ weekStart: url.searchParams.get("weekStart"), items: [] }).weekStart;
    } catch {
      return respond.error("INVALID_QUERY", "월요일 기준 주 시작일을 확인해 주세요.", 400);
    }

    const admin = getServerSupabaseAdminClient();
    const { data: plan, error: planError } = await admin
      .from("meal_plans")
      .select("id,week_start,updated_at")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (planError) {
      return respond.error("DEPENDENCY_NOT_READY", "식단 동기화 기능을 준비 중입니다.", 503, { retryAfter: 60 });
    }
    if (!plan) return respond.success({ weekStart, items: [], updatedAt: null });

    const { data: rows, error: itemError } = await admin
      .from("meal_plan_items")
      .select("meal_date,meal_type,entry_kind,recipe_id,title,servings")
      .eq("meal_plan_id", plan.id)
      .order("meal_date", { ascending: true })
      .order("meal_type", { ascending: true });
    if (itemError) {
      return respond.error("DEPENDENCY_NOT_READY", "식단을 불러오지 못했습니다.", 503, { retryAfter: 60 });
    }

    return respond.success({
      weekStart,
      items: (rows ?? []).map((row) => ({
        date: row.meal_date,
        mealType: row.meal_type,
        kind: row.entry_kind,
        recipeId: row.recipe_id,
        title: row.title,
        servings: row.servings,
      })),
      updatedAt: plan.updated_at,
    });
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return respond.error("DEPENDENCY_NOT_READY", "식단 동기화 기능을 준비 중입니다.", 503, { retryAfter: 60 });
    }
    return respond.error("INTERNAL_ERROR", "식단을 불러오지 못했습니다.", 500);
  }
}

export async function PUT(request: Request) {
  const respond = createApiV1Responder("PUT /api/v1/meal-plans");
  const rateLimit = await consumeDistributedRateLimit(request, "meal-plans:write", {
    limit: 20,
    windowSeconds: 60,
  });
  if (rateLimit.status !== "allowed") {
    return respond.error(
      rateLimit.status === "limited" ? "RATE_LIMITED" : "DEPENDENCY_NOT_READY",
      "식단 저장을 잠시 후 다시 시도해 주세요.",
      rateLimit.status === "limited" ? 429 : 503,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  try {
    const user = await requireUser(request);
    if (!user) return respond.error("UNAUTHORIZED", "로그인하면 식단을 동기화할 수 있습니다.", 401);
    const body = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (body.status !== "ok") {
      return respond.error("INVALID_BODY", "식단 입력을 확인해 주세요.", body.status === "too_large" ? 413 : 400);
    }
    let input;
    try {
      input = parseMealPlanInput(body.value);
    } catch {
      return respond.error("INVALID_BODY", "식단 날짜와 메뉴를 확인해 주세요.", 400);
    }

    const recipeIds = [...new Set(input.items.flatMap((item) => item.recipeId ? [item.recipeId] : []))];
    const admin = getServerSupabaseAdminClient();
    const canonicalRecipeTitles = new Map<string, string>();
    if (recipeIds.length > 0) {
      const { data: recipes, error: recipeError } = await admin
        .from("recipes")
        .select("id,title")
        .in("id", recipeIds)
        .eq("schema_version", 2)
        .eq("review_status", "approved")
        .not("published_at", "is", null);
      if (recipeError) {
        return respond.error("DEPENDENCY_NOT_READY", "식단 저장 기능을 준비 중입니다.", 503, { retryAfter: 60 });
      }
      if (new Set((recipes ?? []).map((recipe) => recipe.id)).size !== recipeIds.length) {
        return respond.error("INVALID_BODY", "현재 공개된 레시피만 식단에 저장할 수 있습니다.", 400);
      }
      for (const recipe of recipes ?? []) canonicalRecipeTitles.set(recipe.id, recipe.title);
    }
    const canonicalItems = input.items.map((item) => item.recipeId
      ? { ...item, title: canonicalRecipeTitles.get(item.recipeId) ?? item.title }
      : item);

    const { data: plan, error: planError } = await admin
      .from("meal_plans")
      .upsert({ user_id: user.id, week_start: input.weekStart, timezone: "Asia/Seoul" }, {
        onConflict: "user_id,week_start",
      })
      .select("id,updated_at")
      .single();
    if (planError || !plan) {
      return respond.error("DEPENDENCY_NOT_READY", "식단을 저장하지 못했습니다.", 503, { retryAfter: 60 });
    }

    const { error: replaceError } = await admin.rpc("replace_meal_plan_items", {
      input_plan_id: plan.id,
      input_items: canonicalItems.map((item) => ({
        meal_date: item.date,
        meal_type: item.mealType,
        entry_kind: item.kind,
        recipe_id: item.recipeId,
        title: item.title,
        servings: item.servings,
      })),
    });
    if (replaceError) {
      return respond.error("DEPENDENCY_NOT_READY", "식단을 저장하지 못했습니다.", 503, { retryAfter: 60 });
    }

    return respond.success({ weekStart: input.weekStart, items: canonicalItems, updatedAt: plan.updated_at });
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return respond.error("DEPENDENCY_NOT_READY", "식단 동기화 기능을 준비 중입니다.", 503, { retryAfter: 60 });
    }
    return respond.error("INTERNAL_ERROR", "식단을 저장하지 못했습니다.", 500);
  }
}
