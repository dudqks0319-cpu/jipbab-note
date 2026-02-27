// Supabase 클라이언트를 환경변수 기반으로 초기화하는 유틸리티입니다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseClientOptions {
  deviceId?: string;
}

const clientCache = new Map<string, SupabaseClient>();
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getRequiredSupabaseEnv() {
  if (!PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되어 있지 않습니다.");
  }

  if (!PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  return {
    supabaseUrl: PUBLIC_SUPABASE_URL,
    supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseClient(options?: SupabaseClientOptions): SupabaseClient {
  const normalizedDeviceId = options?.deviceId?.trim();
  const cacheKey = normalizedDeviceId ? `device:${normalizedDeviceId}` : "default";

  const cachedClient = clientCache.get(cacheKey);
  if (cachedClient) {
    return cachedClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getRequiredSupabaseEnv();

  const headers: Record<string, string> = {
    "x-client-info": "jipbab-note-web",
  };

  if (normalizedDeviceId) {
    headers["x-device-id"] = normalizedDeviceId;
  }

  // OAuth 세션이 있는 경우 재료/커뮤니티 동작에도 세션을 공유할 수 있도록 유지합니다.
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers,
    },
  });

  clientCache.set(cacheKey, client);
  return client;
}
