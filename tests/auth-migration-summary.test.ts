import assert from "node:assert/strict";
import test from "node:test";

import { summarizeAuthMigrationState } from "../lib/auth-migration-summary.ts";
import type { DeviceDataMigrationResult } from "../types/index.ts";

function migrationResult(overrides: Partial<DeviceDataMigrationResult> = {}): DeviceDataMigrationResult {
  return {
    totalMigratedCount: 0,
    localMigratedCount: 0,
    tableResults: [],
    ...overrides,
  };
}

test("shows running sync while migration is active", () => {
  const summary = summarizeAuthMigrationState({
    migrating: true,
    error: null,
    migrationResult: null,
  });

  assert.equal(summary.health, "running");
  assert.equal(summary.statLabel, "진행중");
});

test("surfaces auth or migration errors as attention-needed sync", () => {
  const summary = summarizeAuthMigrationState({
    migrating: false,
    error: { source: "supabase", message: "RLS 정책 오류" },
    migrationResult: null,
  });

  assert.equal(summary.health, "needs-attention");
  assert.equal(summary.statLabel, "확인필요");
  assert.match(summary.message ?? "", /RLS 정책 오류/);
});

test("does not call sync normal when any table migration failed", () => {
  const summary = summarizeAuthMigrationState({
    migrating: false,
    error: null,
    migrationResult: migrationResult({
      tableResults: [
        { table: "ingredients", migratedCount: 0, skipped: false, reason: "permission denied" },
      ],
    }),
  });

  assert.equal(summary.health, "needs-attention");
  assert.equal(summary.statLabel, "확인필요");
});

test("marks skipped migration tables as partial instead of failed", () => {
  const summary = summarizeAuthMigrationState({
    migrating: false,
    error: null,
    migrationResult: migrationResult({
      tableResults: [
        { table: "community_posts", migratedCount: 0, skipped: true, reason: "테이블 없음" },
      ],
    }),
  });

  assert.equal(summary.health, "partial");
  assert.equal(summary.statLabel, "일부확인");
});
