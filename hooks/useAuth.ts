// 이 파일은 Supabase OAuth 로그인 상태와 디바이스 데이터 이전을 관리하는 훅입니다.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { type SupabaseClient, type User } from "@supabase/supabase-js";

import { getDeviceId } from "@/lib/device-id";
import { migrateDeviceData } from "@/lib/migrate-device-data";
import { getSupabaseClient } from "@/lib/supabase";
import {
  buildAuthCallbackUrl,
  buildEmailConfirmationRedirectUrl,
  buildNativeAuthCallbackUrl,
  isNativeAuthCallbackUrl,
  normalizeAuthNextPath,
} from "@/lib/auth-redirect";
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

const AUTH_UNAVAILABLE_MESSAGE = "지금은 로그인 기능을 사용할 수 없습니다. 잠시 후 다시 시도해주세요.";

type EmailSignInResult = {
  ok: boolean;
};

type EmailSignUpResult = {
  ok: boolean;
  requiresEmailConfirmation: boolean;
};

function toAuthError(message: string, source: AuthQueryError["source"]): AuthQueryError {
  return { message, source };
}

function getAuthUserMessage(
  caught: unknown,
  fallbackMessage: string,
): string {
  const rawMessage = caught instanceof Error ? caught.message.toLowerCase() : "";
  if (!rawMessage) {
    return fallbackMessage;
  }

  if (rawMessage.includes("email not confirmed")) {
    return "이메일 확인이 필요합니다. 받은편지함의 인증 메일을 확인해주세요.";
  }

  if (rawMessage.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호를 확인해주세요.";
  }

  if (rawMessage.includes("user already registered") || rawMessage.includes("already registered")) {
    return "이미 가입된 이메일입니다. 로그인으로 계속해주세요.";
  }

  if (rawMessage.includes("rate limit") || rawMessage.includes("too many")) {
    return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
  }

  return fallbackMessage;
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

  // Auth도 lib/supabase.ts의 캐시된 client를 사용해서 GoTrueClient 중복 생성을 줄입니다.
  return getSupabaseClient({ deviceId });
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

function buildBrowserAuthCallbackUrl(nextPath = "/mypage"): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return buildAuthCallbackUrl(window.location.origin, nextPath);
}

function buildBrowserEmailConfirmationRedirectUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return buildEmailConfirmationRedirectUrl(window.location.origin);
}

function isDuplicateSignupResponse(user: User | null): boolean {
  if (!user || !Array.isArray(user.identities)) {
    return false;
  }

  return user.identities.length === 0;
}

function shouldUseNativeOAuth(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

async function openNativeOAuthSession(
  client: SupabaseClient,
  providerUrl: string,
  fallbackNextPath: string,
): Promise<void> {
  const [{ App }, { Browser }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/browser"),
  ]);

  let appUrlListener: PluginListenerHandle | null = null;
  let browserFinishedListener: PluginListenerHandle | null = null;
  let settled = false;

  await new Promise<void>((resolve, reject) => {
    const cleanup = async () => {
      await appUrlListener?.remove();
      await browserFinishedListener?.remove();
      appUrlListener = null;
      browserFinishedListener = null;
    };

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      void Browser.close().catch(() => undefined);
      void cleanup().finally(callback);
    };

    const fail = (caught: unknown) => {
      finish(() => reject(caught instanceof Error ? caught : new Error("Native OAuth failed.")));
    };

    const complete = () => {
      finish(resolve);
    };

    Promise.all([
      App.addListener("appUrlOpen", async ({ url }) => {
        if (!isNativeAuthCallbackUrl(url)) {
          return;
        }

        try {
          const callbackUrl = new URL(url);
          const providerError = callbackUrl.searchParams.get("error") ?? callbackUrl.searchParams.get("error_description");
          if (providerError) {
            throw new Error(providerError);
          }

          const code = callbackUrl.searchParams.get("code");
          if (!code) {
            throw new Error("OAuth callback code was not returned.");
          }

          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }

          const nextPath = normalizeAuthNextPath(callbackUrl.searchParams.get("next") ?? fallbackNextPath);
          window.location.assign(nextPath);
          complete();
        } catch (caught) {
          fail(caught);
        }
      }),
      Browser.addListener("browserFinished", () => {
        fail(new Error("OAuth browser was closed before login completed."));
      }),
    ])
      .then(([nextAppUrlListener, nextBrowserFinishedListener]) => {
        appUrlListener = nextAppUrlListener;
        browserFinishedListener = nextBrowserFinishedListener;
        return Browser.open({
          url: providerUrl,
          presentationStyle: "fullscreen",
          toolbarColor: "#fffaf3",
        });
      })
      .catch(fail);
  });
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
  signInWithEmail: (email: string, password: string) => Promise<EmailSignInResult>;
  signUpWithEmail: (email: string, password: string, nickname?: string) => Promise<EmailSignUpResult>;
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
        const message = getAuthUserMessage(caught, "디바이스 데이터 이전 중 오류가 발생했습니다.");
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
      setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
      return;
    }

    const { data, error: authError } = await client.auth.getUser();
    if (authError && !isIgnorableMissingSessionError(authError)) {
      setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "supabase"));
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
        setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
        return;
      }

      const providerOption = providers.find((item) => item.provider === provider);
      if (!providerOption?.enabled) {
        setError(
          toAuthError(providerOption?.userDisabledReason ?? "해당 로그인 제공자가 비활성화되어 있습니다.", "config"),
        );
        return;
      }

      setSigningIn(true);
      setError(null);

      try {
        const nextPath = "/mypage";
        const redirectTo = shouldUseNativeOAuth()
          ? buildNativeAuthCallbackUrl(nextPath)
          : buildBrowserAuthCallbackUrl(nextPath);
        const { data, error: signInError } = await client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (signInError) {
          throw signInError;
        }

        if (!data.url) {
          throw new Error("OAuth provider URL was not returned.");
        }

        if (shouldUseNativeOAuth()) {
          await openNativeOAuthSession(client, data.url, nextPath);
          return;
        }

        window.location.assign(data.url);
      } catch (caught) {
        const message = getAuthUserMessage(caught, "소셜 로그인을 완료하지 못했습니다. 다시 시도하거나 이메일로 로그인해주세요.");
        setError(toAuthError(message, "supabase"));
        setSigningIn(false);
      }
    },
    [deviceId, providers],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const client = createAuthClient(deviceId);
      if (!client) {
        setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
        return { ok: false };
      }

      setSigningIn(true);
      setError(null);

      try {
        const { data, error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw signInError;
        }

        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          await runMigration(sessionUser);
        }
        return { ok: true };
      } catch (caught) {
        const message = getAuthUserMessage(caught, "이메일 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        setError(toAuthError(message, "supabase"));
        return { ok: false };
      } finally {
        setSigningIn(false);
      }
    },
    [deviceId, runMigration],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, nickname?: string) => {
      const client = createAuthClient(deviceId);
      if (!client) {
        setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
        return { ok: false, requiresEmailConfirmation: false };
      }

      setSigningIn(true);
      setError(null);

      try {
        const displayName = nickname?.trim();
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: displayName
              ? {
                  name: displayName,
                  full_name: displayName,
                }
              : undefined,
            emailRedirectTo: buildBrowserEmailConfirmationRedirectUrl(),
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (isDuplicateSignupResponse(data.user ?? null)) {
          setError(toAuthError("이미 가입된 이메일입니다. 로그인으로 계속해주세요.", "supabase"));
          return { ok: false, requiresEmailConfirmation: false };
        }

        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          await runMigration(sessionUser);
          return { ok: true, requiresEmailConfirmation: false };
        }
        return { ok: true, requiresEmailConfirmation: true };
      } catch (caught) {
        const message = getAuthUserMessage(caught, "이메일 회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        setError(toAuthError(message, "supabase"));
        return { ok: false, requiresEmailConfirmation: false };
      } finally {
        setSigningIn(false);
      }
    },
    [deviceId, runMigration],
  );

  const signOut = useCallback(async () => {
    const client = createAuthClient(deviceId);
    if (!client) {
      setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
      return;
    }

    setError(null);

    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setError(toAuthError("로그아웃 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "supabase"));
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
      setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
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
        setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "supabase"));
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
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshUser,
  };
}
