import { NextResponse } from "next/server";

import { getRateLimitKey, noStoreHeaders, readJsonObject } from "@/lib/request-security";
import {
  getAuthenticatedServerUser,
  getServerSupabaseAdminClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";
import {
  isAnonymousSupabaseUser,
  isPermanentSupabaseUser,
} from "@/lib/supabase-session";

const MAX_REQUESTS_PER_WINDOW = 10;
const REQUEST_WINDOW_MS = 60_000;
const MAX_ACCESS_TOKEN_LENGTH = 8192;
const requestStore = new Map<string, { count: number; startedAt: number }>();

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: noStoreHeaders() });
}

function isRateLimited(request: Request): boolean {
  const key = getRateLimitKey(request);
  const now = Date.now();
  const current = requestStore.get(key);
  if (!current || now - current.startedAt > REQUEST_WINDOW_MS) {
    requestStore.set(key, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function normalizeAccessToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const token = value.trim();
  return token.length >= 20 && token.length <= MAX_ACCESS_TOKEN_LENGTH ? token : null;
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  }

  try {
    const permanentUser = await getAuthenticatedServerUser(request.headers.get("authorization"));
    if (!isPermanentSupabaseUser(permanentUser)) {
      return jsonError("일반 계정 로그인이 필요합니다.", 401);
    }

    const body = await readJsonObject(request);
    const anonymousAccessToken = normalizeAccessToken(body?.anonymousAccessToken);
    if (!anonymousAccessToken) {
      return jsonError("게스트 세션 정보를 확인해 주세요.", 400);
    }

    const anonymousUser = await getAuthenticatedServerUser(`Bearer ${anonymousAccessToken}`);
    if (!anonymousUser || !isAnonymousSupabaseUser(anonymousUser)) {
      return jsonError("유효한 게스트 세션이 아닙니다.", 403);
    }
    if (anonymousUser.id === permanentUser.id) {
      return jsonError("이미 같은 계정으로 연결되어 있습니다.", 409);
    }

    const admin = getServerSupabaseAdminClient();
    const { error: mergeError } = await admin.rpc("merge_anonymous_user_data", {
      source_user_id: anonymousUser.id,
      target_user_id: permanentUser.id,
    });
    if (mergeError) {
      return jsonError("게스트 데이터를 계정으로 옮기지 못했습니다.", 500);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(anonymousUser.id);
    if (deleteError && deleteError.status !== 404) {
      return jsonError("게스트 세션 정리를 완료하지 못했습니다.", 503);
    }

    return NextResponse.json({ merged: true }, { headers: noStoreHeaders() });
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return jsonError("계정 데이터 이전 설정을 확인 중입니다.", 503);
    }
    return jsonError("계정 데이터 이전 중 오류가 발생했습니다.", 500);
  }
}
