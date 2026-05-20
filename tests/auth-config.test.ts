import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveAuthProviderOptions } from "../lib/auth-config.ts";

const BASE_CONFIG = {
  supabaseUrl: "https://project.supabase.co",
  supabaseAnonKey: "public-anon-key",
};

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

  assert.match(source, /import \{ getSupabaseClient \} from "@\/lib\/supabase";/);
  assert.match(source, /return getSupabaseClient\(\{ deviceId \}\);/);
  assert.doesNotMatch(source, /createClient\(/);
  assert.doesNotMatch(source, /authClientCache/);
});

test("browser Supabase client is a singleton and injects device id per request", () => {
  const source = readFileSync(new URL("../lib/supabase.ts", import.meta.url), "utf8");

  assert.match(source, /let clientCache: SupabaseClient \| null = null;/);
  assert.match(source, /let latestDeviceId: string \| null = null;/);
  assert.match(source, /headers\.set\("x-device-id", latestDeviceId\);/);
  assert.doesNotMatch(source, /new Map<string, SupabaseClient>/);
});

test("community hook uses the shared Supabase client factory", () => {
  const source = readFileSync(new URL("../hooks/useCommunity.ts", import.meta.url), "utf8");

  assert.match(source, /import \{ getSupabaseClient \} from "@\/lib\/supabase";/);
  assert.match(source, /return getSupabaseClient\(\{ deviceId \}\);/);
  assert.doesNotMatch(source, /createClient\(/);
  assert.doesNotMatch(source, /communityClientCache/);
});
