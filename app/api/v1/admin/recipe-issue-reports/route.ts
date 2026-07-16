// 이 파일은 승인된 운영자에게 비공개 레시피 오류 신고 목록을 제공합니다.
import { NextResponse } from "next/server";

import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  getAuthorizedAdminEmail,
  getServerSupabaseAdminClient,
  hasConfiguredAdminEmails,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";
import { noStoreHeaders } from "@/lib/request-security";
import { RECIPE_ISSUE_STATUSES, type RecipeIssueStatus } from "@/lib/recipe-issue-report";
import { logTelemetry } from "@/lib/telemetry";

const STATUS_SET = new Set<string>(RECIPE_ISSUE_STATUSES);

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: noStoreHeaders() });
}

export async function GET(request: Request) {
  const rateLimit = await consumeDistributedRateLimit(request, "admin:recipe-issue-reports:list", {
    limit: 60,
    windowSeconds: 60,
  });
  if (rateLimit.status === "limited") {
    return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  }
  if (rateLimit.status === "unavailable") {
    return jsonError("운영자 요청 제한 설정을 확인 중입니다.", 503);
  }
  if (!hasConfiguredAdminEmails()) {
    return jsonError("운영자 설정을 확인 중입니다.", 503);
  }

  try {
    const adminEmail = await getAuthorizedAdminEmail(request.headers.get("authorization"));
    if (!adminEmail) {
      return jsonError("운영자 권한이 없습니다.", 403);
    }

    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status")?.trim().toLowerCase() ?? "";
    const status = STATUS_SET.has(requestedStatus)
      ? requestedStatus as RecipeIssueStatus
      : null;
    const client = getServerSupabaseAdminClient();
    let query = client
      .from("recipe_issue_reports")
      .select(
        "id,recipe_id,user_id,issue_type,details,status,resolution_note,resolution_recipe_version_id,triaged_by,triaged_at,resolved_at,created_at,updated_at,recipes!inner(title,version)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (status) {
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) {
      logTelemetry("error", "recipe_issue_reports.admin_list_failed", { error });
      return jsonError("오류 신고 목록을 불러오지 못했습니다.", 500);
    }

    return NextResponse.json(
      { adminEmail, reports: data ?? [] },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return jsonError("운영자 설정을 확인 중입니다.", 503);
    }
    logTelemetry("error", "recipe_issue_reports.admin_list_unhandled", { error });
    return jsonError("오류 신고 목록을 불러오지 못했습니다.", 500);
  }
}
