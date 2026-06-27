// 이 파일은 레시피별 댓글 조회와 로그인 사용자 댓글 작성을 처리합니다.
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

import { getRateLimitKey, noStoreHeaders, readJsonObject } from "@/lib/request-security";
import type { RecipeCommentRecord } from "@/types";

const MAX_CONTENT_LENGTH = 500;
const MAX_RECIPE_ID_LENGTH = 120;
const MAX_DEVICE_ID_LENGTH = 96;
const DEVICE_ID_PATTERN = /^[0-9A-Za-z._:-]+$/;
const REQUEST_WINDOW_MS = 60_000;
const MAX_GET_REQUESTS = 120;
const MAX_POST_REQUESTS = 12;
const requestStore = new Map<string, { count: number; startedAt: number }>();

type RecipeCommentRow = {
  id: string;
  recipe_id: string;
  device_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  status: "visible" | "hidden" | "deleted";
  created_at: string;
  updated_at: string;
};

type SupabaseQueryError = {
  code?: string;
  message?: string;
};

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

function normalizeDeviceId(value: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.length > MAX_DEVICE_ID_LENGTH || !DEVICE_ID_PATTERN.test(trimmed)) {
    return "authenticated";
  }
  return trimmed;
}

function normalizeContent(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_CONTENT_LENGTH) {
    return null;
  }
  return trimmed;
}

function isRateLimited(request: Request, maxRequests: number): boolean {
  const key = `${request.method}:${getRateLimitKey(request)}`;
  const now = Date.now();
  const current = requestStore.get(key);
  if (!current || now - current.startedAt > REQUEST_WINDOW_MS) {
    requestStore.set(key, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > maxRequests;
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
  if (error || !data.user) {
    return null;
  }

  return { user: data.user, token };
}

function resolveAuthorName(user: User): string {
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";
  if (fullName) return fullName.slice(0, 24);
  if (name) return name.slice(0, 24);
  if (user.email?.includes("@")) return user.email.split("@")[0]?.slice(0, 24) || "집밥러";
  return "집밥러";
}

function rowToComment(row: RecipeCommentRow): RecipeCommentRecord {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    deviceId: row.device_id,
    userId: row.user_id,
    authorName: row.author_name,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isCommentTableUnavailable(error: SupabaseQueryError | null): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST205"
    || error?.code === "42P01"
    || (
      message.includes("recipe_comments")
      && (message.includes("could not find") || message.includes("does not exist"))
    )
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (isRateLimited(request, MAX_GET_REQUESTS)) {
    return jsonError("요청이 많습니다. 잠시 후 다시 시도해주세요.", 429);
  }

  const { id } = await context.params;
  const recipeId = normalizeRecipeId(id);
  if (!recipeId) {
    return jsonError("레시피 정보를 확인해 주세요.", 400);
  }

  const client = createAnonClient();
  if (!client) {
    return jsonError("댓글 설정을 확인 중입니다. 잠시 후 다시 시도해주세요.", 503);
  }

  const { data, error } = await client
    .from("recipe_comments")
    .select("id,recipe_id,device_id,user_id,author_name,content,status,created_at,updated_at")
    .eq("recipe_id", recipeId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isCommentTableUnavailable(error)) {
      return NextResponse.json({ comments: [] }, { headers: noStoreHeaders() });
    }
    return jsonError("댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", 500);
  }

  return NextResponse.json(
    { comments: (data ?? []).map((row) => rowToComment(row as RecipeCommentRow)) },
    { headers: noStoreHeaders() },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (isRateLimited(request, MAX_POST_REQUESTS)) {
    return jsonError("댓글 작성이 너무 빠릅니다. 잠시 후 다시 시도해주세요.", 429);
  }

  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return jsonError("로그인하면 댓글을 남길 수 있어요.", 401);
  }

  const { id } = await context.params;
  const recipeId = normalizeRecipeId(id);
  if (!recipeId) {
    return jsonError("레시피 정보를 확인해 주세요.", 400);
  }

  const body = await readJsonObject(request);
  const content = normalizeContent(body?.content);
  if (!content) {
    return jsonError("댓글은 1자 이상 500자 이하로 입력해주세요.", 400);
  }

  const deviceId = normalizeDeviceId(request.headers.get("x-device-id"));
  const client = createAnonClient(auth.token);
  if (!client) {
    return jsonError("댓글 설정을 확인 중입니다. 잠시 후 다시 시도해주세요.", 503);
  }

  const { data, error } = await client
    .from("recipe_comments")
    .insert({
      recipe_id: recipeId,
      device_id: deviceId,
      user_id: auth.user.id,
      author_name: resolveAuthorName(auth.user),
      content,
      status: "visible",
    })
    .select("id,recipe_id,device_id,user_id,author_name,content,status,created_at,updated_at")
    .single();

  if (error) {
    return jsonError("댓글을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", 500);
  }

  return NextResponse.json(
    { comment: rowToComment(data as RecipeCommentRow) },
    { status: 201, headers: noStoreHeaders() },
  );
}
