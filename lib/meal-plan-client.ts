// 이 파일은 식단 API에 필요한 현재 로그인 토큰만 안전하게 읽습니다.
import { getSupabaseClient } from "@/lib/supabase";
import { isPermanentSupabaseUser } from "@/lib/supabase-session";

export async function getMealPlanAccessToken(): Promise<string | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session?.access_token || !isPermanentSupabaseUser(data.session.user)) return null;
  return data.session.access_token;
}
