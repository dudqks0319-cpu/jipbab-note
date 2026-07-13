import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  APP_VERSION,
  INCLUDED_MIGRATION_VERSION,
  RECIPE_CONTENT_VERSION,
  RECIPE_SCHEMA_VERSION,
  buildReleaseInfo,
} from "../lib/release-info.ts";

test("release info exposes only normalized public deployment metadata", () => {
  const info = buildReleaseInfo({
    VERCEL_GIT_COMMIT_SHA: "ABCDEF1234567890",
    DEPLOYMENT_SHA: "1111111111111111",
    VERCEL_ENV: "PREVIEW",
    RELEASE_BUILD_TIME: "2026-07-13T11:00:00Z",
    SERVICE_ROLE_KEY: "must-not-leak",
  });

  assert.deepEqual(info, {
    appVersion: APP_VERSION,
    deploymentSha: "abcdef1234567890",
    deploymentEnvironment: "preview",
    buildTime: "2026-07-13T11:00:00.000Z",
    recipeSchemaVersion: RECIPE_SCHEMA_VERSION,
    includedMigrationVersion: INCLUDED_MIGRATION_VERSION,
    recipeContentVersion: RECIPE_CONTENT_VERSION,
  });
  assert.doesNotMatch(JSON.stringify(info), /must-not-leak|SERVICE_ROLE_KEY/);
});

test("release info fails closed for malformed environment values", () => {
  const info = buildReleaseInfo({
    DEPLOYMENT_SHA: "token@example.com",
    VERCEL_ENV: "production<script>",
    RELEASE_BUILD_TIME: "July 13, 2026",
  });

  assert.equal(info.deploymentSha, "unknown");
  assert.equal(info.deploymentEnvironment, "local");
  assert.equal(info.buildTime, null);
});

test("app info route is linked from settings and explains external approval boundaries", async () => {
  const [settingsSource, pageSource] = await Promise.all([
    readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/settings/app-info/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(settingsSource, /href="\/settings\/app-info"/);
  assert.match(pageSource, /배포 SHA/);
  assert.match(pageSource, /DB 변경의 운영 적용/);
  assert.match(pageSource, /사용자 정보는 이 화면에 포함하지 않습니다/);
  assert.doesNotMatch(pageSource, /SERVICE_ROLE|ANON_KEY|SUPABASE_URL/);
});

test("displayed app and migration versions stay synchronized with tracked sources", async () => {
  const [settingsSource, myPageSource, migrationFiles] = await Promise.all([
    readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/mypage/page.tsx", import.meta.url), "utf8"),
    readdir(new URL("../supabase/migrations/", import.meta.url)),
  ]);
  const latestMigration = migrationFiles
    .filter((name) => /^\d{14}_.+\.sql$/.test(name))
    .sort()
    .at(-1);

  assert.match(settingsSource, new RegExp(`v${APP_VERSION.replaceAll(".", "\\.")}`));
  assert.match(myPageSource, new RegExp(`v${APP_VERSION.replaceAll(".", "\\.")}`));
  assert.equal(latestMigration?.slice(0, 14), INCLUDED_MIGRATION_VERSION);
});
