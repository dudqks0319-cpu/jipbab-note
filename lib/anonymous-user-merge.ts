import type { SupabaseClient } from "@supabase/supabase-js";

import { isAnonymousSupabaseUser, isPermanentSupabaseUser } from "@/lib/supabase-session";

const PENDING_ANONYMOUS_TOKEN_KEY = "jipbab-pending-anonymous-merge-token";

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
    const response = await fetch("/api/auth/merge-anonymous", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${permanentAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ anonymousAccessToken }),
    });

    if (response.ok) {
      storage.removeItem(PENDING_ANONYMOUS_TOKEN_KEY);
      return true;
    }

    if ([400, 401, 403, 409].includes(response.status)) {
      storage.removeItem(PENDING_ANONYMOUS_TOKEN_KEY);
    }
    return false;
  } catch {
    return false;
  }
}
