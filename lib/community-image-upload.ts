"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

const COMMUNITY_BUCKET = "community-images";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function getExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  const fromType = file.type.split("/").pop()?.toLowerCase();
  return fromType && /^[a-z0-9]+$/.test(fromType) ? fromType : "jpg";
}

function makeStoragePath(file: File, deviceId: string, userId: string | null): string {
  const owner = userId || deviceId || "anonymous";
  const safeOwner = owner.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${safeOwner}/${id}.${getExtension(file)}`;
}

export async function uploadCommunityImage(params: {
  client: SupabaseClient | null;
  file: File;
  deviceId: string;
  userId: string | null;
}): Promise<string> {
  const { client, file, deviceId, userId } = params;

  if (!client) {
    throw new Error("Supabase 환경변수가 없어 사진 업로드를 사용할 수 없습니다.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("사진은 4MB 이하만 업로드할 수 있습니다.");
  }

  const path = makeStoragePath(file, deviceId, userId);
  const { error } = await client.storage.from(COMMUNITY_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from(COMMUNITY_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("업로드된 사진 URL을 만들 수 없습니다.");
  }

  return data.publicUrl;
}
