// 이 파일은 기술 E2E fixture가 운영 빌드에 포함되는 설정 오류를 빌드 시작 시 차단합니다.
type FixtureBuildEnvironment = Partial<Record<string, string | undefined>>;

export function assertPhase6E2EFixtureBuildIsSafe(
  env: FixtureBuildEnvironment = process.env,
): void {
  if (env.PHASE6_E2E_FIXTURE_ENABLED !== "true") return;

  const explicitlyStaging = env.APP_ENV === "staging" || env.VERCEL_ENV === "preview";
  const productionTarget = env.APP_ENV === "production"
    || env.VERCEL_ENV === "production"
    || (env.NODE_ENV === "production" && !explicitlyStaging);

  if (productionTarget) {
    throw new Error("Phase 6 E2E fixture must be disabled for production builds.");
  }
}
