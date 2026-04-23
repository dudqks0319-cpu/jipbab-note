// 이 파일은 최대 4명까지 쓰는 가족 냉장고 초대 코드와 활성 상태를 관리합니다.
"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "jipbab-note-family-fridge";
const MAX_FAMILY_MEMBERS = 4;

export type FamilyFridgeState = {
  fridgeId: string | null;
  inviteCode: string | null;
  memberNames: string[];
};

const DEFAULT_STATE: FamilyFridgeState = {
  fridgeId: null,
  inviteCode: null,
  memberNames: [],
};

function createInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function readFamilyState(): FamilyFridgeState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<FamilyFridgeState>;
    return {
      fridgeId: typeof parsed.fridgeId === "string" ? parsed.fridgeId : null,
      inviteCode: typeof parsed.inviteCode === "string" ? parsed.inviteCode : null,
      memberNames: Array.isArray(parsed.memberNames)
        ? parsed.memberNames.filter((item): item is string => typeof item === "string").slice(0, MAX_FAMILY_MEMBERS)
        : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeFamilyState(next: FamilyFridgeState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getActiveFamilyFridgeId(): string | null {
  return readFamilyState().fridgeId;
}

export function useFamilyFridge() {
  const [family, setFamily] = useState<FamilyFridgeState>(() => readFamilyState());

  const createFamilyFridge = useCallback((ownerName: string) => {
    const inviteCode = createInviteCode();
    const next: FamilyFridgeState = {
      fridgeId: `family-${inviteCode.toLowerCase()}`,
      inviteCode,
      memberNames: [ownerName.trim() || "나"],
    };
    writeFamilyState(next);
    setFamily(next);
  }, []);

  const joinFamilyFridge = useCallback((inviteCode: string, memberName: string): boolean => {
    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) {
      return false;
    }

    const nextMembers = Array.from(new Set([...(family.memberNames.length ? family.memberNames : ["가족"]), memberName.trim() || "가족"])).slice(0, MAX_FAMILY_MEMBERS);
    const next: FamilyFridgeState = {
      fridgeId: `family-${normalizedCode.toLowerCase()}`,
      inviteCode: normalizedCode,
      memberNames: nextMembers,
    };

    writeFamilyState(next);
    setFamily(next);
    return nextMembers.length <= MAX_FAMILY_MEMBERS;
  }, [family.memberNames]);

  const leaveFamilyFridge = useCallback(() => {
    writeFamilyState(DEFAULT_STATE);
    setFamily(DEFAULT_STATE);
  }, []);

  return {
    family,
    maxMembers: MAX_FAMILY_MEMBERS,
    createFamilyFridge,
    joinFamilyFridge,
    leaveFamilyFridge,
  };
}

