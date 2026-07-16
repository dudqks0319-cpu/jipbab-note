import type { SupabaseClient, User } from "@supabase/supabase-js";

const ANONYMOUS_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_SUPABASE_ANONYMOUS_AUTH_ENABLED === "true";

let anonymousSignInPromise: Promise<User> | null = null;

export function isAnonymousSupabaseUser(user: User | null | undefined): boolean {
  return user?.is_anonymous === true;
}

export function isPermanentSupabaseUser(user: User | null | undefined): user is User {
  return Boolean(user && !isAnonymousSupabaseUser(user));
}

export async function getVerifiedSupabaseUser(client: SupabaseClient): Promise<User | null> {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw new Error("Supabase 세션을 확인하지 못했습니다.");
  }
  if (!sessionData.session) {
    return null;
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Error("Supabase 서명 세션을 검증하지 못했습니다.");
  }

  return data.user;
}

export async function ensureSignedSupabaseUser(client: SupabaseClient): Promise<User | null> {
  const currentUser = await getVerifiedSupabaseUser(client);
  if (currentUser) {
    return currentUser;
  }
  if (!ANONYMOUS_AUTH_ENABLED) {
    return null;
  }

  if (!anonymousSignInPromise) {
    anonymousSignInPromise = (async () => {
      const { data, error } = await client.auth.signInAnonymously();
      if (error || !data.user || !data.session) {
        throw new Error("서명된 게스트 세션을 만들지 못했습니다.");
      }

      const verifiedUser = await getVerifiedSupabaseUser(client);
      if (!verifiedUser || verifiedUser.id !== data.user.id || !isAnonymousSupabaseUser(verifiedUser)) {
        throw new Error("게스트 세션 검증 결과가 일치하지 않습니다.");
      }
      return verifiedUser;
    })().finally(() => {
      anonymousSignInPromise = null;
    });
  }

  return await anonymousSignInPromise;
}
