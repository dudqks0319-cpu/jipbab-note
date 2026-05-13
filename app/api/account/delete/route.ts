// 이 파일은 로그인 사용자가 앱 안에서 계정 삭제를 시작하고 관련 데이터를 정리하는 API입니다.
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type DeleteTarget = {
  table: string;
  column: string;
};

const DELETE_TARGETS: DeleteTarget[] = [
  { table: "community_likes", column: "user_id" },
  { table: "community_comments", column: "user_id" },
  { table: "community_posts", column: "user_id" },
  { table: "favorites", column: "user_id" },
  { table: "ingredients", column: "user_id" },
  { table: "family_fridge_members", column: "user_id" },
  { table: "family_fridges", column: "owner_user_id" },
];

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function createAdminClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function deleteUserRows(client: SupabaseClient, userId: string): Promise<string[]> {
  const failures: string[] = [];

  for (const target of DELETE_TARGETS) {
    const { error } = await client.from(target.table).delete().eq(target.column, userId);
    if (error) {
      failures.push(`${target.table}: ${error.message}`);
    }
  }

  return failures;
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ message: "로그인 세션을 확인할 수 없습니다." }, { status: 401 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      {
        message:
          "계정 삭제 서버 설정이 아직 연결되지 않았습니다. 운영 환경에 SUPABASE_SERVICE_ROLE_KEY를 등록해 주세요.",
      },
      { status: 503 },
    );
  }

  const { data, error: userError } = await adminClient.auth.getUser(token);
  const user = data.user;
  if (userError || !user) {
    return NextResponse.json({ message: "로그인 세션이 만료되었습니다. 다시 로그인 후 시도해 주세요." }, { status: 401 });
  }

  const failures = await deleteUserRows(adminClient, user.id);
  if (failures.length > 0) {
    return NextResponse.json(
      {
        message: "계정 데이터 삭제 중 일부 항목을 정리하지 못했습니다.",
        details: failures,
      },
      { status: 500 },
    );
  }

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    return NextResponse.json(
      {
        message: "인증 계정 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
