import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const communitySource = readFileSync("app/community/page.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const schemaSource = readFileSync("supabase/schema.sql", "utf8").toLowerCase();
const migrationSource = readFileSync(
  "supabase/migrations/20260526093000_harden_community_image_storage.sql",
  "utf8",
).toLowerCase();
const checkSource = readFileSync("scripts/check-supabase-release.mjs", "utf8");
const liveCheckSource = readFileSync("scripts/check-supabase-storage-live.mjs", "utf8");

function assertCommunityStoragePolicy(source: string) {
  assert.match(source, /community_images_insert_own_path/);
  assert.match(source, /community_images_update_own_path/);
  assert.match(source, /community_images_delete_own_path/);
  assert.match(source, /bucket_id = 'community-images'/);
  assert.match(source, /name like \(\(select auth\.uid\(\)\)::text \|\| '\/%'\)/);
  assert.match(source, /name like \(\(select app\.current_device_id\(\)\) \|\| '\/%'\)/);
}

test("community image upload validates file shape and stores under an owned path", () => {
  assert.match(communitySource, /MAX_COMMUNITY_IMAGE_SIZE_BYTES = 5 \* 1024 \* 1024/);
  assert.match(communitySource, /ALLOWED_COMMUNITY_IMAGE_TYPES/);
  assert.match(communitySource, /getCommunityImageExtension/);
  assert.match(communitySource, /client\.auth\.getUser\(\)/);
  assert.match(communitySource, /authData\.user\?\.id \?\? deviceId/);
  assert.match(communitySource, /\.upload\(filePath, imageFile/);
  assert.match(communitySource, /getPublicUrl\(filePath\)/);
});

test("community image storage policies constrain writes to auth or device prefixes", () => {
  assertCommunityStoragePolicy(schemaSource);
  assertCommunityStoragePolicy(migrationSource);
});

test("Supabase release check validates the latest storage policy definition", () => {
  assert.match(checkSource, /lastIndexOf\(marker\)/);
  assert.match(checkSource, /20260526093000_harden_community_image_storage\.sql/);
  assert.match(checkSource, /hasCommunityImageOwnerPathConstraint/);
  assert.match(checkSource, /community image storage writes are owner\/path constrained/);
});

test("Supabase Storage live check verifies owner prefix enforcement without printing secrets", () => {
  assert.equal(packageJson.scripts["check:supabase-storage-live"], "node scripts/check-supabase-storage-live.mjs");
  assert.match(liveCheckSource, /cross-prefix upload blocked/);
  assert.match(liveCheckSource, /owner-prefixed guest upload succeeded/);
  assert.match(liveCheckSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(liveCheckSource, /console\.log\([^)]*serviceRoleKey/);
  assert.doesNotMatch(liveCheckSource, /console\.log\([^)]*anonKey/);
});
