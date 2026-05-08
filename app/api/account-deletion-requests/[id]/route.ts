import { NextResponse } from "next/server";

import {
  getAuthorizedAdminEmail,
  getServerSupabaseAdminClient,
  hasConfiguredAdminEmails,
} from "@/lib/supabase-server";
import { logTelemetry } from "@/lib/telemetry";

const ALLOWED_STATUS = new Set(["requested", "reviewing", "completed", "rejected"]);
const ACCOUNT_DELETE_ACTION = "delete-account";
const INTERNAL_ERROR_MESSAGE = "요청 처리 중 오류가 발생했습니다.";

type PatchBody = {
  action?: string;
  confirmUserId?: string;
  status?: string;
};

type CurrentDeletionRequest = {
  email: string | null;
  id: string;
  status: string;
  user_id: string | null;
};

function internalError(event: string, metadata: unknown) {
  logTelemetry("error", event, metadata);
  return NextResponse.json({ message: INTERNAL_ERROR_MESSAGE }, { status: 500 });
}

async function deleteRowsForUser(
  client: ReturnType<typeof getServerSupabaseAdminClient>,
  userId: string,
) {
  const deleteSteps = [
    client.from("ingredients").delete().eq("user_id", userId),
    client.from("favorites").delete().eq("user_id", userId),
    client.from("shopping_items").delete().eq("user_id", userId),
    client.from("community_likes").delete().eq("user_id", userId),
    client.from("community_comments").delete().eq("user_id", userId),
    client.from("community_posts").delete().eq("user_id", userId),
  ];

  for (const step of deleteSteps) {
    const { error } = await step;
    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasConfiguredAdminEmails()) {
    return NextResponse.json(
      { message: "ADMIN_EMAILS 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const adminEmail = await getAuthorizedAdminEmail(request.headers.get("authorization"));
  if (!adminEmail) {
    return NextResponse.json(
      { message: "운영자 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as PatchBody;
  const nextStatus = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";

  if (!ALLOWED_STATUS.has(nextStatus)) {
    return NextResponse.json(
      { message: "허용되지 않은 상태값입니다." },
      { status: 400 },
    );
  }

  const client = getServerSupabaseAdminClient();
  const { data: currentRequest, error: currentError } = await client
    .from("account_deletion_requests")
    .select("id,user_id,email,status")
    .eq("id", id)
    .maybeSingle<CurrentDeletionRequest>();

  if (currentError) {
    return internalError("account_deletion_request.fetch_failed", { error: currentError, requestId: id });
  }

  if (!currentRequest) {
    return NextResponse.json({ message: "요청을 찾지 못했습니다." }, { status: 404 });
  }

  const isAccountDeletion = nextStatus === "completed";
  if (isAccountDeletion) {
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const confirmUserId = typeof body.confirmUserId === "string" ? body.confirmUserId.trim() : "";

    if (action !== ACCOUNT_DELETE_ACTION || confirmUserId !== currentRequest.user_id) {
      return NextResponse.json(
        { message: "계정 삭제 실행에는 대상 사용자 ID 확인이 필요합니다." },
        { status: 400 },
      );
    }

    if (!currentRequest.user_id) {
      return NextResponse.json(
        { message: "이미 삭제되었거나 대상 사용자 ID가 없는 요청입니다." },
        { status: 409 },
      );
    }

    try {
      await deleteRowsForUser(client, currentRequest.user_id);
      const { error: deleteUserError } = await client.auth.admin.deleteUser(currentRequest.user_id);

      if (deleteUserError) {
        throw new Error(deleteUserError.message);
      }
    } catch (error) {
      return internalError("account_deletion_request.delete_user_failed", { error, requestId: id });
    }
  }

  const updatePayload = isAccountDeletion
    ? {
        status: nextStatus,
        user_id: null,
        email: null,
        reason: null,
      }
    : {
        status: nextStatus,
      };

  const { data, error } = await client
    .from("account_deletion_requests")
    .update(updatePayload)
    .eq("id", id)
    .select("id,user_id,email,reason,status,created_at,updated_at")
    .maybeSingle();

  if (error) {
    return internalError("account_deletion_request.update_failed", { error, requestId: id });
  }

  if (!data) {
    return NextResponse.json({ message: "요청을 찾지 못했습니다." }, { status: 404 });
  }

  const { error: eventError } = await client
    .from("account_deletion_request_events")
    .insert({
      request_id: id,
      actor_email: adminEmail,
      from_status: currentRequest.status,
      to_status: nextStatus,
      note: isAccountDeletion ? "운영자 계정 삭제 실행" : "운영자 상태 변경",
    });

  if (eventError) {
    return internalError("account_deletion_request.event_insert_failed", { error: eventError, requestId: id });
  }

  return NextResponse.json({
    adminEmail,
    request: data,
  });
}
