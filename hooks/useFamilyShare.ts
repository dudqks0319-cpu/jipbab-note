// 이 파일은 가족 냉장고 공유 MVP 상태를 localStorage 우선으로 관리합니다.
"use client";

import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import { getSupabaseClient } from "@/lib/supabase";
import type { FamilyGroupRecord, FamilyMemberRecord } from "@/types";

const STORAGE_KEY = "jipbab-note-family-group";
const MAX_MEMBERS = 4;

function makeInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeMemberName(value: string): string {
  return value.trim().slice(0, 24);
}

function safeReadFamilyGroup(): FamilyGroupRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<FamilyGroupRecord>;
    if (!parsed.id || !parsed.name || !parsed.inviteCode || !Array.isArray(parsed.members)) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      inviteCode: parsed.inviteCode,
      ownerName: parsed.ownerName || "나",
      members: parsed.members.filter((member): member is FamilyMemberRecord => {
        return Boolean(member && typeof member.id === "string" && typeof member.name === "string");
      }).slice(0, MAX_MEMBERS),
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function safeWriteFamilyGroup(group: FamilyGroupRecord | null): void {
  if (typeof window === "undefined") return;
  if (!group) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
}

export function useFamilyShare() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [group, setGroup] = useState<FamilyGroupRecord | null>(() => safeReadFamilyGroup());
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const saveGroup = useCallback((nextGroup: FamilyGroupRecord | null) => {
    setGroup(nextGroup);
    safeWriteFamilyGroup(nextGroup);
  }, []);

  const createGroup = useCallback(async (groupName: string, ownerName: string) => {
    const now = new Date().toISOString();
    const owner = normalizeMemberName(ownerName) || "나";
    const nextGroup: FamilyGroupRecord = {
      id: uuidv4(),
      name: groupName.trim().slice(0, 40) || "우리 가족 냉장고",
      inviteCode: makeInviteCode(),
      ownerName: owner,
      members: [{ id: deviceId, name: owner, role: "owner", joinedAt: now }],
      createdAt: now,
      updatedAt: now,
    };

    saveGroup(nextGroup);
    setStatusMessage("가족 냉장고를 만들었어요. 초대코드를 가족에게 보내세요.");
    setError("");

    try {
      const client = getSupabaseClient({ deviceId });
      const { data: authData } = await client.auth.getUser();
      const userId = authData.user?.id ?? null;
      if (!userId) return;
      await client.from("family_groups").upsert({
        id: nextGroup.id,
        owner_user_id: userId,
        owner_device_id: deviceId,
        name: nextGroup.name,
        invite_code: nextGroup.inviteCode,
      });
      await client.from("family_members").upsert({
        family_group_id: nextGroup.id,
        user_id: userId,
        device_id: deviceId,
        display_name: owner,
        role: "owner",
      });
    } catch {
      setStatusMessage("로컬 가족 냉장고로 먼저 저장했어요. 로그인/DB 적용 후 클라우드 공유됩니다.");
    }
  }, [deviceId, saveGroup]);

  const joinGroup = useCallback((inviteCode: string, memberName: string) => {
    const normalizedCode = inviteCode.trim().toUpperCase();
    const now = new Date().toISOString();
    const name = normalizeMemberName(memberName) || "가족";
    const current = group ?? {
      id: uuidv4(),
      name: "참여한 가족 냉장고",
      inviteCode: normalizedCode,
      ownerName: "가족",
      members: [],
      createdAt: now,
      updatedAt: now,
    };

    if (current.members.length >= MAX_MEMBERS) {
      setError("가족 공유는 최대 4명까지 가능합니다.");
      return;
    }

    const nextGroup = {
      ...current,
      inviteCode: normalizedCode || current.inviteCode,
      members: [
        ...current.members.filter((member) => member.id !== deviceId),
        { id: deviceId, name, role: "member" as const, joinedAt: now },
      ].slice(0, MAX_MEMBERS),
      updatedAt: now,
    };
    saveGroup(nextGroup);
    setStatusMessage("초대코드로 가족 냉장고에 참여했어요.");
    setError("");
  }, [deviceId, group, saveGroup]);

  const addLocalMember = useCallback((memberName: string) => {
    if (!group) return;
    const name = normalizeMemberName(memberName);
    if (!name) return;
    if (group.members.length >= MAX_MEMBERS) {
      setError("가족 공유는 최대 4명까지 가능합니다.");
      return;
    }
    const now = new Date().toISOString();
    saveGroup({
      ...group,
      members: [...group.members, { id: uuidv4(), name, role: "member", joinedAt: now }],
      updatedAt: now,
    });
    setStatusMessage(`${name}님을 가족 보드에 추가했어요.`);
    setError("");
  }, [group, saveGroup]);

  const removeMember = useCallback((memberId: string) => {
    if (!group) return;
    saveGroup({
      ...group,
      members: group.members.filter((member) => member.id !== memberId || member.role === "owner"),
      updatedAt: new Date().toISOString(),
    });
  }, [group, saveGroup]);

  const leaveGroup = useCallback(() => {
    saveGroup(null);
    setStatusMessage("가족 공유를 해제했어요.");
    setError("");
  }, [saveGroup]);

  return {
    group,
    maxMembers: MAX_MEMBERS,
    statusMessage,
    error,
    createGroup,
    joinGroup,
    addLocalMember,
    removeMember,
    leaveGroup,
  };
}
