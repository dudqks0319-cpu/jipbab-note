import { NextResponse } from "next/server";

import {
  getAuthorizedAdminEmail,
  getServerSupabaseAdminClient,
  hasConfiguredAdminEmails,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";
import { noStoreHeaders } from "@/lib/request-security";
import { logTelemetry } from "@/lib/telemetry";

const INTERNAL_ERROR_MESSAGE = "요청 처리 중 오류가 발생했습니다.";
const SERVICE_UNAVAILABLE_MESSAGE = "계정 삭제 운영 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.";

function internalError(event: string, metadata: unknown) {
  logTelemetry("error", event, metadata);
  return NextResponse.json(
    { message: INTERNAL_ERROR_MESSAGE },
    { status: 500, headers: noStoreHeaders() },
  );
}

function serviceUnavailable() {
  return NextResponse.json(
    { message: SERVICE_UNAVAILABLE_MESSAGE },
    { status: 503, headers: noStoreHeaders() },
  );
}

export async function GET(request: Request) {
  if (!hasConfiguredAdminEmails()) {
    return serviceUnavailable();
  }

  let adminEmail: string | null;
  try {
    adminEmail = await getAuthorizedAdminEmail(request.headers.get("authorization"));
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return serviceUnavailable();
    }
    return internalError("account_deletion_requests.auth_config_failed", { error });
  }
  if (!adminEmail) {
    return NextResponse.json(
      { message: "운영자 권한이 없습니다." },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  let client: ReturnType<typeof getServerSupabaseAdminClient>;
  try {
    client = getServerSupabaseAdminClient();
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return serviceUnavailable();
    }
    return internalError("account_deletion_requests.admin_config_failed", { error });
  }

  const { data, error } = await client
    .from("account_deletion_requests")
    .select("id,user_id,email,reason,status,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return internalError("account_deletion_requests.list_failed", { error });
  }

  return NextResponse.json(
    {
      adminEmail,
      requests: data ?? [],
    },
    { headers: noStoreHeaders() },
  );
}
