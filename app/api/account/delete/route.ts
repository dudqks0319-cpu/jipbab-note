import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  getAuthenticatedServerUser,
  getServerSupabaseAdminClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";
import { noStoreHeaders, readJsonObject } from "@/lib/request-security";
import { logTelemetry } from "@/lib/telemetry";

const DIRECT_DELETE_CONFIRMATION = "DELETE_MY_ACCOUNT";
const PRE_DELETE_STATUS = "reviewing";
const COMPLETED_STATUS = "completed";
const INTERNAL_ERROR_MESSAGE = "계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
const SERVICE_UNAVAILABLE_MESSAGE = "계정 삭제 운영 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.";
const UNAUTHENTICATED_MESSAGE = "로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해주세요.";
const INVALID_CONFIRMATION_MESSAGE = "계정 삭제 확인 문구가 올바르지 않습니다.";

type DirectDeletionRequestRecord = {
  id: string;
  status: string | null;
};

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

function isConfirmedDeletion(body: Record<string, unknown> | null): boolean {
  return body?.confirmation === DIRECT_DELETE_CONFIRMATION;
}

async function getOrCreateDeletionRequest(
  client: SupabaseClient,
  user: User,
): Promise<DirectDeletionRequestRecord> {
  const { data: existingRequest, error: existingError } = await client
    .from("account_deletion_requests")
    .select("id,status")
    .eq("user_id", user.id)
    .in("status", ["requested", PRE_DELETE_STATUS])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<DirectDeletionRequestRecord>();

  if (existingError) {
    throw existingError;
  }

  if (existingRequest) {
    return existingRequest;
  }

  const { data: createdRequest, error: createError } = await client
    .from("account_deletion_requests")
    .insert({
      user_id: user.id,
      email: null,
      reason: null,
      status: PRE_DELETE_STATUS,
    })
    .select("id,status")
    .single<DirectDeletionRequestRecord>();

  if (createError || !createdRequest) {
    throw createError ?? new Error("Account deletion request was not created.");
  }

  return createdRequest;
}

async function markDeletionCompleted(
  client: SupabaseClient,
  request: DirectDeletionRequestRecord,
): Promise<void> {
  const { error: updateError } = await client
    .from("account_deletion_requests")
    .update({
      status: COMPLETED_STATUS,
      user_id: null,
      email: null,
      reason: null,
    })
    .eq("id", request.id);

  if (updateError) {
    throw updateError;
  }

  const { error: eventError } = await client
    .from("account_deletion_request_events")
    .insert({
      request_id: request.id,
      actor_email: null,
      from_status: request.status,
      to_status: COMPLETED_STATUS,
      note: "사용자 직접 계정 삭제",
    });

  if (eventError) {
    throw eventError;
  }
}

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!isConfirmedDeletion(body)) {
    return NextResponse.json(
      { message: INVALID_CONFIRMATION_MESSAGE },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  let user: User | null;
  try {
    user = await getAuthenticatedServerUser(request.headers.get("authorization"));
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return serviceUnavailable();
    }
    return internalError("account_direct_delete.auth_config_failed", { error });
  }

  if (!user) {
    return NextResponse.json(
      { message: UNAUTHENTICATED_MESSAGE },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  let client: SupabaseClient;
  try {
    client = getServerSupabaseAdminClient();
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return serviceUnavailable();
    }
    return internalError("account_direct_delete.admin_config_failed", { error });
  }

  let deletionRequest: DirectDeletionRequestRecord;
  try {
    deletionRequest = await getOrCreateDeletionRequest(client, user);
  } catch (error) {
    return internalError("account_direct_delete.request_prepare_failed", { error, userId: user.id });
  }

  const { error: deleteUserError } = await client.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    return internalError("account_direct_delete.delete_user_failed", {
      error: deleteUserError,
      userId: user.id,
      requestId: deletionRequest.id,
    });
  }

  try {
    await markDeletionCompleted(client, deletionRequest);
  } catch (error) {
    return internalError("account_direct_delete.mark_completed_failed", {
      error,
      requestId: deletionRequest.id,
    });
  }

  return NextResponse.json(
    { deleted: true },
    { headers: noStoreHeaders() },
  );
}
