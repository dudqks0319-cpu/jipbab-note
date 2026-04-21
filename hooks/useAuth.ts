// 이 파일은 Supabase OAuth 로그인 상태와 디바이스 데이터 이전을 관리하는 훅입니다.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { getDeviceId } from "@/lib/device-id";
import { migrateDeviceData } from "@/lib/migrate-device-data";
import { resolveAuthProviderOptions, type ResolvedAuthProviderOption } from "@/lib/auth-config";
import type {
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

const authClientCache = new Map<string, SupabaseClient>();

function toAuthError(message: string, source: AuthQueryError["source"]): AuthQueryError {
  return { message, source };
}

function isIgnorableMissingSessionError(error: { message?: string } | null | undefined): boolean {
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  return message.includes("auth session missing");
}

function buildProviderOptions(): ResolvedAuthProviderOption[] {
  return resolveAuthProviderOptions({
    supabaseUrl: PUBLIC_SUPABASE_URL,
    supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY,
    providerList: PUBLIC_OAUTH_PROVIDER_LIST,
    googleEnabled: PUBLIC_GOOGLE_OAUTH_ENABLED,
    kakaoEnabled: PUBLIC_KAKAO_OAUTH_ENABLED,
    appleEnabled: PUBLIC_APPLE_OAUTH_ENABLED,
  });
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

function buildAuthRedirectUrl(nextPath = "/mypage"): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}

export interface UseAuthResult {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signingIn: boolean;
  migrating: boolean;
  providers: ResolvedAuthProviderOption[];
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
    if (authError && !isIgnorableMissingSessionError(authError)) {
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
        setError(toAuthError(providerOption?.disabledReason ?? "해당 로그인 제공자가 비활성화되어 있습니다.", "config"));
        return;
      }

      setSigningIn(true);
      setError(null);

      try {
        const redirectTo = buildAuthRedirectUrl("/mypage");
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

      if (authError && !isIgnorableMissingSessionError(authError)) {
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
