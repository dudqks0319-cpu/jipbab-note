import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const supabaseDir = path.join(cwd, "supabase");
const migrationsDir = path.join(supabaseDir, "migrations");
const schemaPath = path.join(supabaseDir, "schema.sql");

const requiredTables = [
  "ingredients",
  "recipes",
  "recipe_sources",
  "recipe_comments",
  "favorites",
  "shopping_items",
  "partner_links",
  "family_groups",
  "family_members",
  "account_deletion_requests",
  "account_deletion_request_events",
];

const requiredPolicies = {
  ingredients: [
    "ingredients_select_own",
    "ingredients_insert_own",
    "ingredients_update_own",
    "ingredients_delete_own",
  ],
  recipes: [
    "recipes_select_public",
    "recipes_insert_service_role",
    "recipes_update_service_role",
    "recipes_delete_service_role",
  ],
  recipe_sources: [
    "recipe_sources_select_public",
    "recipe_sources_insert_service_role",
    "recipe_sources_update_service_role",
    "recipe_sources_delete_service_role",
  ],
  recipe_comments: [
    "recipe_comments_select_visible",
    "recipe_comments_insert_authenticated",
    "recipe_comments_update_own",
    "recipe_comments_delete_own",
  ],
  favorites: [
    "favorites_select_own",
    "favorites_insert_own",
    "favorites_update_own",
    "favorites_delete_own",
  ],
  shopping_items: [
    "shopping_items_select_own",
    "shopping_items_insert_own",
    "shopping_items_update_own",
    "shopping_items_delete_own",
  ],
  partner_links: ["partner_links_select_active"],
  family_groups: [
    "family_groups_select_member",
    "family_groups_insert_owner",
    "family_groups_update_owner",
  ],
  family_members: [
    "family_members_select_same_group",
    "family_members_insert_self_or_owner",
    "family_members_delete_self_or_owner",
  ],
  account_deletion_requests: [
    "account_deletion_requests_select_own",
    "account_deletion_requests_insert_own",
  ],
  account_deletion_request_events: ["account_deletion_request_events_select_own"],
};

const guestDevicePolicies = [
  ...requiredPolicies.ingredients,
  ...requiredPolicies.favorites,
  ...requiredPolicies.shopping_items,
];

const serviceRolePolicies = [
  "recipes_insert_service_role",
  "recipes_update_service_role",
  "recipes_delete_service_role",
  "recipe_sources_insert_service_role",
  "recipe_sources_update_service_role",
  "recipe_sources_delete_service_role",
];

const requiredMigrationFiles = [
  "20260228000000_init_schema.sql",
  "20260228001000_verify_rls.sql",
  "20260310140000_add_shopping_items.sql",
  "20260421000000_release_hardening_guest_device_rls.sql",
  "20260421010000_add_account_deletion_requests.sql",
  "20260421020000_add_account_deletion_request_events.sql",
  "20260425010000_add_family_share_and_community_images.sql",
  "20260508133157_add_recipe_sources_and_release_metadata.sql",
  "20260508133307_add_partner_links.sql",
  "20260508143719_optimize_rls_initplan.sql",
  "20260521160347_add_family_group_rpc.sql",
  "20260523090000_add_recipe_comments.sql",
  "20260526093000_harden_community_image_storage.sql",
  "20260527093000_add_family_scoped_fridge_shopping.sql",
  "20260528010000_fix_family_member_rls_recursion.sql",
];

function readSqlBundle() {
  if (!existsSync(schemaPath)) {
    throw new Error("supabase/schema.sql is missing");
  }
  if (!existsSync(migrationsDir)) {
    throw new Error("supabase/migrations is missing");
  }

  const migrationSources = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => {
      const filePath = path.join(migrationsDir, fileName);
      return `\n-- ${fileName}\n${readFileSync(filePath, "utf8")}`;
    });

  return `${readFileSync(schemaPath, "utf8")}\n${migrationSources.join("\n")}`.toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasCreateTable(sql, tableName) {
  return new RegExp(
    `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?public\\.${escapeRegex(tableName)}\\b`,
    "i",
  ).test(sql);
}

function hasRls(sql, tableName) {
  return new RegExp(
    `alter\\s+table\\s+public\\.${escapeRegex(tableName)}\\s+enable\\s+row\\s+level\\s+security`,
    "i",
  ).test(sql);
}

function hasPolicy(sql, tableName, policyName) {
  return new RegExp(
    `create\\s+policy\\s+${escapeRegex(policyName)}\\s+on\\s+public\\.${escapeRegex(tableName)}\\b`,
    "i",
  ).test(sql);
}

function getPolicyBlock(sql, policyName) {
  const marker = `create policy ${policyName.toLowerCase()}`;
  const start = sql.lastIndexOf(marker);
  if (start < 0) {
    return "";
  }

  const end = sql.indexOf(";", start);
  return end >= 0 ? sql.slice(start, end + 1) : sql.slice(start);
}

function addResult(results, level, label, detail) {
  results.push({ level, label, detail });
}

function hasCommunityImageOwnerPathConstraint(block) {
  return (
    block.includes("bucket_id = 'community-images'") &&
    block.includes("name like") &&
    block.includes("(select auth.uid())::text || '/%'") &&
    block.includes("(select app.current_device_id()) || '/%'")
  );
}

function hasFamilyScopePolicyConstraint(block, tableName) {
  const hasInlineFamilyMemberCheck =
    block.includes("family_group_id is null") &&
    block.includes("family_group_id is not null") &&
    block.includes("from public.family_members m") &&
    block.includes(`m.family_group_id = ${tableName}.family_group_id`) &&
    block.includes("(select auth.uid())") &&
    block.includes("(select app.current_device_id())");
  const hasNonRecursiveFamilyMemberCheck =
    block.includes("family_group_id is null") &&
    block.includes("family_group_id is not null") &&
    block.includes(`public.is_current_family_member(${tableName}.family_group_id)`) &&
    block.includes("(select auth.uid())") &&
    block.includes("(select app.current_device_id())");

  return (
    hasInlineFamilyMemberCheck ||
    (hasNonRecursiveFamilyMemberCheck &&
      sql.includes("create or replace function public.is_current_family_member") &&
      sql.includes("security definer"))
  );
}

const results = [];
const sql = readSqlBundle();

for (const fileName of requiredMigrationFiles) {
  if (existsSync(path.join(migrationsDir, fileName))) {
    addResult(results, "pass", fileName, "migration exists");
  } else {
    addResult(results, "fail", fileName, "release migration is missing");
  }
}

for (const tableName of requiredTables) {
  if (hasCreateTable(sql, tableName)) {
    addResult(results, "pass", `public.${tableName}`, "table DDL exists");
  } else {
    addResult(results, "fail", `public.${tableName}`, "table DDL is missing");
  }

  if (hasRls(sql, tableName)) {
    addResult(results, "pass", `${tableName} RLS`, "row level security is enabled in SQL");
  } else {
    addResult(results, "fail", `${tableName} RLS`, "row level security enable statement is missing");
  }

  for (const policyName of requiredPolicies[tableName] ?? []) {
    if (hasPolicy(sql, tableName, policyName)) {
      addResult(results, "pass", `${tableName}.${policyName}`, "policy exists");
    } else {
      addResult(results, "fail", `${tableName}.${policyName}`, "policy is missing");
    }
  }
}

for (const policyName of guestDevicePolicies) {
  const block = getPolicyBlock(sql, policyName);
  if (!block) {
    continue;
  }

  if (block.includes("(select auth.uid())") && block.includes("(select app.current_device_id())")) {
    addResult(results, "pass", `${policyName} ownership`, "uses cached auth uid and current device id");
  } else {
    addResult(
      results,
      "fail",
      `${policyName} ownership`,
      "must constrain both authenticated user_id and guest device_id with cached auth/app calls",
    );
  }
}

for (const policyName of serviceRolePolicies) {
  const block = getPolicyBlock(sql, policyName);
  if (!block) {
    continue;
  }

  if (block.includes("to service_role")) {
    addResult(results, "pass", `${policyName} role`, "restricted to service_role");
  } else {
    addResult(results, "fail", `${policyName} role`, "must be restricted to service_role");
  }
}

for (const tableName of ["ingredients", "shopping_items"]) {
  const columnPattern = new RegExp(
    `alter\\s+table\\s+public\\.${tableName}\\s+add\\s+column\\s+if\\s+not\\s+exists\\s+family_group_id\\s+uuid`,
    "i",
  );
  if (columnPattern.test(sql)) {
    addResult(results, "pass", `${tableName}.family_group_id`, "family scope column migration exists");
  } else {
    addResult(results, "fail", `${tableName}.family_group_id`, "family scope column migration is missing");
  }

  for (const policyName of requiredPolicies[tableName]) {
    const block = getPolicyBlock(sql, policyName);
    if (!block) {
      continue;
    }
    if (hasFamilyScopePolicyConstraint(block, tableName)) {
      addResult(results, "pass", `${policyName} family scope`, "family rows are constrained to family_members");
    } else {
      addResult(
        results,
        "fail",
        `${policyName} family scope`,
        "family scoped rows must remain readable/writable only by family_members",
      );
    }
  }
}

const partnerLinksMigration = readFileSync(
  path.join(migrationsDir, "20260508133307_add_partner_links.sql"),
  "utf8",
).toLowerCase();
if (
  partnerLinksMigration.includes("revoke insert, update, delete on public.partner_links from anon, authenticated") &&
  partnerLinksMigration.includes("grant select on public.partner_links to anon, authenticated")
) {
  addResult(results, "pass", "partner_links privileges", "anon/authenticated writes are revoked and reads are allowed");
} else {
  addResult(results, "fail", "partner_links privileges", "must revoke anon/authenticated writes and grant read-only access");
}

if (
  sql.includes("create or replace function public.create_family_group") &&
  sql.includes("create or replace function public.join_family_group_by_invite_code") &&
  sql.includes("create or replace function public.get_family_group_members") &&
  sql.includes("family_group_access_denied") &&
  sql.includes("security definer") &&
  sql.includes("grant execute on function public.join_family_group_by_invite_code(text, text) to anon, authenticated") &&
  sql.includes("grant execute on function public.get_family_group_members(uuid) to anon, authenticated")
) {
  addResult(results, "pass", "family invite RPC", "invite-code join and member reads use constrained security-definer functions");
} else {
  addResult(
    results,
    "fail",
    "family invite RPC",
    "must expose constrained create/join/member RPCs so invite-code joins do not require pre-existing membership or recursive RLS reads",
  );
}

if (
  sql.includes("insert into storage.buckets") &&
  sql.includes("'community-images'") &&
  sql.includes("file_size_limit") &&
  sql.includes("allowed_mime_types") &&
  sql.includes("array['image/png', 'image/jpeg', 'image/webp']")
) {
  addResult(results, "pass", "community-images bucket", "bucket has size and MIME restrictions in SQL");
} else {
  addResult(
    results,
    "fail",
    "community-images bucket",
    "must declare size and MIME restrictions for the community image bucket",
  );
}

for (const policyName of [
  "community_images_insert_own_path",
  "community_images_update_own_path",
  "community_images_delete_own_path",
]) {
  const block = getPolicyBlock(sql, policyName);
  if (!block) {
    addResult(results, "fail", policyName, "community image storage write policy is missing");
    continue;
  }

  if (hasCommunityImageOwnerPathConstraint(block)) {
    addResult(results, "pass", policyName, "storage writes are constrained to auth/device-owned paths");
  } else {
    addResult(
      results,
      "fail",
      policyName,
      "must constrain storage writes to auth.uid or app.current_device_id path prefixes",
    );
  }
}

const failures = results.filter((item) => item.level === "fail");
const passes = results.filter((item) => item.level === "pass");

console.log("Supabase release contract check");
console.log(`Passes: ${passes.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const item of failures) {
    console.log(`- ${item.label}: ${item.detail}`);
  }
  process.exit(1);
}

console.log("\nPASS");
console.log("- required release migrations exist");
console.log("- required tables have RLS enabled in SQL");
console.log("- required ownership and service-role policies are present");
console.log("- partner_links is read-only for anon/authenticated users");
console.log("- family invite-code RPC contract is present");
console.log("- family fridge and shopping rows are member-scoped");
console.log("- community image storage writes are owner/path constrained");
