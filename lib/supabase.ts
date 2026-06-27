// Supabase 클라이언트를 환경변수 기반으로 초기화하는 유틸리티입니다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseClientOptions {
  deviceId?: string;
}

let clientCache: SupabaseClient | null = null;
let latestDeviceId: string | null = null;
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const LEGACY_SUPABASE_AUTH_KEYS = ["supabase.auth.token"];

function isSupabaseAuthStorageKey(key: string): boolean {
  return key.startsWith("sb-") && key.includes("-auth-token");
}

function removeSupabaseAuthKeys(storage: Storage): void {
  const keysToRemove = new Set<string>(LEGACY_SUPABASE_AUTH_KEYS);

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isSupabaseAuthStorageKey(key)) {
      keysToRemove.add(key);
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}

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
  if (normalizedDeviceId) {
    latestDeviceId = normalizedDeviceId;
  }

  if (clientCache) {
    return clientCache;
  }

  const { supabaseUrl, supabaseAnonKey } = getRequiredSupabaseEnv();

  const fetchWithDeviceHeader: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    if (latestDeviceId) {
      headers.set("x-device-id", latestDeviceId);
    }
    return fetch(input, {
      ...init,
      headers,
    });
  };

  // OAuth 세션이 있는 경우 재료/커뮤니티 동작에도 세션을 공유할 수 있도록 유지합니다.
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
    global: {
      fetch: fetchWithDeviceHeader,
      headers: {
        "x-client-info": "jipbab-note-web",
      },
    },
  });

  clientCache = client;
  return client;
}

export function clearSupabaseAuthStorage(storageTargets?: Storage[]): void {
  const targets = storageTargets ?? (
    typeof window !== "undefined"
      ? [window.localStorage, window.sessionStorage]
      : []
  );

  for (const storage of targets) {
    try {
      removeSupabaseAuthKeys(storage);
    } catch {
      continue;
    }
  }
}
