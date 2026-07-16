import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const communitySource = readFileSync("app/community/page.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const schemaSource = readFileSync("supabase/schema.sql", "utf8").toLowerCase();
const migrationSource = readFileSync(
  "supabase/migrations/20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
  "utf8",
).toLowerCase();
const checkSource = readFileSync("scripts/check-supabase-release.mjs", "utf8");
const liveCheckSource = readFileSync("scripts/check-supabase-storage-live.mjs", "utf8");

function assertCommunityStoragePolicy(source: string) {
  for (const policyName of [
    "community_images_insert_own_path",
    "community_images_update_own_path",
    "community_images_delete_own_path",
  ]) {
    const marker = `create policy ${policyName}`;
    const start = source.lastIndexOf(marker);
    assert.notEqual(start, -1);
    const end = source.indexOf(";", start);
    const block = source.slice(start, end + 1);
    assert.match(block, /bucket_id = 'community-images'/);
    assert.match(block, /to authenticated/);
    assert.match(block, /app\.is_permanent_user\(\)/);
    assert.match(block, /name like \(\(select auth\.uid\(\)\)::text \|\| '\/%'\)/);
    assert.doesNotMatch(block, /current_device_id/);
  }
}

test("community image upload validates file shape and stores under an owned path", () => {
  assert.match(communitySource, /MAX_COMMUNITY_IMAGE_SIZE_BYTES = 5 \* 1024 \* 1024/);
  assert.match(communitySource, /ALLOWED_COMMUNITY_IMAGE_TYPES/);
  assert.match(communitySource, /getCommunityImageExtension/);
  assert.match(communitySource, /client\.auth\.getUser\(\)/);
  assert.match(communitySource, /isPermanentSupabaseUser\(authData\.user\)/);
  assert.match(communitySource, /const ownerPrefix = authData\.user\.id/);
  assert.match(communitySource, /\.upload\(filePath, imageFile/);
  assert.match(communitySource, /getPublicUrl\(filePath\)/);
});

test("community image storage policies require permanent auth uid prefixes", () => {
  assert.match(schemaSource, /select null::text/);
  assertCommunityStoragePolicy(schemaSource);
  assertCommunityStoragePolicy(migrationSource);
});

test("Supabase release check validates the latest storage policy definition", () => {
  assert.match(checkSource, /lastIndexOf\(marker\)/);
  assert.match(checkSource, /20260710140000_replace_device_guest_auth_with_signed_sessions\.sql/);
  assert.match(checkSource, /hasCommunityImageOwnerPathConstraint/);
  assert.match(checkSource, /community image storage writes are owner\/path constrained/);
});

test("Supabase Storage live check verifies owner prefix enforcement without printing secrets", () => {
  assert.equal(packageJson.scripts["check:supabase-storage-live"], "node scripts/check-supabase-storage-live.mjs");
  assert.match(liveCheckSource, /cross-prefix upload blocked/);
  assert.match(liveCheckSource, /unauthenticated upload blocked/);
  assert.match(liveCheckSource, /owner-prefixed permanent upload succeeded/);
  assert.match(liveCheckSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(liveCheckSource, /console\.log\([^)]*serviceRoleKey/);
  assert.doesNotMatch(liveCheckSource, /console\.log\([^)]*anonKey/);
});
