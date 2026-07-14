import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function getRequiredValue(value: string | undefined, key: string): string {
  if (!value?.trim()) {
    throw new Error(`${key} 환경변수가 설정되어 있지 않습니다.`);
  }

  return value.trim();
}

export function isMissingServerSupabaseConfigError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("환경변수가 설정되어 있지 않습니다");
}

export function getServerSupabaseUserClient(): SupabaseClient {
  return createClient(
    getRequiredValue(PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredValue(PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export function getServerSupabaseAdminClient(): SupabaseClient {
  return createClient(
    getRequiredValue(PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredValue(SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function getBearerAccessToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorizationHeader.slice("Bearer ".length).trim();
  if (!accessToken) {
    return null;
  }

  return accessToken;
}

export async function getAuthenticatedServerUser(
  authorizationHeader: string | null,
): Promise<User | null> {
  const accessToken = getBearerAccessToken(authorizationHeader);
  if (!accessToken) {
    return null;
  }

  const client = getServerSupabaseUserClient();
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getAuthorizedAdminEmail(
  authorizationHeader: string | null,
): Promise<string | null> {
  const user = await getAuthenticatedServerUser(authorizationHeader);
  if (!user?.email) {
    return null;
  }

  const normalizedEmail = user.email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalizedEmail) ? normalizedEmail : null;
}

export function hasConfiguredAdminEmails(): boolean {
  return ADMIN_EMAILS.length > 0;
}
