import { NextResponse } from "next/server";

import {
  getAuthorizedAdminEmail,
  getServerSupabaseAdminClient,
  hasConfiguredAdminEmails,
} from "@/lib/supabase-server";
import { logTelemetry } from "@/lib/telemetry";

const INTERNAL_ERROR_MESSAGE = "요청 처리 중 오류가 발생했습니다.";

function internalError(event: string, metadata: unknown) {
  logTelemetry("error", event, metadata);
  return NextResponse.json({ message: INTERNAL_ERROR_MESSAGE }, { status: 500 });
}

export async function GET(request: Request) {
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

  const client = getServerSupabaseAdminClient();
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("id,user_id,email,reason,status,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return internalError("account_deletion_requests.list_failed", { error });
  }

  return NextResponse.json({
    adminEmail,
    requests: data ?? [],
  });
}
