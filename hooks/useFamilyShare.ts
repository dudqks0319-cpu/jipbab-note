// 이 파일은 가족 냉장고 공유 MVP 상태를 localStorage 우선으로 관리합니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import { getSupabaseClient } from "@/lib/supabase";
import { isPermanentSupabaseUser } from "@/lib/supabase-session";
import type { FamilyActivityRecord, FamilyGroupRecord, FamilyMemberRecord } from "@/types";

const STORAGE_KEY = "jipbab-note-family-group";
const SYNC_STORAGE_KEY = "jipbab-note-family-group-sync-state";
const MAX_MEMBERS = 4;
const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type FamilySyncState = "none" | "syncing" | "synced" | "local_only" | "failed";
export type FamilyRealtimeState = "idle" | "connecting" | "connected" | "degraded";

function makeInviteCode(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint8Array(INVITE_CODE_LENGTH);
    cryptoApi.getRandomValues(values);
    return Array.from(values, (value) => INVITE_CODE_ALPHABET[value % INVITE_CODE_ALPHABET.length]).join("");
  }

  return Array.from({ length: INVITE_CODE_LENGTH }, () => {
    return INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }).join("");
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

function safeReadSyncState(group: FamilyGroupRecord | null): FamilySyncState {
  if (typeof window === "undefined" || !group) return "none";
  const value = window.localStorage.getItem(SYNC_STORAGE_KEY);
  return value === "synced" || value === "failed" || value === "local_only"
    ? value
    : "local_only";
}

function safeWriteSyncState(state: FamilySyncState): void {
  if (typeof window === "undefined") return;
  if (state === "none") {
    window.localStorage.removeItem(SYNC_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SYNC_STORAGE_KEY, state);
}

async function buildFamilyRequestHeaders(): Promise<Record<string, string>> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  const accessToken = data.session?.access_token?.trim();
  if (error || !accessToken || !isPermanentSupabaseUser(data.session?.user)) {
    throw new Error("permanent_session_required");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

export function useFamilyShare() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [group, setGroup] = useState<FamilyGroupRecord | null>(null);
  const [activities, setActivities] = useState<FamilyActivityRecord[]>([]);
  const [syncState, setSyncState] = useState<FamilySyncState>("none");
  const [realtimeState, setRealtimeState] = useState<FamilyRealtimeState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const saveGroup = useCallback((nextGroup: FamilyGroupRecord | null, nextSyncState: FamilySyncState) => {
    setGroup(nextGroup);
    setSyncState(nextSyncState);
    safeWriteFamilyGroup(nextGroup);
    safeWriteSyncState(nextSyncState);
  }, []);

  const refreshGroup = useCallback(async (groupId: string, announce = false) => {
    try {
      const response = await fetch(`/api/family-groups?groupId=${encodeURIComponent(groupId)}`, {
        headers: await buildFamilyRequestHeaders(),
      });
      if (!response.ok) throw new Error("family_refresh_failed");
      const payload = await response.json() as {
        group?: FamilyGroupRecord;
        activities?: FamilyActivityRecord[];
      };
      if (!payload.group) throw new Error("family_refresh_empty_response");
      saveGroup(payload.group, "synced");
      setActivities(payload.activities ?? []);
      setError("");
      if (announce) setStatusMessage("가족 냉장고의 최신 상태를 불러왔습니다.");
      return true;
    } catch {
      setSyncState("failed");
      setRealtimeState("degraded");
      if (announce) setError("가족 냉장고를 새로고침하지 못했습니다. 로그인과 네트워크 상태를 확인해 주세요.");
      return false;
    }
  }, [saveGroup]);

  useEffect(() => {
    const savedGroup = safeReadFamilyGroup();
    const savedState = safeReadSyncState(savedGroup);
    setGroup(savedGroup);
    setSyncState(savedState);
    if (savedGroup && savedState === "synced") {
      void refreshGroup(savedGroup.id);
    }
  }, [refreshGroup]);

  useEffect(() => {
    if (!group?.id || syncState !== "synced") {
      setRealtimeState("idle");
      return;
    }
    const client = getSupabaseClient();
    setRealtimeState("connecting");
    const notifyFamilyDataChange = (table: "ingredients" | "shopping_items") => {
      window.dispatchEvent(new CustomEvent("jipbab:family-data-changed", {
        detail: { familyGroupId: group.id, table },
      }));
    };
    const channel = client
      .channel(`family-activity:${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_activity_events",
          filter: `family_group_id=eq.${group.id}`,
        },
        () => {
          void refreshGroup(group.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ingredients",
          filter: `family_group_id=eq.${group.id}`,
        },
        () => notifyFamilyDataChange("ingredients"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `family_group_id=eq.${group.id}`,
        },
        () => notifyFamilyDataChange("shopping_items"),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeState("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeState("degraded");
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [group?.id, refreshGroup, syncState]);

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

    saveGroup(nextGroup, "syncing");
    setStatusMessage("가족 냉장고를 서버에 동기화하는 중입니다.");
    setError("");

    try {
      const response = await fetch("/api/family-groups", {
        method: "POST",
        headers: await buildFamilyRequestHeaders(),
        body: JSON.stringify({
          action: "create",
          groupId: nextGroup.id,
          groupName: nextGroup.name,
          inviteCode: nextGroup.inviteCode,
          displayName: owner,
        }),
      });

      if (!response.ok) throw new Error("family_create_failed");

      const payload = await response.json() as {
        group?: FamilyGroupRecord;
        activities?: FamilyActivityRecord[];
      };
      if (!payload.group) throw new Error("family_create_empty_response");
      saveGroup(payload.group, "synced");
      setActivities(payload.activities ?? []);
      setStatusMessage("가족과 동기화된 냉장고를 만들었습니다.");
    } catch {
      saveGroup(nextGroup, "failed");
      setStatusMessage("동기화에 실패했습니다. 현재 이 기기에만 저장되며 다른 가족 기기와 공유되지 않습니다.");
    }
  }, [deviceId, saveGroup]);

  const joinGroup = useCallback(async (inviteCode: string, memberName: string) => {
    const normalizedCode = inviteCode.trim().toUpperCase();
    const name = normalizeMemberName(memberName) || "가족";

    if (!normalizedCode) {
      setStatusMessage("");
      setError("초대코드를 입력해 주세요.");
      return;
    }

    setStatusMessage("초대코드를 확인하고 있어요.");
    setSyncState("syncing");
    setError("");

    try {
      const response = await fetch("/api/family-groups", {
        method: "POST",
        headers: await buildFamilyRequestHeaders(),
        body: JSON.stringify({
          action: "join",
          inviteCode: normalizedCode,
          displayName: name,
        }),
      });

      if (!response.ok) throw new Error("family_join_failed");

      const payload = await response.json() as {
        group?: FamilyGroupRecord;
        activities?: FamilyActivityRecord[];
      };
      if (!payload.group) throw new Error("family_join_empty_response");

      saveGroup(payload.group, "synced");
      setActivities(payload.activities ?? []);
      setStatusMessage("초대코드로 가족 냉장고에 참여했고 동기화되었습니다.");
      setError("");
    } catch {
      setSyncState(group ? safeReadSyncState(group) : "failed");
      setStatusMessage("");
      setError("초대코드를 확인하지 못했어요. 코드, 로그인, 네트워크 상태를 확인해 주세요.");
    }
  }, [group, saveGroup]);

  const leaveGroup = useCallback(async () => {
    if (!group) return;
    if (syncState !== "synced") {
      saveGroup(null, "none");
      setActivities([]);
      setStatusMessage("이 기기에만 있던 가족 보드를 닫았습니다.");
      setError("");
      return;
    }

    setSyncState("syncing");
    setError("");
    try {
      const response = await fetch("/api/family-groups", {
        method: "POST",
        headers: await buildFamilyRequestHeaders(),
        body: JSON.stringify({ action: "leave", groupId: group.id, confirmGroupId: group.id }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "family_leave_failed");
      saveGroup(null, "none");
      setActivities([]);
      setRealtimeState("idle");
      setStatusMessage("가족 냉장고에서 탈퇴했습니다.");
    } catch (leaveError) {
      setSyncState("synced");
      setError(leaveError instanceof Error && leaveError.message.includes("대표")
        ? leaveError.message
        : "가족 냉장고에서 탈퇴하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [group, saveGroup, syncState]);

  return {
    group,
    activities,
    syncState,
    realtimeState,
    maxMembers: MAX_MEMBERS,
    statusMessage,
    error,
    createGroup,
    joinGroup,
    refreshGroup: group ? () => refreshGroup(group.id, true) : async () => false,
    leaveGroup,
  };
}
