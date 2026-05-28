// 이 스크립트는 공개 OAuth provider가 Supabase에서 실제 로그인 시작까지 연결되는지 확인합니다.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envFilePath = path.join(cwd, ".env.local");
const PROVIDERS = ["google", "apple", "kakao"];
const NATIVE_REDIRECT_TO = "com.jipbab.note://auth/callback";

const PROVIDER_ENV_KEYS = {
  google: "NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED",
  apple: "NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED",
  kakao: "NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED",
};

const EXPECTED_AUTH_HOSTS = {
  google: "accounts.google.com",
  apple: "appleid.apple.com",
  kakao: "kauth.kakao.com",
};

const KAKAO_ACCOUNT_EMAIL_PERMISSION_ENV_KEY = "KAKAO_ACCOUNT_EMAIL_PERMISSION_CONFIRMED";

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const pairs = {};
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    pairs[key] = value;
  }

  return pairs;
}

function parseBooleanFlag(value) {
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

function redactUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "<invalid-url>";
  }
}

function addResult(results, level, label, detail) {
  results.push({ level, label, detail });
}

function resolveEnabledProviders(env) {
  const explicitList = new Set(
    (env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  const hasExplicitList = explicitList.size > 0;

  return PROVIDERS.filter((provider) => {
    const flagValue = parseBooleanFlag(env[PROVIDER_ENV_KEYS[provider]]);
    if (flagValue !== null) {
      return flagValue;
    }
    return hasExplicitList ? explicitList.has(provider) : false;
  });
}

function resolveRedirectTo(env) {
  const explicitSiteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitSiteUrl) {
    return new URL("/auth/callback", explicitSiteUrl).toString();
  }

  const capacitorServerUrl = env.CAPACITOR_SERVER_URL?.trim();
  if (capacitorServerUrl) {
    return new URL("/auth/callback", capacitorServerUrl).toString();
  }

  const vercelProductionUrl = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) {
    return new URL("/auth/callback", `https://${vercelProductionUrl}`).toString();
  }

  return null;
}

function formatError(error) {
  if (!(error instanceof Error)) {
    return "unknown error";
  }

  const cause = error.cause;
  if (cause && typeof cause === "object") {
    const code = "code" in cause ? cause.code : null;
    const syscall = "syscall" in cause ? cause.syscall : null;
    const hostname = "hostname" in cause ? cause.hostname : null;
    const parts = [error.message, code, syscall, hostname].filter(Boolean);
    return parts.join(" / ");
  }

  return error.message;
}

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!text) {
    return "";
  }

  if (!contentType.includes("application/json")) {
    return text.slice(0, 160);
  }

  try {
    const json = JSON.parse(text);
    return json.msg ?? json.error_description ?? json.error ?? JSON.stringify(json).slice(0, 160);
  } catch {
    return text.slice(0, 160);
  }
}

function getKakaoProviderError(body) {
  const compactBody = body.replace(/\s+/g, " ");
  const errorCode = compactBody.match(/\bKOE\d{3}\b/)?.[0] ?? null;
  if (
    errorCode ||
    compactBody.includes("잘못된 요청") ||
    compactBody.includes("설정하지 않은 카카오 로그인 동의 항목")
  ) {
    return errorCode ?? "Kakao provider error";
  }

  return null;
}

async function checkProviderLandingPage({ provider, locationUrl, results }) {
  if (provider !== "kakao") {
    return;
  }

  const response = await fetch(locationUrl, {
    redirect: "manual",
    headers: {
      accept: "text/html,application/xhtml+xml",
    },
  });
  const body = await response.text();
  const providerError = getKakaoProviderError(body);

  if (providerError) {
    addResult(
      results,
      "fail",
      "kakao OAuth provider page",
      `${providerError}: Kakao consent items or app permissions are not ready`,
    );
    return;
  }

  if (response.status >= 400) {
    addResult(results, "fail", "kakao OAuth provider page", `HTTP ${response.status} from kauth.kakao.com`);
    return;
  }

  addResult(results, "pass", "kakao OAuth provider page", "provider endpoint reached");
}

async function checkProvider({
  env,
  provider,
  supabaseUrl,
  redirectTo,
  results,
  labelPrefix = "",
  includeConsentCheck = true,
  includeProviderLandingPage = true,
}) {
  const authorizeUrl = new URL("/auth/v1/authorize", supabaseUrl);
  authorizeUrl.searchParams.set("provider", provider);
  authorizeUrl.searchParams.set("redirect_to", redirectTo);
  const label = `${provider}${labelPrefix ? ` ${labelPrefix}` : ""} OAuth redirect`;

  if (provider === "kakao" && includeConsentCheck) {
    const emailPermissionConfirmed = parseBooleanFlag(env[KAKAO_ACCOUNT_EMAIL_PERMISSION_ENV_KEY]) === true;
    if (emailPermissionConfirmed) {
      addResult(results, "pass", "kakao account_email consent", "Kakao Biz App email consent is confirmed");
    } else {
      addResult(
        results,
        "fail",
        "kakao account_email consent",
        `${KAKAO_ACCOUNT_EMAIL_PERMISSION_ENV_KEY}=true is required because Supabase Kakao requests account_email by default`,
      );
    }
  }

  const response = await fetch(authorizeUrl, {
    redirect: "manual",
  });

  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    const locationUrl = new URL(location);
    const expectedHost = EXPECTED_AUTH_HOSTS[provider];
    if (locationUrl.host === expectedHost) {
      addResult(results, "pass", label, `302 to ${expectedHost}`);
      if (includeProviderLandingPage) {
        await checkProviderLandingPage({ provider, locationUrl, results });
      }
      return;
    }

    addResult(results, "fail", label, `unexpected redirect host ${locationUrl.host}`);
    return;
  }

  const body = await readResponseBody(response);
  addResult(results, "fail", label, `HTTP ${response.status}: ${body || "no redirect"}`);
}

async function run() {
  const env = {
    ...readEnvFile(envFilePath),
    ...process.env,
  };
  const results = [];
  const enabledProviders = resolveEnabledProviders(env);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const redirectTo = resolveRedirectTo(env);
  const usesNonAppleThirdParty = enabledProviders.some((provider) => provider === "google" || provider === "kakao");

  if (enabledProviders.length === 0) {
    addResult(results, "warn", "OAuth providers", "no public OAuth providers are enabled");
  }

  if (usesNonAppleThirdParty && !enabledProviders.includes("apple")) {
    addResult(
      results,
      "fail",
      "Apple parity",
      "Apple login must be enabled when Google or Kakao login is enabled for iOS store review",
    );
  }

  if (!supabaseUrl) {
    addResult(results, "fail", "Supabase URL", "NEXT_PUBLIC_SUPABASE_URL is missing");
  } else {
    addResult(results, "pass", "Supabase URL", redactUrl(supabaseUrl));
  }

  if (!redirectTo) {
    addResult(results, "fail", "OAuth redirect target", "NEXT_PUBLIC_SITE_URL or CAPACITOR_SERVER_URL is missing");
  } else {
    addResult(results, "pass", "OAuth redirect target", redactUrl(redirectTo));
  }

  if (supabaseUrl && redirectTo) {
    for (const provider of enabledProviders) {
      await checkProvider({ env, provider, supabaseUrl, redirectTo, results });
    }
  }

  if (supabaseUrl) {
    for (const provider of enabledProviders) {
      await checkProvider({
        env,
        provider,
        supabaseUrl,
        redirectTo: NATIVE_REDIRECT_TO,
        results,
        labelPrefix: "native",
        includeConsentCheck: false,
        includeProviderLandingPage: false,
      });
    }
  }

  const failures = results.filter((item) => item.level === "fail");
  const warnings = results.filter((item) => item.level === "warn");
  const passes = results.filter((item) => item.level === "pass");

  console.log("OAuth live provider check");
  console.log(`Enabled providers: ${enabledProviders.length > 0 ? enabledProviders.join(", ") : "none"}`);
  console.log(`Passes: ${passes.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Failures: ${failures.length}`);

  for (const [title, items] of [
    ["PASS", passes],
    ["WARN", warnings],
    ["FAIL", failures],
  ]) {
    if (items.length === 0) {
      continue;
    }

    console.log(`\n${title}`);
    for (const item of items) {
      console.log(`- ${item.label}: ${item.detail}`);
    }
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(`OAuth live provider check failed: ${formatError(error)}`);
  process.exit(1);
});
