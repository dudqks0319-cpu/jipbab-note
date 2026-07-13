import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { resolveAuthProviderOptions } from "../lib/auth-config.ts";
import { clearSupabaseAuthStorage } from "../lib/supabase.ts";

const BASE_CONFIG = {
  supabaseUrl: "https://project.supabase.co",
  supabaseAnonKey: "public-anon-key",
};

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("keeps OAuth providers off until explicitly enabled", () => {
  const providers = resolveAuthProviderOptions(BASE_CONFIG);

  assert.deepEqual(
    providers.map((item) => [item.provider, item.enabled, item.disabledReason]),
    [
      ["google", false, "NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED=true로 설정되지 않았습니다."],
      ["apple", false, "NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED=true로 설정되지 않았습니다."],
      ["kakao", false, "NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED=true로 설정되지 않았습니다."],
    ],
  );
});

test("enables Apple and Kakao when provider flags are explicitly on", () => {
  const providers = resolveAuthProviderOptions({
    ...BASE_CONFIG,
    providerList: "google,apple,kakao",
    googleEnabled: "true",
    appleEnabled: "true",
    kakaoEnabled: "true",
  });

  assert.deepEqual(
    providers.map((item) => [item.provider, item.enabled, item.disabledReason]),
    [
      ["google", true, null],
      ["apple", true, null],
      ["kakao", true, null],
    ],
  );
});

test("reports missing Supabase public config without exposing secret values", () => {
  const providers = resolveAuthProviderOptions({
    supabaseAnonKey: "public-anon-key",
  });

  assert.equal(providers.every((item) => !item.enabled), true);
  assert.equal(providers[0].disabledReason, "NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
  assert.doesNotMatch(providers[0].disabledReason ?? "", /public-anon-key/);
});

test("clears persisted Supabase auth keys without removing app device data", () => {
  const storage = new MemoryStorage();
  storage.setItem("sb-xqelabiwtjntwrjqcteo-auth-token", "session");
  storage.setItem("sb-xqelabiwtjntwrjqcteo-auth-token-code-verifier", "verifier");
  storage.setItem("supabase.auth.token", "legacy-session");
  storage.setItem("jipbab-device-id", "device-1");

  clearSupabaseAuthStorage([storage]);

  assert.equal(storage.getItem("sb-xqelabiwtjntwrjqcteo-auth-token"), null);
  assert.equal(storage.getItem("sb-xqelabiwtjntwrjqcteo-auth-token-code-verifier"), null);
  assert.equal(storage.getItem("supabase.auth.token"), null);
  assert.equal(storage.getItem("jipbab-device-id"), "device-1");
});

test("reports providers missing from the explicit OAuth provider list", () => {
  const providers = resolveAuthProviderOptions({
    ...BASE_CONFIG,
    providerList: "google",
  });
  const apple = providers.find((item) => item.provider === "apple");

  assert.equal(apple?.enabled, false);
  assert.equal(apple?.disabledReason, "NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS에 apple 항목이 없습니다.");
});

test("reports provider flags configured off", () => {
  const providers = resolveAuthProviderOptions({
    ...BASE_CONFIG,
    appleEnabled: "false",
  });
  const apple = providers.find((item) => item.provider === "apple");

  assert.equal(apple?.enabled, false);
  assert.equal(apple?.disabledReason, "NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED=false로 꺼져 있습니다.");
});

test("keeps developer config details out of user-facing disabled messages", () => {
  const providers = resolveAuthProviderOptions({
    ...BASE_CONFIG,
    appleEnabled: "false",
  });
  const apple = providers.find((item) => item.provider === "apple");

  assert.equal(apple?.userDisabledReason, "현재 애플 로그인은 준비 중입니다. 이메일로 계속해주세요.");
  assert.doesNotMatch(apple?.userDisabledReason ?? "", /NEXT_PUBLIC|false|true/);
});

test("social login buttons use store-safe provider wording", () => {
  const source = readFileSync(new URL("../components/auth/AuthProviderButton.tsx", import.meta.url), "utf8");

  assert.match(source, />Apple로 로그인</);
  assert.match(source, />카카오 로그인</);
  assert.match(source, /onMouseDown=\{handleActivate\}/);
  assert.match(source, /onPointerDown=\{handleActivate\}/);
  assert.match(source, /onPointerUp=\{handleActivate\}/);
  assert.match(source, /onTouchStart=\{handleActivate\}/);
  assert.match(source, /onTouchEnd=\{handleActivate\}/);
  assert.match(source, /lastActivationRef/);
  assert.match(source, /now - lastActivationRef\.current < 700/);
  assert.doesNotMatch(source, /Apple로 계속하기|카카오로 시작하기/);
});

test("OAuth live check catches Kakao provider-side consent errors", () => {
  const source = readFileSync(new URL("../scripts/check-oauth-live.mjs", import.meta.url), "utf8");

  assert.match(source, /kauth\.kakao\.com/);
  assert.match(source, /KOE\\d\{3\}/);
  assert.match(source, /설정하지 않은 카카오 로그인 동의 항목/);
  assert.match(source, /KAKAO_ACCOUNT_EMAIL_PERMISSION_CONFIRMED/);
  assert.match(source, /Supabase Kakao requests account_email by default/);
  assert.doesNotMatch(source, /console\.log\(location/);
});

test("Kakao browser login uses Supabase provider defaults after email consent is configured", () => {
  const source = readFileSync(new URL("../hooks/useAuth.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /scopes: "profile_nickname profile_image"/);
  assert.doesNotMatch(source, /scopes: "account_email/);
});

test("native OAuth uses system browser and app callback instead of embedded provider WebView", () => {
  const source = readFileSync(new URL("../hooks/useAuth.ts", import.meta.url), "utf8");
  const nativeOAuthSource = readFileSync(new URL("../lib/native-oauth.ts", import.meta.url), "utf8");
  const nativeOAuthPlugin = readFileSync(
    new URL("../ios/App/CapApp-SPM/Sources/CapApp-SPM/JipbabOAuthPlugin.swift", import.meta.url),
    "utf8",
  );
  const redirects = readFileSync(new URL("../lib/auth-redirect.ts", import.meta.url), "utf8");
  const nativeCallbackPage = readFileSync(new URL("../app/auth/native-callback/page.tsx", import.meta.url), "utf8");
  const capacitorConfig = readFileSync(new URL("../capacitor.config.ts", import.meta.url), "utf8");
  const iosCapacitorConfigUrl = new URL("../ios/App/App/capacitor.config.json", import.meta.url);
  const iosCapacitorConfig = existsSync(iosCapacitorConfigUrl)
    ? readFileSync(iosCapacitorConfigUrl, "utf8")
    : null;
  const capacitorSync = readFileSync(new URL("../scripts/sync-capacitor.mjs", import.meta.url), "utf8");
  const iosInfoPlist = readFileSync(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
  const androidManifest = readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
  const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const releaseCheck = readFileSync(new URL("../scripts/release-readiness-check.mjs", import.meta.url), "utf8");

  assert.match(source, /NativeOAuth\.authenticate/);
  assert.match(source, /Capacitor\.getPlatform\(\) === "ios"/);
  assert.match(source, /createNativeAuthCallbackUrlWaiter/);
  assert.match(source, /hasRequiredIosNativeOAuthPlugins/);
  assert.match(source, /Capacitor\.isPluginAvailable\("JipbabOAuth"\)/);
  assert.match(source, /Native OAuth app update required\./);
  assert.match(source, /const callbackUrl = await waitForNativeAuthCallbackUrl/);
  assert.match(source, /NativeOAuth\.authenticate\(\{[\s\S]*callbackScheme: NATIVE_AUTH_CALLBACK_SCHEME,[\s\S]*\}\)\.then\(\(\{ url \}\) => url\)/);
  assert.match(source, /appUrlCallbackWaiter\.promise/);
  assert.match(source, /await appUrlCallbackWaiter\.cleanup\(\)/);
  assert.doesNotMatch(source, /withTimeout\(\s*NativeOAuth\.authenticate/);
  assert.doesNotMatch(source, /Native OAuth plugin did not respond\./);
  assert.match(source, /await openBrowserOAuthSession\(client, nativeProviderUrl, fallbackNextPath\)/);
  assert.match(source, /window\.location\.assign\(nativeProviderUrl\)/);
  assert.match(source, /function enforceNativeOAuthRedirect/);
  assert.match(source, /async function openBrowserOAuthSession/);
  assert.match(source, /url\.searchParams\.set\("redirect_to", buildNativeAuthBridgeUrl\(window\.location\.origin, nextPath\)\)/);
  assert.match(source, /\? buildNativeAuthBridgeUrl\(window\.location\.origin, nextPath\)/);
  assert.match(source, /@capacitor\/app/);
  assert.match(source, /@capacitor\/browser/);
  assert.match(source, /App\.addListener\("appUrlOpen"/);
  assert.match(source, /Browser\.open/);
  assert.match(source, /exchangeCodeForSession\(code\)/);
  assert.match(nativeOAuthSource, /registerPlugin<NativeOAuthPlugin>\("JipbabOAuth"\)/);
  assert.match(nativeOAuthPlugin, /ASWebAuthenticationSession/);
  assert.match(nativeOAuthPlugin, /callbackURLScheme:\s*callbackScheme/);
  assert.match(nativeOAuthPlugin, /prefersEphemeralWebBrowserSession = false/);
  assert.match(nativeOAuthPlugin, /Notification\.Name\.capacitorOpenURL/);
  assert.match(nativeOAuthPlugin, /handleOpenUrl/);
  assert.match(nativeOAuthPlugin, /resolveActiveCall\(with: callbackUrl\)/);
  assert.match(source, /skipBrowserRedirect:\s*true/);
  assert.match(redirects, /com\.jipbab\.note:\/\/auth\/callback/);
  assert.match(redirects, /\/auth\/native-callback/);
  assert.match(nativeCallbackPage, /window\.location\.replace\(nativeCallbackUrl\)/);
  assert.match(nativeCallbackPage, /for \(const key of \["code", "error", "error_description"\]/);
  assert.match(nativeCallbackPage, /missing_oauth_code/);
  assert.match(iosInfoPlist, /<key>CFBundleURLSchemes<\/key>[\s\S]*<string>com\.jipbab\.note<\/string>/);
  assert.match(androidManifest, /android:scheme="com\.jipbab\.note"/);
  assert.match(capacitorConfig, /JipbabOAuthPlugin/);
  assert.match(capacitorConfig, /CapApp_SPM\.JipbabOAuthPlugin/);
  assert.match(capacitorConfig, /allowNavigation:\s*Array\.from\(new Set\(oauthNavigationHosts\)\)/);
  assert.match(capacitorConfig, /CAPACITOR_CLOUDFLARE_HOST/);
  assert.match(capacitorConfig, /hostFromUrl\(runtimeAppUrl\)/);
  assert.match(capacitorConfig, /xqelabiwtjntwrjqcteo\.supabase\.co/);
  if (iosCapacitorConfig) {
    assert.match(iosCapacitorConfig, /CAPBrowserPlugin|BrowserPlugin/);
    assert.match(iosCapacitorConfig, /JipbabOAuthPlugin/);
  } else {
    assert.match(capacitorSync, /BrowserPlugin/);
    assert.match(capacitorSync, /JipbabOAuthPlugin/);
  }
  assert.doesNotMatch(capacitorConfig, /accounts\.google\.com/);
  assert.doesNotMatch(capacitorConfig, /appleid\.apple\.com/);
  assert.doesNotMatch(capacitorConfig, /kauth\.kakao\.com/);
  assert.match(packageJson, /"@capacitor\/app"/);
  assert.match(packageJson, /"@capacitor\/browser"/);
  assert.match(releaseCheck, /REQUIRED_OAUTH_WEBVIEW_HOSTS/);
  assert.match(releaseCheck, /CAPACITOR_CLOUDFLARE_HOST/);
  assert.match(releaseCheck, /FORBIDDEN_OAUTH_WEBVIEW_HOSTS/);
  assert.match(releaseCheck, /hasRequiredOAuthNavigationHosts/);
  assert.match(releaseCheck, /CAPBrowserPlugin/);
});

test("native OAuth handles iOS open-app callback when ASWebAuthenticationSession does not resolve first", () => {
  const source = readFileSync(new URL("../hooks/useAuth.ts", import.meta.url), "utf8");
  const nativeOAuthPlugin = readFileSync(
    new URL("../ios/App/CapApp-SPM/Sources/CapApp-SPM/JipbabOAuthPlugin.swift", import.meta.url),
    "utf8",
  );

  assert.match(source, /async function createNativeAuthCallbackUrlWaiter/);
  assert.match(source, /App\.addListener\("appUrlOpen", \(\{ url \}\) => \{/);
  assert.match(source, /if \(!isNativeAuthCallbackUrl\(url\)\) \{\s*return;\s*\}/);
  assert.match(source, /finish\(\(\) => resolve\(url\)\)/);
  assert.match(source, /async function waitForNativeAuthCallbackUrl/);
  assert.match(source, /nativeAuthPromise\.then\(resolveOnce\)\.catch\(recordFailure\)/);
  assert.match(source, /appUrlPromise\.then\(resolveOnce\)\.catch\(recordFailure\)/);
  assert.match(source, /Native OAuth callback timed out\./);
  assert.doesNotMatch(source, /Promise\.race\(\[[\s\S]*NativeOAuth\.authenticate/);
  assert.match(source, /const nextPath = await exchangeNativeOAuthCallbackUrl\(client, callbackUrl, fallbackNextPath\)/);
  assert.match(nativeOAuthPlugin, /NotificationCenter\.default\.addObserver\([\s\S]*Notification\.Name\.capacitorOpenURL/);
  assert.match(nativeOAuthPlugin, /callbackUrl\.scheme == activeCallbackScheme/);
});

test("native OAuth gives appUrlOpen a grace window before treating browser close as failure", () => {
  const source = readFileSync(new URL("../hooks/useAuth.ts", import.meta.url), "utf8");

  assert.match(source, /browserSessionTimer/);
  assert.match(source, /Native OAuth callback timed out\./);
  assert.match(source, /browserFinishedGraceTimer/);
  assert.match(source, /clearTimeout\(browserFinishedGraceTimer\)/);
  assert.match(source, /Browser\.addListener\("browserFinished"/);
  assert.match(source, /setTimeout\(\(\) => \{\s*fail\(new Error\("OAuth browser was closed before login completed\."\)\);\s*\}, 2500\)/);
  assert.doesNotMatch(source, /Browser\.addListener\("browserFinished", \(\) => \{\s*fail\(new Error\("OAuth browser was closed before login completed\."\)\);\s*\}\)/);
});

test("app shell exposes visible back navigation away from root tabs", () => {
  const source = readFileSync(new URL("../components/layout/AppShell.tsx", import.meta.url), "utf8");

  assert.match(source, /ROOT_ROUTES/);
  assert.match(source, /aria-label="이전 화면으로 돌아가기"/);
  assert.match(source, /router\.back\(\)/);
  assert.match(source, /ArrowLeft/);
});

test("Apple client secret generator avoids accidental stdout token leaks", () => {
  const source = readFileSync(new URL("../scripts/generate-apple-client-secret.mjs", import.meta.url), "utf8");

  assert.match(source, /APPLE_CLIENT_SECRET_OUT is required/);
  assert.match(source, /APPLE_CLIENT_SECRET_PRINT/);
  assert.match(source, /writeFileSync\(resolvedOutputPath, `\$\{token\}\\n`/);
});

test("shows a generic user-facing message when Supabase public config is unavailable", () => {
  const providers = resolveAuthProviderOptions({
    supabaseAnonKey: "public-anon-key",
  });

  assert.equal(providers[0].userDisabledReason, "지금은 소셜 로그인을 사용할 수 없습니다. 이메일로 계속해주세요.");
  assert.doesNotMatch(providers[0].userDisabledReason ?? "", /NEXT_PUBLIC|public-anon-key/);
});

test("useAuth reuses the shared Supabase client factory", () => {
  const source = readFileSync(new URL("../hooks/useAuth.ts", import.meta.url), "utf8");

  assert.match(source, /import \{ clearSupabaseAuthStorage, getSupabaseClient \} from "@\/lib\/supabase";/);
  assert.match(source, /return getSupabaseClient\(\);/);
  assert.doesNotMatch(source, /createClient\(/);
  assert.doesNotMatch(source, /authClientCache/);
});

test("browser Supabase client is a singleton and never injects device identity", () => {
  const source = readFileSync(new URL("../lib/supabase.ts", import.meta.url), "utf8");

  assert.match(source, /let clientCache: SupabaseClient \| null = null;/);
  assert.doesNotMatch(source, /latestDeviceId/);
  assert.doesNotMatch(source, /x-device-id/i);
  assert.match(source, /flowType:\s*"pkce"/);
  assert.match(source, /detectSessionInUrl:\s*false/);
  assert.doesNotMatch(source, /new Map<string, SupabaseClient>/);
});

test("OAuth callback handles provider errors before requiring an auth code without rendering raw details", () => {
  const source = readFileSync(new URL("../app/auth/callback/page.tsx", import.meta.url), "utf8");

  assert.match(source, /searchParams\.get\("error_description"\)/);
  assert.match(source, /searchParams\.get\("error"\)/);
  assert.match(source, /getProviderCallbackErrorMessage/);
  assert.match(source, /소셜 로그인 승인을 완료하지 못했습니다/);
  assert.match(source, /if \(!code\)/);
  assert.doesNotMatch(source, /setErrorMessage\(providerError/);
});

test("auth UI maps provider and Supabase errors to release-safe user messages", () => {
  const source = readFileSync(new URL("../hooks/useAuth.ts", import.meta.url), "utf8");
  const callbackSource = readFileSync(new URL("../app/auth/callback/page.tsx", import.meta.url), "utf8");
  const accountDeleteSource = readFileSync(new URL("../app/account-delete/page.tsx", import.meta.url), "utf8");

  assert.match(source, /getAuthUserMessage/);
  assert.match(source, /이메일 확인이 필요합니다/);
  assert.match(source, /이메일 또는 비밀번호를 확인해주세요/);
  assert.match(callbackSource, /getCallbackErrorMessage/);
  assert.match(callbackSource, /code verifier/);
  assert.doesNotMatch(source, /setError\(toAuthError\([^)]*\.message/);
  assert.doesNotMatch(callbackSource, /setErrorMessage\(caught instanceof Error \? caught\.message/);
  assert.match(source, /clearSupabaseAuthStorage\(\)/);
  assert.match(source, /shouldClearStoredSession/);
  assert.match(accountDeleteSource, /계정을 삭제하지 못했습니다\. 잠시 후 다시 시도하거나 고객센터로 문의해주세요/);
  assert.match(accountDeleteSource, /\/api\/account\/delete/);
  assert.match(accountDeleteSource, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(accountDeleteSource, /confirmation: DIRECT_DELETE_CONFIRMATION/);
  assert.match(accountDeleteSource, /client\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(accountDeleteSource, /clearSupabaseAuthStorage\(\)/);
  assert.match(accountDeleteSource, /const isConfirmed = confirmText\.trim\(\) === DELETE_CONFIRMATION_TEXT/);
  assert.match(accountDeleteSource, /confirmInputRef\.current\?\.focus\(\)/);
  assert.match(accountDeleteSource, /disabled=\{submitting\}/);
  assert.match(accountDeleteSource, /placeholder="확인 문구를 직접 입력"/);
  assert.match(accountDeleteSource, /입력칸에 “삭제”를 직접 입력하면 버튼이 활성화됩니다/);
  assert.doesNotMatch(accountDeleteSource, /placeholder="삭제"/);
  assert.doesNotMatch(accountDeleteSource, /disabled=\{submitting \|\| confirmText\.trim\(\) !== DELETE_CONFIRMATION_TEXT\}/);
  assert.doesNotMatch(accountDeleteSource, /error instanceof Error \? error\.message/);
});

test("email signup separates confirmation-required and duplicate-email outcomes", () => {
  const source = readFileSync(new URL("../hooks/useAuth.ts", import.meta.url), "utf8");
  const screenSource = readFileSync(new URL("../components/auth/AuthScreen.tsx", import.meta.url), "utf8");

  assert.match(source, /buildEmailConfirmationRedirectUrl/);
  assert.match(source, /emailRedirectTo: buildBrowserEmailConfirmationRedirectUrl\(\)/);
  assert.match(source, /isDuplicateSignupResponse/);
  assert.match(source, /identities\.length === 0/);
  assert.match(source, /requiresEmailConfirmation: true/);
  assert.match(screenSource, /인증 메일을 보냈습니다/);
  assert.match(screenSource, /회원가입이 완료되어 로그인되었습니다/);
});

test("OAuth callback recovery actions avoid sending failed sessions to mypage", () => {
  const source = readFileSync(new URL("../app/auth/callback/page.tsx", import.meta.url), "utf8");
  const errorBlock = source.slice(source.indexOf("{errorMessage ?"), source.indexOf(") : ("));

  assert.match(errorBlock, /href="\/login"/);
  assert.match(errorBlock, /href="\/signup"/);
  assert.doesNotMatch(errorBlock, /href="\/mypage"/);
});

test("password reset is a real Supabase reset flow instead of a support link", () => {
  const screenSource = readFileSync(new URL("../components/auth/AuthScreen.tsx", import.meta.url), "utf8");
  const resetSource = readFileSync(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8");

  assert.match(screenSource, /href="\/reset-password"/);
  assert.doesNotMatch(screenSource, /비밀번호 찾기<\/Link>[\s\S]*href="\/support"/);
  assert.match(resetSource, /resetPasswordForEmail/);
  assert.match(resetSource, /updateUser\(\{ password \}\)/);
  assert.match(resetSource, /buildPasswordResetRedirectUrl/);
  assert.doesNotMatch(resetSource, /setErrorMessage\(caught instanceof Error \? caught\.message/);
});

test("app UI avoids raw runtime errors in release-facing messages", () => {
  const ingredientsSource = readFileSync(new URL("../hooks/useIngredients.ts", import.meta.url), "utf8");
  const shoppingSource = readFileSync(new URL("../hooks/useShopping.ts", import.meta.url), "utf8");
  const recipesSource = readFileSync(new URL("../hooks/useRecipes.ts", import.meta.url), "utf8");
  const settingsSource = readFileSync(new URL("../app/settings/page.tsx", import.meta.url), "utf8");
  const adminDeleteSource = readFileSync(new URL("../app/admin/account-deletions/page.tsx", import.meta.url), "utf8");

  assert.match(ingredientsSource, /INGREDIENT_SYNC_UNAVAILABLE_MESSAGE/);
  assert.match(shoppingSource, /SHOPPING_SYNC_UNAVAILABLE_MESSAGE/);
  assert.match(recipesSource, /RECIPE_SYNC_UNAVAILABLE_MESSAGE/);
  assert.doesNotMatch(ingredientsSource, /setError\(makeError\([^)]*caught instanceof Error \? caught\.message/);
  assert.doesNotMatch(shoppingSource, /setError\(makeError\([^)]*caught instanceof Error \? caught\.message/);
  assert.doesNotMatch(recipesSource, /setError\([^)]*caught instanceof Error \? caught\.message/);
  assert.doesNotMatch(settingsSource, /error instanceof Error \? error\.message/);
  assert.doesNotMatch(adminDeleteSource, /error instanceof Error \? error\.message/);
});

test("public fallback support link uses the release support page", () => {
  const source = readFileSync(new URL("../capacitor-shell/index.html", import.meta.url), "utf8");

  assert.match(source, /https:\/\/jipbab-note-app\.vercel\.app\/support/);
  assert.doesNotMatch(source, /mailto:/);
});

test("community hook uses the shared Supabase client factory", () => {
  const source = readFileSync(new URL("../hooks/useCommunity.ts", import.meta.url), "utf8");

  assert.match(source, /import \{ getSupabaseClient \} from "@\/lib\/supabase";/);
  assert.match(source, /return getSupabaseClient\(\);/);
  assert.doesNotMatch(source, /createClient\(/);
  assert.doesNotMatch(source, /communityClientCache/);
});
