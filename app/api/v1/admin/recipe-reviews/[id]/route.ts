// 이 API는 운영자의 후기 공개·숨김·반려 결정을 원자적 감사 이력으로 저장합니다.
import { NextResponse } from "next/server";

import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { parseRecipeReviewModerationInput } from "@/lib/public-recipe-review";
import { isUuidLike, noStoreHeaders, readBoundedJsonObject } from "@/lib/request-security";
import {
  getAuthorizedAdminEmail,
  getServerSupabaseAdminClient,
  hasConfiguredAdminEmails,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

const MAX_BODY_BYTES = 2 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: noStoreHeaders() });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const rateLimit = await consumeDistributedRateLimit(request, "admin:recipe-reviews:update", {
    limit: 30,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  if (rateLimit.status === "unavailable") return jsonError("운영자 요청 제한 설정을 확인 중입니다.", 503);
  if (!hasConfiguredAdminEmails()) return jsonError("운영자 설정을 확인 중입니다.", 503);

  try {
    const adminEmail = await getAuthorizedAdminEmail(request.headers.get("authorization"));
    if (!adminEmail) return jsonError("운영자 권한이 없습니다.", 403);
    const { id } = await context.params;
    if (!isUuidLike(id)) return jsonError("후기 ID를 확인해 주세요.", 400);
    const body = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (body.status === "too_large") return jsonError("검수 메모가 너무 깁니다.", 413);
    if (body.status !== "ok") return jsonError("검수 요청을 확인해 주세요.", 400);
    let input;
    try {
      input = parseRecipeReviewModerationInput(body.value);
    } catch {
      return jsonError("검수 상태와 메모를 확인해 주세요.", 400);
    }

    const client = getServerSupabaseAdminClient();
    const { data: current, error: currentError } = await client
      .from("recipe_comments")
      .select("id,status")
      .eq("id", id)
      .maybeSingle<{ id: string; status: string }>();
    if (currentError) return jsonError("후기를 불러오지 못했습니다.", 500);
    if (!current) return jsonError("후기를 찾지 못했습니다.", 404);
    if (current.status === "deleted" || current.status === input.status) {
      return jsonError("현재 상태에서는 요청한 검수 상태로 변경할 수 없습니다.", 409);
    }

    const { data, error } = await client.rpc("moderate_recipe_comment", {
      target_comment_id: id,
      input_expected_status: current.status,
      input_next_status: input.status,
      input_actor_email: adminEmail,
      input_note: input.note,
    });
    if (error) {
      if ((error.message ?? "").includes("comment_status_conflict")) {
        return jsonError("다른 운영자가 먼저 상태를 변경했습니다. 목록을 새로고침해 주세요.", 409);
      }
      return jsonError("후기 검수 상태를 저장하지 못했습니다.", 500);
    }
    return NextResponse.json({ adminEmail, review: data }, { headers: noStoreHeaders() });
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) return jsonError("운영자 설정을 확인 중입니다.", 503);
    return jsonError("후기 검수 상태를 저장하지 못했습니다.", 500);
  }
}
