import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiClientError, requestApi } from "@/lib/api-client";
import { isAnonymousSupabaseUser, isPermanentSupabaseUser } from "@/lib/supabase-session";

const PENDING_ANONYMOUS_TOKEN_KEY = "jipbab-pending-anonymous-merge-token";

function parseAnonymousMergeResponse(value: unknown, requestId: string | null): true {
  const payload = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  if (payload?.merged !== true) {
    throw new ApiClientError({
      code: "INVALID_RESPONSE",
      message: "계정 데이터 이전 응답 형식을 확인하지 못했습니다.",
      status: 502,
      requestId,
      retryable: false,
    });
  }
  return true;
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export async function captureAnonymousSessionForMerge(client: SupabaseClient): Promise<void> {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  const { data, error } = await client.auth.getSession();
  if (error || !data.session || !isAnonymousSupabaseUser(data.session.user)) {
    return;
  }

  storage.setItem(PENDING_ANONYMOUS_TOKEN_KEY, data.session.access_token);
}

export async function mergePendingAnonymousUserData(client: SupabaseClient): Promise<boolean> {
  const storage = getSessionStorage();
  const anonymousAccessToken = storage?.getItem(PENDING_ANONYMOUS_TOKEN_KEY)?.trim();
  if (!storage || !anonymousAccessToken) {
    return false;
  }

  const { data, error } = await client.auth.getSession();
  const permanentAccessToken = data.session?.access_token?.trim();
  if (error || !permanentAccessToken || !isPermanentSupabaseUser(data.session?.user)) {
    return false;
  }

  try {
    await requestApi("/api/auth/merge-anonymous", {
      method: "POST",
      bearerToken: permanentAccessToken,
      json: { anonymousAccessToken },
      parseResponse: parseAnonymousMergeResponse,
    });

    storage.removeItem(PENDING_ANONYMOUS_TOKEN_KEY);
    return true;
  } catch (error) {
    if (error instanceof ApiClientError && [400, 401, 403, 409].includes(error.status)) {
      storage.removeItem(PENDING_ANONYMOUS_TOKEN_KEY);
    }
    return false;
  }
}
