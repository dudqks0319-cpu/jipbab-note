// 기기 고유 ID를 생성하고 안전하게 조회하는 유틸리티입니다.
import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "jipbab-note-device-id";

export function getDeviceId(storage: Pick<Storage, "getItem" | "setItem"> | null = null): string {
  const targetStorage = storage ?? (typeof window !== "undefined" ? window.localStorage : null);

  // 서버 환경에서는 로컬 스토리지가 없으므로 빈 값을 반환합니다.
  if (!targetStorage) {
    return "";
  }

  const existingId = targetStorage.getItem(DEVICE_ID_KEY);
  if (existingId && existingId.trim().length > 0) {
    return existingId;
  }

  const nextId = uuidv4();
  targetStorage.setItem(DEVICE_ID_KEY, nextId);
  return nextId;
}
