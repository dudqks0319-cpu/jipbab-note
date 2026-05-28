import { NextResponse } from "next/server";

import { getRateLimitKey, isUuidLike, noStoreHeaders, readJsonObject } from "@/lib/request-security";
import {
  getServerSupabaseAdminClient,
  getServerSupabaseUserClient,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";
import type { FamilyGroupRecord, FamilyMemberRecord } from "@/types";

const MAX_MEMBERS = 4;
const MAX_REQUESTS_PER_WINDOW = 30;
const REQUEST_WINDOW_MS = 60_000;
const DEVICE_ID_PATTERN = /^[0-9A-Za-z._:-]{1,96}$/;
const INVITE_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;
const requestStore = new Map<string, { count: number; startedAt: number }>();

type FamilyAction = "create" | "join";

interface FamilyGroupRow {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

interface FamilyMemberRow {
  id: string;
  device_id: string;
  display_name: string;
  role: "owner" | "member";
  created_at: string;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: noStoreHeaders() });
}

function normalizeDeviceId(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && DEVICE_ID_PATTERN.test(trimmed) ? trimmed : null;
}

function normalizeText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeInviteCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorizationHeader.slice("Bearer ".length).trim();
  return accessToken || null;
}

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return null;
  }

  const client = getServerSupabaseUserClient();
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user?.id) {
    return null;
  }

  return data.user.id;
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

function toFamilyGroup(group: FamilyGroupRow, members: FamilyMemberRow[]): FamilyGroupRecord {
  const normalizedMembers: FamilyMemberRecord[] = members
    .filter((member) => member.role === "owner" || member.role === "member")
    .map((member) => ({
      id: member.id || member.device_id,
      name: member.display_name,
      role: member.role,
      joinedAt: member.created_at,
    }))
    .slice(0, MAX_MEMBERS);

  return {
    id: group.id,
    name: group.name,
    inviteCode: group.invite_code,
    ownerName: normalizedMembers.find((member) => member.role === "owner")?.name ?? "나",
    members: normalizedMembers,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  };
}

async function fetchMembers(client: ReturnType<typeof getServerSupabaseAdminClient>, groupId: string) {
  const { data, error } = await client
    .from("family_members")
    .select("id, device_id, display_name, role, created_at")
    .eq("family_group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as FamilyMemberRow[];
}

async function createFamilyGroup(body: Record<string, unknown>, deviceId: string, userId: string | null) {
  const groupId = normalizeText(body.groupId, 80);
  const name = normalizeText(body.groupName, 40) || "우리 가족 냉장고";
  const inviteCode = normalizeInviteCode(body.inviteCode);
  const ownerName = normalizeText(body.displayName, 24) || "나";

  if (!isUuidLike(groupId) || !INVITE_CODE_PATTERN.test(inviteCode)) {
    return jsonError("가족 냉장고 정보를 확인해 주세요.", 400);
  }

  const client = getServerSupabaseAdminClient();
  const { data: group, error: groupError } = await client
    .from("family_groups")
    .insert({
      id: groupId,
      owner_user_id: userId,
      owner_device_id: deviceId,
      name,
      invite_code: inviteCode,
    })
    .select("id,name,invite_code,created_at,updated_at")
    .single();

  if (groupError) {
    if (groupError.code === "23505") {
      return jsonError("이미 사용 중인 초대코드입니다. 다시 시도해 주세요.", 409);
    }
    return jsonError("가족 냉장고를 만들지 못했습니다.", 500);
  }

  const { error: memberError } = await client
    .from("family_members")
    .insert({
      family_group_id: groupId,
      user_id: userId,
      device_id: deviceId,
      display_name: ownerName,
      role: "owner",
    });

  if (memberError) {
    await client.from("family_groups").delete().eq("id", groupId);
    return jsonError("가족 냉장고를 만들지 못했습니다.", 500);
  }

  const members = await fetchMembers(client, groupId);
  return NextResponse.json(
    { group: toFamilyGroup(group as FamilyGroupRow, members) },
    { headers: noStoreHeaders() },
  );
}

async function joinFamilyGroup(body: Record<string, unknown>, deviceId: string, userId: string | null) {
  const inviteCode = normalizeInviteCode(body.inviteCode);
  const displayName = normalizeText(body.displayName, 24) || "가족";
  if (!INVITE_CODE_PATTERN.test(inviteCode)) {
    return jsonError("초대코드를 확인해 주세요.", 400);
  }

  const client = getServerSupabaseAdminClient();
  const { data: group, error: groupError } = await client
    .from("family_groups")
    .select("id,name,invite_code,created_at,updated_at")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (groupError) {
    return jsonError("초대코드를 확인하지 못했습니다.", 500);
  }
  if (!group) {
    return jsonError("초대코드를 찾을 수 없습니다.", 404);
  }

  const groupId = group.id as string;
  let existingMemberQuery = client
    .from("family_members")
    .select("id,role")
    .eq("family_group_id", groupId);

  existingMemberQuery = userId
    ? existingMemberQuery.eq("user_id", userId)
    : existingMemberQuery.eq("device_id", deviceId).is("user_id", null);

  const { data: existingMember, error: existingError } = await existingMemberQuery.maybeSingle();

  if (existingError) {
    return jsonError("가족 냉장고에 참여하지 못했습니다.", 500);
  }

  let insertedMemberId: string | null = null;
  if (existingMember?.id) {
    const { error: updateError } = await client
      .from("family_members")
      .update({
        display_name: displayName,
        role: existingMember.role === "owner" ? "owner" : "member",
      })
      .eq("id", existingMember.id);
    if (updateError) {
      return jsonError("가족 냉장고에 참여하지 못했습니다.", 500);
    }
  } else {
    const currentMembers = await fetchMembers(client, groupId);
    if (currentMembers.length >= MAX_MEMBERS) {
      return jsonError("가족 공유는 최대 4명까지 가능합니다.", 409);
    }

    const { data: insertedMember, error: insertError } = await client
      .from("family_members")
      .insert({
        family_group_id: groupId,
        user_id: userId,
        device_id: deviceId,
        display_name: displayName,
        role: "member",
      })
      .select("id")
      .single();

    if (insertError) {
      return jsonError("가족 냉장고에 참여하지 못했습니다.", 500);
    }
    insertedMemberId = insertedMember.id as string;
  }

  const members = await fetchMembers(client, groupId);
  if (members.length > MAX_MEMBERS && insertedMemberId) {
    await client.from("family_members").delete().eq("id", insertedMemberId);
    return jsonError("가족 공유는 최대 4명까지 가능합니다.", 409);
  }

  return NextResponse.json(
    { group: toFamilyGroup(group as FamilyGroupRow, members) },
    { headers: noStoreHeaders() },
  );
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  }

  const deviceId = normalizeDeviceId(request.headers.get("x-device-id"));
  if (!deviceId) {
    return jsonError("기기 정보를 확인해 주세요.", 400);
  }

  const body = await readJsonObject(request);
  const action = body?.action as FamilyAction | undefined;
  if (!body || (action !== "create" && action !== "join")) {
    return jsonError("요청 정보를 확인해 주세요.", 400);
  }

  try {
    const userId = await getAuthenticatedUserId(request);
    return action === "create"
      ? await createFamilyGroup(body, deviceId, userId)
      : await joinFamilyGroup(body, deviceId, userId);
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return jsonError("가족 공유 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.", 503);
    }
    return jsonError("요청 처리 중 오류가 발생했습니다.", 500);
  }
}
