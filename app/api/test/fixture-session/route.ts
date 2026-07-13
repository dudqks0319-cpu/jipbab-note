// 이 파일은 staging 기술 E2E에만 짧은 HttpOnly fixture 세션을 발급합니다.
import { NextResponse } from "next/server";

import {
  createPhase6E2EFixtureSession,
  PHASE6_E2E_FIXTURE_COOKIE,
  PHASE6_E2E_FIXTURE_SESSION_SECONDS,
} from "@/lib/phase-6-e2e-fixture";

export async function POST(request: Request) {
  const session = createPhase6E2EFixtureSession(request.headers);
  if (!session) return new NextResponse(null, { status: 404 });

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: PHASE6_E2E_FIXTURE_COOKIE,
    value: session,
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: PHASE6_E2E_FIXTURE_SESSION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
