// 이 파일은 Supabase OAuth 로그인 상태와 디바이스 데이터 이전을 관리하는 훅입니다.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { type SupabaseClient, type User } from "@supabase/supabase-js";

import { getDeviceId } from "@/lib/device-id";
import { migrateDeviceData } from "@/lib/migrate-device-data";
import {
  captureAnonymousSessionForMerge,
  mergePendingAnonymousUserData,
} from "@/lib/anonymous-user-merge";
import { clearSupabaseAuthStorage, getSupabaseClient } from "@/lib/supabase";
import { isPermanentSupabaseUser } from "@/lib/supabase-session";
import {
  buildAuthCallbackUrl,
  buildEmailConfirmationRedirectUrl,
  buildNativeAuthBridgeUrl,
  isNativeAuthCallbackUrl,
  normalizeAuthNextPath,
} from "@/lib/auth-redirect";
import { resolveAuthProviderOptions, type ResolvedAuthProviderOption } from "@/lib/auth-config";
import { NativeOAuth } from "@/lib/native-oauth";
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
const NATIVE_AUTH_CALLBACK_SCHEME = "com.jipbab.note";
const NATIVE_AUTH_CALLBACK_TIMEOUT_MS = 90_000;

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

  if (rawMessage.includes("native oauth app update required")) {
    return "앱 업데이트가 필요합니다. TestFlight에서 최신 집밥노트로 업데이트한 뒤 다시 로그인해주세요.";
  }

  if (rawMessage.includes("native oauth callback timed out")) {
    return "로그인 결과가 앱으로 돌아오지 않았습니다. 앱을 완전히 종료한 뒤 다시 시도해주세요.";
  }

  return fallbackMessage;
}

function isIgnorableMissingSessionError(error: { message?: string } | null | undefined): boolean {
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  return message.includes("auth session missing");
}

function shouldClearStoredSession(error: { message?: string } | null | undefined): boolean {
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  return (
    isIgnorableMissingSessionError(error) ||
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("user not found") ||
    message.includes("jwt malformed")
  );
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

function createAuthClient(): SupabaseClient | null {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  // Auth도 lib/supabase.ts의 캐시된 client를 사용해서 GoTrueClient 중복 생성을 줄입니다.
  return getSupabaseClient();
}

function visibleAuthUser(user: User | null | undefined): User | null {
  return isPermanentSupabaseUser(user) ? user : null;
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

function enforceNativeOAuthRedirect(providerUrl: string, nextPath: string): string {
  const url = new URL(providerUrl);
  url.searchParams.set("redirect_to", buildNativeAuthBridgeUrl(window.location.origin, nextPath));
  return url.toString();
}

function hasRequiredIosNativeOAuthPlugins(): boolean {
  return Capacitor.isPluginAvailable("JipbabOAuth") && Capacitor.isPluginAvailable("App");
}

async function createNativeAuthCallbackUrlWaiter(): Promise<{
  promise: Promise<string>;
  cleanup: () => Promise<void>;
}> {
  const { App } = await import("@capacitor/app");
  let appUrlListener: PluginListenerHandle | null = null;
  let shouldRemoveOnAttach = false;
  let settled = false;

  const cleanup = async () => {
    shouldRemoveOnAttach = true;
    await appUrlListener?.remove();
    appUrlListener = null;
  };

  const promise = new Promise<string>((resolve, reject) => {
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      void cleanup().finally(callback);
    };

    App.addListener("appUrlOpen", ({ url }) => {
      if (!isNativeAuthCallbackUrl(url)) {
        return;
      }

      finish(() => resolve(url));
    })
      .then((nextAppUrlListener) => {
        if (shouldRemoveOnAttach) {
          void nextAppUrlListener.remove();
          return;
        }

        appUrlListener = nextAppUrlListener;
      })
      .catch((caught) => {
        finish(() => reject(caught instanceof Error ? caught : new Error("Native OAuth callback listener failed.")));
      });
  });

  return {
    promise,
    cleanup,
  };
}

async function waitForNativeAuthCallbackUrl(
  nativeAuthPromise: Promise<string>,
  appUrlPromise: Promise<string>,
): Promise<string> {
  let hasSettled = false;
  const failures: unknown[] = [];

  return await new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (hasSettled) {
        return;
      }

      hasSettled = true;
      reject(failures[0] ?? new Error("Native OAuth callback timed out."));
    }, NATIVE_AUTH_CALLBACK_TIMEOUT_MS);

    const resolveOnce = (url: string) => {
      if (hasSettled) {
        return;
      }

      hasSettled = true;
      window.clearTimeout(timer);
      resolve(url);
    };

    const recordFailure = (caught: unknown) => {
      failures.push(caught);
    };

    nativeAuthPromise.then(resolveOnce).catch(recordFailure);
    appUrlPromise.then(resolveOnce).catch(recordFailure);
  });
}

async function openNativeOAuthSession(
  client: SupabaseClient,
  providerUrl: string,
  fallbackNextPath: string,
): Promise<void> {
  const nativeProviderUrl = enforceNativeOAuthRedirect(providerUrl, fallbackNextPath);

  if (Capacitor.getPlatform() === "ios") {
    if (!hasRequiredIosNativeOAuthPlugins()) {
      throw new Error("Native OAuth app update required.");
    }

    const appUrlCallbackWaiter = await createNativeAuthCallbackUrlWaiter();

    try {
      const callbackUrl = await waitForNativeAuthCallbackUrl(
        NativeOAuth.authenticate({
          url: nativeProviderUrl,
          callbackScheme: NATIVE_AUTH_CALLBACK_SCHEME,
        }).then(({ url }) => url),
        appUrlCallbackWaiter.promise,
      );
      await appUrlCallbackWaiter.cleanup();
      const nextPath = await exchangeNativeOAuthCallbackUrl(client, callbackUrl, fallbackNextPath);
      window.location.assign(nextPath);
      return;
    } catch {
      await appUrlCallbackWaiter.cleanup();
      try {
        await openBrowserOAuthSession(client, nativeProviderUrl, fallbackNextPath);
      } catch {
        window.location.assign(nativeProviderUrl);
      }
      return;
    }
  }

  try {
    await openBrowserOAuthSession(client, providerUrl, fallbackNextPath);
  } catch {
    window.location.assign(providerUrl);
  }
}

async function openBrowserOAuthSession(
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
  let browserFinishedGraceTimer: ReturnType<typeof setTimeout> | null = null;
  let browserSessionTimer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  await new Promise<void>((resolve, reject) => {
    const cleanup = async () => {
      if (browserFinishedGraceTimer) {
        clearTimeout(browserFinishedGraceTimer);
        browserFinishedGraceTimer = null;
      }
      if (browserSessionTimer) {
        clearTimeout(browserSessionTimer);
        browserSessionTimer = null;
      }
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
          if (browserFinishedGraceTimer) {
            clearTimeout(browserFinishedGraceTimer);
            browserFinishedGraceTimer = null;
          }

          const nextPath = await exchangeNativeOAuthCallbackUrl(client, url, fallbackNextPath);
          window.location.assign(nextPath);
          complete();
        } catch (caught) {
          fail(caught);
        }
      }),
      Browser.addListener("browserFinished", () => {
        browserFinishedGraceTimer = setTimeout(() => {
          fail(new Error("OAuth browser was closed before login completed."));
        }, 2500);
      }),
    ])
      .then(([nextAppUrlListener, nextBrowserFinishedListener]) => {
        appUrlListener = nextAppUrlListener;
        browserFinishedListener = nextBrowserFinishedListener;
        browserSessionTimer = setTimeout(() => {
          fail(new Error("Native OAuth callback timed out."));
        }, NATIVE_AUTH_CALLBACK_TIMEOUT_MS);
        return Browser.open({
          url: providerUrl,
          presentationStyle: "fullscreen",
          toolbarColor: "#fffaf3",
        });
      })
      .catch(fail);
  });
}

async function exchangeNativeOAuthCallbackUrl(
  client: SupabaseClient,
  value: string,
  fallbackNextPath: string,
): Promise<string> {
  if (!isNativeAuthCallbackUrl(value)) {
    throw new Error("OAuth callback URL did not match the app callback scheme.");
  }

  const callbackUrl = new URL(value);
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

  await mergePendingAnonymousUserData(client);

  return normalizeAuthNextPath(callbackUrl.searchParams.get("next") ?? fallbackNextPath);
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
      if (!isPermanentSupabaseUser(nextUser)) {
        return;
      }

      const client = createAuthClient();
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
    const client = createAuthClient();
    if (!client) {
      setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
      return;
    }

    const { data, error: authError } = await client.auth.getUser();
    if (authError && !isIgnorableMissingSessionError(authError)) {
      setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "supabase"));
      return;
    }

    setUser(visibleAuthUser(data.user));
    if (isPermanentSupabaseUser(data.user)) {
      await runMigration(data.user);
    }
  }, [runMigration]);

  const signInWithProvider = useCallback(
    async (provider: OAuthProvider) => {
      const client = createAuthClient();
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
        await captureAnonymousSessionForMerge(client);
        const nextPath = "/mypage";
        const redirectTo = shouldUseNativeOAuth()
          ? buildNativeAuthBridgeUrl(window.location.origin, nextPath)
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
    [providers],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const client = createAuthClient();
      if (!client) {
        setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
        return { ok: false };
      }

      setSigningIn(true);
      setError(null);

      try {
        await captureAnonymousSessionForMerge(client);
        const { data, error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw signInError;
        }

        await mergePendingAnonymousUserData(client);
        const sessionUser = visibleAuthUser(data.session?.user);
        setUser(sessionUser);
        if (isPermanentSupabaseUser(sessionUser)) {
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
    [runMigration],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, nickname?: string) => {
      const client = createAuthClient();
      if (!client) {
        setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "config"));
        return { ok: false, requiresEmailConfirmation: false };
      }

      setSigningIn(true);
      setError(null);

      try {
        await captureAnonymousSessionForMerge(client);
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

        await mergePendingAnonymousUserData(client);
        const sessionUser = visibleAuthUser(data.session?.user);
        setUser(sessionUser);
        if (isPermanentSupabaseUser(sessionUser)) {
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
    [runMigration],
  );

  const signOut = useCallback(async () => {
    const client = createAuthClient();
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

    clearSupabaseAuthStorage();
    migratedKeyRef.current.clear();
    setMigrationResult(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const client = createAuthClient();
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

      if (authError) {
        if (shouldClearStoredSession(authError)) {
          clearSupabaseAuthStorage();
        }

        if (!isIgnorableMissingSessionError(authError)) {
          setError(toAuthError(AUTH_UNAVAILABLE_MESSAGE, "supabase"));
        }
      }

      const nextVisibleUser = visibleAuthUser(data.user);
      setUser(nextVisibleUser);
      setLoading(false);

      if (isPermanentSupabaseUser(data.user)) {
        await runMigration(data.user);
      }
    };

    void initialize();

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = visibleAuthUser(session?.user);
      setUser(nextUser);

      if (!nextUser) {
        setMigrationResult(null);
        return;
      }

      if (isPermanentSupabaseUser(nextUser)) {
        void runMigration(nextUser);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [runMigration]);

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
