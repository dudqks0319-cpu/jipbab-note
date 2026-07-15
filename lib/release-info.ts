import {
  resolveDeploymentSha,
  type OperationalTelemetryEnvironment,
} from "./operational-telemetry.ts";

export const APP_VERSION = "1.0.0";
export const RECIPE_SCHEMA_VERSION = "v2";
export const INCLUDED_MIGRATION_VERSION = "20260715110000";
export const RECIPE_CONTENT_VERSION = "phase5-core-20-draft-v1";

export type ReleaseEnvironment = "local" | "development" | "preview" | "production";

export type ReleaseInfoEnvironment = OperationalTelemetryEnvironment &
  Readonly<{
    VERCEL_ENV?: string;
    RELEASE_BUILD_TIME?: string;
  }>;

export type ReleaseInfo = Readonly<{
  appVersion: string;
  deploymentSha: string;
  deploymentEnvironment: ReleaseEnvironment;
  buildTime: string | null;
  recipeSchemaVersion: string;
  includedMigrationVersion: string;
  recipeContentVersion: string;
}>;

const RELEASE_ENVIRONMENTS = new Set<ReleaseEnvironment>([
  "development",
  "preview",
  "production",
]);

function releaseEnvironment(value: string | undefined): ReleaseEnvironment {
  const normalized = value?.trim().toLowerCase() ?? "";
  return RELEASE_ENVIRONMENTS.has(normalized as ReleaseEnvironment)
    ? (normalized as ReleaseEnvironment)
    : "local";
}

function releaseBuildTime(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(normalized)) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildReleaseInfo(
  environment: ReleaseInfoEnvironment = process.env,
): ReleaseInfo {
  return {
    appVersion: APP_VERSION,
    deploymentSha: resolveDeploymentSha(environment),
    deploymentEnvironment: releaseEnvironment(environment.VERCEL_ENV),
    buildTime: releaseBuildTime(environment.RELEASE_BUILD_TIME),
    recipeSchemaVersion: RECIPE_SCHEMA_VERSION,
    includedMigrationVersion: INCLUDED_MIGRATION_VERSION,
    recipeContentVersion: RECIPE_CONTENT_VERSION,
  };
}
