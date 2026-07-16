// 이 파일은 운영자의 레시피 오류 신고 상태 변경을 검증하고 감사 이력으로 남깁니다.
import { NextResponse } from "next/server";

import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  isAllowedRecipeIssueStatusTransition,
  parseRecipeIssueTriageInput,
  type RecipeIssueStatus,
} from "@/lib/recipe-issue-report";
import { isUuidLike, noStoreHeaders, readBoundedJsonObject } from "@/lib/request-security";
import {
  getAuthorizedAdminEmail,
  getServerSupabaseAdminClient,
  hasConfiguredAdminEmails,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";
import { logTelemetry } from "@/lib/telemetry";

const MAX_BODY_BYTES = 3 * 1024;

type CurrentReport = {
  id: string;
  recipe_id: string;
  status: RecipeIssueStatus;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: noStoreHeaders() });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const rateLimit = await consumeDistributedRateLimit(request, "admin:recipe-issue-reports:update", {
    limit: 30,
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
    const { id } = await context.params;
    if (!isUuidLike(id)) {
      return jsonError("오류 신고 ID를 확인해 주세요.", 400);
    }
    const body = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (body.status === "too_large") {
      return jsonError("처리 메모가 너무 깁니다.", 413);
    }
    if (body.status !== "ok") {
      return jsonError("요청 본문을 확인해 주세요.", 400);
    }

    let input;
    try {
      input = parseRecipeIssueTriageInput(body.value);
    } catch {
      return jsonError("상태, 해결 메모, 레시피 버전 ID를 확인해 주세요.", 400);
    }

    const client = getServerSupabaseAdminClient();
    const { data: current, error: currentError } = await client
      .from("recipe_issue_reports")
      .select("id,recipe_id,status")
      .eq("id", id)
      .maybeSingle<CurrentReport>();
    if (currentError) {
      logTelemetry("error", "recipe_issue_reports.admin_fetch_failed", { error: currentError, id });
      return jsonError("오류 신고를 불러오지 못했습니다.", 500);
    }
    if (!current) {
      return jsonError("오류 신고를 찾지 못했습니다.", 404);
    }
    if (!isAllowedRecipeIssueStatusTransition(current.status, input.status)) {
      return jsonError("현재 상태에서 요청한 상태로 변경할 수 없습니다.", 409);
    }

    const { data: updated, error: updateError } = await client.rpc(
      "transition_recipe_issue_report",
      {
        target_report_id: id,
        input_expected_status: current.status,
        input_next_status: input.status,
        input_actor_email: adminEmail,
        input_resolution_note: input.resolutionNote,
        input_resolution_recipe_version_id: input.resolutionRecipeVersionId,
      },
    );
    if (updateError) {
      const knownMessage = updateError.message ?? "";
      if (knownMessage.includes("report_status_conflict")) {
        return jsonError("다른 운영자가 먼저 상태를 변경했습니다. 목록을 새로고침해 주세요.", 409);
      }
      if (knownMessage.includes("recipe_version_mismatch")) {
        return jsonError("해당 레시피에 속한 버전 ID가 아닙니다.", 400);
      }
      logTelemetry("error", "recipe_issue_reports.admin_update_failed", { error: updateError, id });
      return jsonError("오류 신고 상태를 저장하지 못했습니다.", 500);
    }
    if (!updated) {
      return jsonError("오류 신고 상태를 저장하지 못했습니다.", 500);
    }

    return NextResponse.json(
      { adminEmail, report: updated },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return jsonError("운영자 설정을 확인 중입니다.", 503);
    }
    logTelemetry("error", "recipe_issue_reports.admin_update_unhandled", { error });
    return jsonError("오류 신고 상태를 저장하지 못했습니다.", 500);
  }
}
