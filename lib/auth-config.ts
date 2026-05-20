// 이 파일은 OAuth 제공자 활성화 상태를 순수 함수로 판정합니다.
import type { AuthProviderOption, OAuthProvider } from "../types/index.ts";

const PROVIDER_PRIORITY: OAuthProvider[] = ["google", "apple", "kakao"];

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "구글",
  kakao: "카카오",
  apple: "애플",
};

const PROVIDER_ENV_KEYS: Record<OAuthProvider, string> = {
  google: "NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED",
  kakao: "NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED",
  apple: "NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED",
};

export interface AuthProviderConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  providerList?: string;
  googleEnabled?: string;
  kakaoEnabled?: string;
  appleEnabled?: string;
}

export interface ResolvedAuthProviderOption extends AuthProviderOption {
  disabledReason: string | null;
  userDisabledReason: string | null;
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

function trimConfigValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getProviderFlag(config: AuthProviderConfig, provider: OAuthProvider): string | undefined {
  if (provider === "google") {
    return config.googleEnabled;
  }
  if (provider === "apple") {
    return config.appleEnabled;
  }
  return config.kakaoEnabled;
}

function buildUserDisabledReason(provider: OAuthProvider, missingSupabaseKey: string | null): string {
  if (missingSupabaseKey) {
    return "지금은 소셜 로그인을 사용할 수 없습니다. 이메일로 계속해주세요.";
  }

  return `현재 ${PROVIDER_LABELS[provider]} 로그인은 준비 중입니다. 이메일로 계속해주세요.`;
}

export function resolveAuthProviderOptions(config: AuthProviderConfig): ResolvedAuthProviderOption[] {
  const missingSupabaseKey = !trimConfigValue(config.supabaseUrl)
    ? "NEXT_PUBLIC_SUPABASE_URL"
    : !trimConfigValue(config.supabaseAnonKey)
      ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      : null;

  const explicitList = new Set(
    (config.providerList ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  const hasExplicitList = explicitList.size > 0;

  const options = PROVIDER_PRIORITY.map((provider) => {
    const flagRawValue = getProviderFlag(config, provider);
    const flagValue = parseBooleanFlag(flagRawValue);
    let enabled = false;
    let disabledReason: string | null = `${PROVIDER_ENV_KEYS[provider]}=true로 설정되지 않았습니다.`;

    if (hasExplicitList) {
      enabled = explicitList.has(provider);
      if (!enabled) {
        disabledReason = `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS에 ${provider} 항목이 없습니다.`;
      }
    }

    if (flagValue !== null) {
      enabled = flagValue;
      disabledReason = flagValue ? null : `${PROVIDER_ENV_KEYS[provider]}=false로 꺼져 있습니다.`;
    } else if (trimConfigValue(flagRawValue)) {
      enabled = false;
      disabledReason = `${PROVIDER_ENV_KEYS[provider]} 값은 true 또는 false여야 합니다.`;
    }

    if (missingSupabaseKey) {
      enabled = false;
      disabledReason = `${missingSupabaseKey}이 설정되지 않았습니다.`;
    }

    return {
      provider,
      label: PROVIDER_LABELS[provider],
      enabled,
      disabledReason,
      userDisabledReason: enabled ? null : buildUserDisabledReason(provider, missingSupabaseKey),
    };
  });

  const enabled = options.filter((item) => item.enabled);
  const disabled = options.filter((item) => !item.enabled);

  return [...enabled, ...disabled];
}
