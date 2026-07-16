// 이 API는 로그인 가족 구성원의 그룹 생성·참여·재조회·탈퇴를 서버 권한으로 처리합니다.
import { NextResponse } from "next/server";

import { consumeDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { isUuidLike, noStoreHeaders, readBoundedJsonObject } from "@/lib/request-security";
import {
  getAuthenticatedServerUser,
  getServerSupabaseAuthenticatedClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";
import { isAnonymousSupabaseUser } from "@/lib/supabase-session";
import type { FamilyActivityRecord, FamilyGroupRecord, FamilyMemberRecord } from "@/types";

const MAX_MEMBERS = 4;
const MAX_BODY_BYTES = 4 * 1024;
const INVITE_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

type FamilyAction = "create" | "join" | "leave";
type AuthenticatedClient = ReturnType<typeof getServerSupabaseAuthenticatedClient>;

interface FamilyGroupRow {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

interface FamilyMemberRpcRow {
  member_id: string;
  display_name: string;
  role: "owner" | "member";
  joined_at: string;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: noStoreHeaders() });
}

function normalizeText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeInviteCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

async function authorize(request: Request) {
  const authorization = request.headers.get("authorization");
  const user = await getAuthenticatedServerUser(authorization);
  if (!user) return { status: "missing" as const };
  if (isAnonymousSupabaseUser(user)) return { status: "anonymous" as const };
  return {
    status: "authorized" as const,
    client: getServerSupabaseAuthenticatedClient(authorization),
    user,
  };
}

async function consumeFamilyRateLimit(request: Request) {
  return consumeDistributedRateLimit(request, "family-groups", {
    limit: 30,
    windowSeconds: 60,
  });
}

async function fetchMembers(client: AuthenticatedClient, groupId: string) {
  const { data, error } = await client.rpc("get_family_group_members", {
    group_id_input: groupId,
  });
  if (error) throw error;
  return ((data ?? []) as FamilyMemberRpcRow[]).slice(0, MAX_MEMBERS);
}

async function fetchActivities(client: AuthenticatedClient, groupId: string) {
  const { data, error } = await client
    .from("family_activity_events")
    .select("id,event_type,actor_display_name,created_at")
    .eq("family_group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((event) => ({
    id: event.id as string,
    eventType: event.event_type as FamilyActivityRecord["eventType"],
    actorName: event.actor_display_name as string,
    createdAt: event.created_at as string,
  }));
}

async function fetchGroup(client: AuthenticatedClient, groupId: string) {
  const { data, error } = await client
    .from("family_groups")
    .select("id,name,invite_code,created_at,updated_at")
    .eq("id", groupId)
    .maybeSingle<FamilyGroupRow>();
  if (error) throw error;
  if (!data) return null;

  const members = await fetchMembers(client, groupId);
  const normalizedMembers: FamilyMemberRecord[] = members.map((member) => ({
    id: member.member_id,
    name: member.display_name,
    role: member.role,
    joinedAt: member.joined_at,
  }));
  const group: FamilyGroupRecord = {
    id: data.id,
    name: data.name,
    inviteCode: data.invite_code,
    ownerName: normalizedMembers.find((member) => member.role === "owner")?.name ?? "나",
    members: normalizedMembers,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
  return { group, activities: await fetchActivities(client, groupId) };
}

function mapFamilyRpcError(message: string) {
  if (message.includes("family_group_full")) return jsonError("가족 공유는 최대 4명까지 가능합니다.", 409);
  if (message.includes("ownership_transfer_required")) {
    return jsonError("대표는 다른 가족이 있는 동안 탈퇴할 수 없습니다. 소유권 이전 기능 준비 후 처리해 주세요.", 409);
  }
  if (message.includes("invalid_invite_code")) return jsonError("초대코드를 찾을 수 없습니다.", 404);
  if (message.includes("family_group_access_denied")) return jsonError("가족 냉장고 접근 권한이 없습니다.", 403);
  if (message.includes("duplicate key")) return jsonError("이미 사용 중인 초대코드입니다. 다시 시도해 주세요.", 409);
  return jsonError("가족 냉장고 요청을 처리하지 못했습니다.", 500);
}

export async function GET(request: Request) {
  const rateLimit = await consumeFamilyRateLimit(request);
  if (rateLimit.status === "limited") return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  if (rateLimit.status === "unavailable") return jsonError("가족 공유 요청 제한 설정을 확인 중입니다.", 503);

  try {
    const auth = await authorize(request);
    if (auth.status === "missing") return jsonError("로그인이 필요합니다.", 401);
    if (auth.status === "anonymous") return jsonError("가족 공유는 일반 계정 로그인이 필요합니다.", 403);
    const groupId = new URL(request.url).searchParams.get("groupId")?.trim() ?? "";
    if (!isUuidLike(groupId)) return jsonError("가족 냉장고 ID를 확인해 주세요.", 400);
    const result = await fetchGroup(auth.client, groupId);
    if (!result) return jsonError("가족 냉장고를 찾지 못했습니다.", 404);
    return NextResponse.json(result, { headers: noStoreHeaders() });
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) return jsonError("가족 공유 설정을 확인 중입니다.", 503);
    return mapFamilyRpcError(error instanceof Error ? error.message : "");
  }
}

export async function POST(request: Request) {
  const rateLimit = await consumeFamilyRateLimit(request);
  if (rateLimit.status === "limited") return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  if (rateLimit.status === "unavailable") return jsonError("가족 공유 요청 제한 설정을 확인 중입니다.", 503);

  try {
    const auth = await authorize(request);
    if (auth.status === "missing") return jsonError("로그인이 필요합니다.", 401);
    if (auth.status === "anonymous") return jsonError("가족 공유는 일반 계정 로그인이 필요합니다.", 403);
    const body = await readBoundedJsonObject(request, MAX_BODY_BYTES);
    if (body.status === "too_large") return jsonError("요청 내용이 너무 깁니다.", 413);
    if (body.status !== "ok") return jsonError("요청 정보를 확인해 주세요.", 400);
    const action = body.value.action as FamilyAction | undefined;

    if (action === "create") {
      const groupId = normalizeText(body.value.groupId, 80);
      const groupName = normalizeText(body.value.groupName, 40) || "우리 가족 냉장고";
      const inviteCode = normalizeInviteCode(body.value.inviteCode);
      const displayName = normalizeText(body.value.displayName, 24) || "나";
      if (!isUuidLike(groupId) || !INVITE_CODE_PATTERN.test(inviteCode)) {
        return jsonError("가족 냉장고 정보를 확인해 주세요.", 400);
      }
      const { error } = await auth.client.rpc("create_family_group", {
        group_id_input: groupId,
        group_name_input: groupName,
        invite_code_input: inviteCode,
        owner_display_name_input: displayName,
      });
      if (error) return mapFamilyRpcError(error.message);
      const result = await fetchGroup(auth.client, groupId);
      if (!result) return jsonError("가족 냉장고를 불러오지 못했습니다.", 500);
      return NextResponse.json(result, { headers: noStoreHeaders() });
    }

    if (action === "join") {
      const inviteCode = normalizeInviteCode(body.value.inviteCode);
      const displayName = normalizeText(body.value.displayName, 24) || "가족";
      if (!INVITE_CODE_PATTERN.test(inviteCode)) return jsonError("초대코드를 확인해 주세요.", 400);
      const { data, error } = await auth.client.rpc("join_family_group_by_invite_code", {
        invite_code_input: inviteCode,
        display_name_input: displayName,
      });
      if (error) return mapFamilyRpcError(error.message);
      const row = Array.isArray(data) ? data[0] as { group_id?: string } | undefined : null;
      if (!row?.group_id || !isUuidLike(row.group_id)) return jsonError("가족 냉장고를 불러오지 못했습니다.", 500);
      const result = await fetchGroup(auth.client, row.group_id);
      if (!result) return jsonError("가족 냉장고를 불러오지 못했습니다.", 500);
      return NextResponse.json(result, { headers: noStoreHeaders() });
    }

    if (action === "leave") {
      const groupId = normalizeText(body.value.groupId, 80);
      const confirmGroupId = normalizeText(body.value.confirmGroupId, 80);
      if (!isUuidLike(groupId) || confirmGroupId !== groupId) {
        return jsonError("가족 냉장고 탈퇴에는 대상 그룹 확인이 필요합니다.", 400);
      }
      const { data, error } = await auth.client.rpc("leave_family_group", {
        group_id_input: groupId,
      });
      if (error) return mapFamilyRpcError(error.message);
      return NextResponse.json({ result: data }, { headers: noStoreHeaders() });
    }

    return jsonError("요청 정보를 확인해 주세요.", 400);
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) return jsonError("가족 공유 설정을 확인 중입니다.", 503);
    return mapFamilyRpcError(error instanceof Error ? error.message : "");
  }
}
