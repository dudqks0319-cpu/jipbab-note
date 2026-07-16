import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const migrationPaths = [
  "supabase/migrations/20260710130000_gate_recipe_publication.sql",
  "supabase/migrations/20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
];

const migrationHistoryReconciled = process.env.SUPABASE_MIGRATION_HISTORY_RECONCILED === "1";
const backupVerified = process.env.SUPABASE_BACKUP_VERIFIED === "1";

if (!migrationHistoryReconciled || !backupVerified) {
  console.error("BLOCKED: reconcile Supabase migration history and verify a restorable backup first.");
  console.error("Required acknowledgements: SUPABASE_MIGRATION_HISTORY_RECONCILED=1 and SUPABASE_BACKUP_VERIFIED=1");
  process.exit(1);
}

const missing = migrationPaths.filter((relativePath) => !existsSync(path.join(cwd, relativePath)));
if (missing.length > 0) {
  console.error("Missing migration files:");
  for (const relativePath of missing) {
    console.error(`- ${relativePath}`);
  }
  process.exit(1);
}

console.log("-- 집밥노트 Phase 0 publication and signed-session SQL bundle");
console.log("-- Apply in this order through the Supabase SQL Editor or migration pipeline.");
console.log("-- Do not edit historical migration files; apply this output as an operator action.");
console.log("-- After applying, run:");
console.log("--   pnpm release:supabase-live-unblock-check");
console.log("-- This wraps:");
console.log("--   pnpm check:supabase-release");
console.log("--   SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live");
console.log("--   pnpm check:supabase-storage-live");
console.log("-- Then run:");
console.log("--   pnpm release:external-status");

for (const relativePath of migrationPaths) {
  const absolutePath = path.join(cwd, relativePath);
  const content = readFileSync(absolutePath, "utf8").trim();
  console.log("");
  console.log(`-- BEGIN ${relativePath}`);
  console.log(content);
  console.log(`-- END ${relativePath}`);
}
