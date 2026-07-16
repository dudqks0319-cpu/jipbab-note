// 이 파일은 로그인 사용자의 레시피 댓글 삭제를 status 숨김 처리로 수행합니다.
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

import { getRateLimitKey, isUuidLike, noStoreHeaders } from "@/lib/request-security";
import { isPermanentSupabaseUser } from "@/lib/supabase-session";

const MAX_RECIPE_ID_LENGTH = 120;
const REQUEST_WINDOW_MS = 60_000;
const MAX_DELETE_REQUESTS = 20;
const requestStore = new Map<string, { count: number; startedAt: number }>();

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: noStoreHeaders() });
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function normalizeRecipeId(value: string): string | null {
  const decoded = safeDecodeURIComponent(value);
  const trimmed = decoded?.trim() ?? "";
  return trimmed.length > 0 && trimmed.length <= MAX_RECIPE_ID_LENGTH ? trimmed : null;
}

function isRateLimited(request: Request): boolean {
  const key = `${request.method}:${getRateLimitKey(request)}`;
  const now = Date.now();
  const current = requestStore.get(key);
  if (!current || now - current.startedAt > REQUEST_WINDOW_MS) {
    requestStore.set(key, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > MAX_DELETE_REQUESTS;
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return { supabaseUrl, supabaseAnonKey };
}

function createAnonClient(accessToken?: string) {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

async function getAuthenticatedUser(request: Request): Promise<{ user: User; token: string } | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const client = createAnonClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !isPermanentSupabaseUser(data.user)) {
    return null;
  }

  return { user: data.user, token };
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  if (isRateLimited(request)) {
    return jsonError("요청이 많습니다. 잠시 후 다시 시도해주세요.", 429);
  }

  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id, commentId } = await context.params;
  const recipeId = normalizeRecipeId(id);
  if (!recipeId || !isUuidLike(commentId)) {
    return jsonError("댓글 정보를 확인해 주세요.", 400);
  }

  const client = createAnonClient(auth.token);
  if (!client) {
    return jsonError("댓글 설정을 확인 중입니다. 잠시 후 다시 시도해주세요.", 503);
  }

  const { data, error } = await client
    .from("recipe_comments")
    .update({ status: "deleted", content: "삭제된 댓글입니다." })
    .eq("id", commentId)
    .eq("recipe_id", recipeId)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError("댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.", 500);
  }

  if (!data) {
    return jsonError("댓글을 찾을 수 없거나 삭제 권한이 없습니다.", 404);
  }

  return new Response(null, { status: 204, headers: noStoreHeaders() });
}
