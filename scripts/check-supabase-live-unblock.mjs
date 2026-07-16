import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredMigrations = [
  "supabase/migrations/20260710130000_gate_recipe_publication.sql",
  "supabase/migrations/20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
];

const migrationHistoryReconciled = process.env.SUPABASE_MIGRATION_HISTORY_RECONCILED === "1";
const backupVerified = process.env.SUPABASE_BACKUP_VERIFIED === "1";

const checks = [
  {
    label: "Supabase local release contract",
    args: ["scripts/check-supabase-release.mjs"],
  },
  {
    label: "Supabase live read/write/RLS",
    args: ["scripts/check-supabase-live.mjs"],
    env: {
      SUPABASE_LIVE_WRITE_TEST: "1",
    },
  },
  {
    label: "Supabase Storage live path policy",
    args: ["scripts/check-supabase-storage-live.mjs"],
  },
];

function indent(output) {
  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `  ${line}`)
    .join("\n");
}

function runCheck(check) {
  const result = spawnSync(process.execPath, check.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      ...(check.env ?? {}),
    },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const status = result.status === 0 ? "pass" : "blocked";

  return {
    ...check,
    output,
    status,
    exitCode: result.status ?? 1,
    error: result.error?.message ?? "",
  };
}

const missingMigrations = requiredMigrations.filter((relativePath) => !existsSync(relativePath));

console.log("Supabase live unblock check");
console.log("Required production migrations:");
for (const relativePath of requiredMigrations) {
  console.log(`- ${relativePath}`);
}

if (!migrationHistoryReconciled || !backupVerified) {
  console.log("\nBLOCKED: migration history reconciliation and restorable backup evidence are required");
  console.log("Set SUPABASE_MIGRATION_HISTORY_RECONCILED=1 and SUPABASE_BACKUP_VERIFIED=1 only after verification.");
  process.exit(1);
}

if (missingMigrations.length > 0) {
  console.log("\nBLOCKED: migration files are missing locally");
  for (const relativePath of missingMigrations) {
    console.log(`- ${relativePath}`);
  }
  process.exit(1);
}

const results = checks.map(runCheck);
const passed = results.filter((result) => result.status === "pass");
const blocked = results.filter((result) => result.status !== "pass");

console.log(`\nPassed: ${passed.length}`);
console.log(`Blocked: ${blocked.length}`);

for (const result of results) {
  const marker = result.status === "pass" ? "PASS" : "BLOCKED";
  console.log(`\n${marker}: ${result.label}`);
  console.log(`Command: node ${result.args.join(" ")}`);
  if (result.env?.SUPABASE_LIVE_WRITE_TEST) {
    console.log("Env: SUPABASE_LIVE_WRITE_TEST=1");
  }
  if (result.error) {
    console.log(indent(result.error));
  }
  if (result.output) {
    console.log(indent(result.output));
  }
}

if (blocked.length > 0) {
  console.log("\nSupabase live unblock is not complete. Apply the production migrations, wait for policy/cache propagation, then rerun this command.");
  console.log("Next after this passes: pnpm release:external-status");
  process.exit(1);
}

console.log("\nSupabase live unblock checks passed.");
console.log("Next: pnpm release:external-status");
