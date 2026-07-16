// 이 API는 승인된 운영자에게 구조화 레시피 후기 검수 큐를 제공합니다.
import { NextResponse } from "next/server";

import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { noStoreHeaders } from "@/lib/request-security";
import {
  getAuthorizedAdminEmail,
  getServerSupabaseAdminClient,
  hasConfiguredAdminEmails,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: noStoreHeaders() });
}

export async function GET(request: Request) {
  const rateLimit = await consumeDistributedRateLimit(request, "admin:recipe-reviews:list", {
    limit: 60,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  if (rateLimit.status === "unavailable") return jsonError("운영자 요청 제한 설정을 확인 중입니다.", 503);
  if (!hasConfiguredAdminEmails()) return jsonError("운영자 설정을 확인 중입니다.", 503);

  try {
    const adminEmail = await getAuthorizedAdminEmail(request.headers.get("authorization"));
    if (!adminEmail) return jsonError("운영자 권한이 없습니다.", 403);
    const { data, error } = await getServerSupabaseAdminClient()
      .from("recipe_comments")
      .select("id,recipe_id,author_name,content,status,outcome,taste,remake_intent,actual_duration_minutes,substitution_notes,family_reaction,moderated_by,moderated_at,moderation_note,created_at,updated_at")
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return jsonError("후기 검수 목록을 불러오지 못했습니다.", 500);
    return NextResponse.json({ adminEmail, reviews: data ?? [] }, { headers: noStoreHeaders() });
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) return jsonError("운영자 설정을 확인 중입니다.", 503);
    return jsonError("후기 검수 목록을 불러오지 못했습니다.", 500);
  }
}
