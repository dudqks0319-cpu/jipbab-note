// 이 파일은 Supabase OAuth 로그인 상태와 디바이스 데이터 이전을 관리하는 훅입니다.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { getDeviceId } from "@/lib/device-id";
import { migrateDeviceData } from "@/lib/migrate-device-data";
import type {
  AuthProviderOption,
  AuthQueryError,
  DeviceDataMigrationResult,
  OAuthProvider,
} from "@/types";

const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUBLIC_OAUTH_PROVIDER_LIST = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS;
const PUBLIC_GOOGLE_OAUTH_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED;
const PUBLIC_KAKAO_OAUTH_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED;
const PUBLIC_APPLE_OAUTH_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED;

const PROVIDER_PRIORITY: OAuthProvider[] = ["google", "kakao", "apple"];

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "구글",
  kakao: "카카오",
  apple: "애플",
};

const authClientCache = new Map<string, SupabaseClient>();

function toAuthError(message: string, source: AuthQueryError["source"]): AuthQueryError {
  return { message, source };
}

function parseBooleanFlag(value: string | undefined): boolean | null {
  if (!value || !value.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return null;
}

function resolveProviderEnabled(provider: OAuthProvider): boolean {
  const explicitList = new Set(
    (PUBLIC_OAUTH_PROVIDER_LIST ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );

  const explicitFlags: Record<OAuthProvider, boolean | null> = {
    google: parseBooleanFlag(PUBLIC_GOOGLE_OAUTH_ENABLED),
    kakao: parseBooleanFlag(PUBLIC_KAKAO_OAUTH_ENABLED),
    apple: parseBooleanFlag(PUBLIC_APPLE_OAUTH_ENABLED),
  };

  const flagValue = explicitFlags[provider];
  if (flagValue !== null) {
    return flagValue;
  }

  if (explicitList.size > 0) {
    return explicitList.has(provider);
  }

  // 별도 설정이 없으면 우선순위 3개를 모두 노출합니다.
  return true;
}

function buildProviderOptions(): AuthProviderOption[] {
  const options = PROVIDER_PRIORITY.map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider],
    enabled: resolveProviderEnabled(provider),
  }));

  const enabled = options.filter((item) => item.enabled);
  const disabled = options.filter((item) => !item.enabled);

  return [...enabled, ...disabled];
}

function createAuthClient(deviceId: string): SupabaseClient | null {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const normalizedDeviceId = deviceId.trim();
  const cacheKey = normalizedDeviceId || "default";
  const cached = authClientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const headers: Record<string, string> = {
    "x-client-info": "jipbab-note-web-auth",
  };

  if (normalizedDeviceId) {
    headers["x-device-id"] = normalizedDeviceId;
  }

  const client = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers,
    },
  });

  authClientCache.set(cacheKey, client);
  return client;
}

function resolveUserDisplayName(user: User | null): string {
  if (!user) {
    return "집밥노트";
  }

  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  if (fullName && fullName.trim()) {
    return fullName.trim();
  }

  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  if (name && name.trim()) {
    return name.trim();
  }

  if (user.email && user.email.includes("@")) {
    return user.email.split("@")[0] || "집밥러";
  }

  return "집밥러";
}

function resolveUserAvatar(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : null;

  return avatarUrl && avatarUrl.trim() ? avatarUrl : null;
}

function resolveCurrentProvider(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const provider =
    typeof user.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : typeof user.user_metadata?.provider === "string"
        ? user.user_metadata.provider
        : null;

  return provider && provider.trim() ? provider : null;
}

export interface UseAuthResult {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signingIn: boolean;
  migrating: boolean;
  providers: AuthProviderOption[];
  error: AuthQueryError | null;
  migrationResult: DeviceDataMigrationResult | null;
  userDisplayName: string;
  userEmail: string | null;
  userAvatarUrl: string | null;
  currentProvider: string | null;
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const deviceId = useMemo(() => getDeviceId(), []);
  const providers = useMemo(() => buildProviderOptions(), []);
  const migratedKeyRef = useRef<Set<string>>(new Set());

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [migrating, setMigrating] = useState<boolean>(false);
  const [error, setError] = useState<AuthQueryError | null>(null);
  const [migrationResult, setMigrationResult] = useState<DeviceDataMigrationResult | null>(null);

  const runMigration = useCallback(
    async (nextUser: User | null) => {
      if (!nextUser) {
        return;
      }

      const client = createAuthClient(deviceId);
      if (!client) {
        return;
      }

      const migrationKey = `${deviceId}:${nextUser.id}`;
      if (migratedKeyRef.current.has(migrationKey)) {
        return;
      }

      migratedKeyRef.current.add(migrationKey);
      setMigrating(true);

      try {
        const result = await migrateDeviceData({
          client,
          deviceId,
          userId: nextUser.id,
        });
        setMigrationResult(result);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "디바이스 데이터 이전 중 오류가 발생했습니다.";
        setError(toAuthError(message, "supabase"));
        migratedKeyRef.current.delete(migrationKey);
      } finally {
        setMigrating(false);
      }
    },
    [deviceId],
  );

  const refreshUser = useCallback(async () => {
    const client = createAuthClient(deviceId);
    if (!client) {
      setError(toAuthError("Supabase 환경변수가 설정되지 않아 로그인 기능을 사용할 수 없습니다.", "config"));
      return;
    }

    const { data, error: authError } = await client.auth.getUser();
    if (authError) {
      setError(toAuthError(authError.message, "supabase"));
      return;
    }

    setUser(data.user ?? null);
    if (data.user) {
      await runMigration(data.user);
    }
  }, [deviceId, runMigration]);

  const signInWithProvider = useCallback(
    async (provider: OAuthProvider) => {
      const client = createAuthClient(deviceId);
      if (!client) {
        setError(toAuthError("Supabase 환경변수가 설정되지 않아 로그인 기능을 사용할 수 없습니다.", "config"));
        return;
      }

      const providerOption = providers.find((item) => item.provider === provider);
      if (!providerOption?.enabled) {
        setError(toAuthError("해당 로그인 제공자가 비활성화되어 있습니다. Supabase 설정을 확인해주세요.", "config"));
        return;
      }

      setSigningIn(true);
      setError(null);

      try {
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/mypage` : undefined;
        const { error: signInError } = await client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
          },
        });

        if (signInError) {
          throw signInError;
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "로그인 요청 중 오류가 발생했습니다.";
        setError(toAuthError(message, "supabase"));
      } finally {
        setSigningIn(false);
      }
    },
    [deviceId, providers],
  );

  const signOut = useCallback(async () => {
    const client = createAuthClient(deviceId);
    if (!client) {
      setError(toAuthError("Supabase 환경변수가 설정되지 않아 로그아웃 기능을 사용할 수 없습니다.", "config"));
      return;
    }

    setError(null);

    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setError(toAuthError(signOutError.message, "supabase"));
      return;
    }

    migratedKeyRef.current.clear();
    setMigrationResult(null);
    setUser(null);
  }, [deviceId]);

  useEffect(() => {
    const client = createAuthClient(deviceId);
    if (!client) {
      setLoading(false);
      setError(toAuthError("Supabase 환경변수가 설정되지 않아 로그인 기능을 사용할 수 없습니다.", "config"));
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      setLoading(true);
      setError(null);

      const { data, error: authError } = await client.auth.getUser();
      if (!isMounted) {
        return;
      }

      if (authError) {
        setError(toAuthError(authError.message, "supabase"));
      }

      setUser(data.user ?? null);
      setLoading(false);

      if (data.user) {
        await runMigration(data.user);
      }
    };

    void initialize();

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setMigrationResult(null);
        return;
      }

      void runMigration(nextUser);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [deviceId, runMigration]);

  return {
    user,
    isAuthenticated: Boolean(user),
    loading,
    signingIn,
    migrating,
    providers,
    error,
    migrationResult,
    userDisplayName: resolveUserDisplayName(user),
    userEmail: user?.email ?? null,
    userAvatarUrl: resolveUserAvatar(user),
    currentProvider: resolveCurrentProvider(user),
    signInWithProvider,
    signOut,
    refreshUser,
  };
}
