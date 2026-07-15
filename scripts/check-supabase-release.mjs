import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const supabaseDir = path.join(cwd, "supabase");
const migrationsDir = path.join(supabaseDir, "migrations");
const schemaPath = path.join(supabaseDir, "schema.sql");

const phaseOneTables = [
  "recipe_categories",
  "ingredients_catalog",
  "ingredient_aliases",
  "recipe_ingredients",
  "recipe_ingredient_substitutions",
  "recipe_steps",
  "recipe_step_ingredients",
  "recipe_reviews",
  "recipe_versions",
];

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
  "api_rate_limit_buckets",
  "recipe_progress",
  ...phaseOneTables,
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
  recipe_categories: ["recipe_categories_select_public"],
};

const signedOwnershipPolicies = [
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
  "20260710130000_gate_recipe_publication.sql",
  "20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
  "20260710150000_add_recipe_v2_schema_and_versioning.sql",
  "20260710151000_seed_phase1_ingredient_catalog.sql",
  "20260710160000_add_distributed_api_rate_limits.sql",
  "20260711113000_harden_security_definer_privileges.sql",
  "20260715100000_add_recipe_serving_variants.sql",
  "20260715110000_add_recipe_progress.sql",
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
    block.includes("to authenticated") &&
    block.includes("app.is_permanent_user()") &&
    block.includes("name like") &&
    block.includes("(select auth.uid())::text || '/%'") &&
    !block.includes("current_device_id")
  );
}

function hasFamilyScopePolicyConstraint(block, tableName) {
  const hasInlineFamilyMemberCheck =
    block.includes("family_group_id is null") &&
    block.includes("family_group_id is not null") &&
    block.includes("from public.family_members m") &&
    block.includes(`m.family_group_id = ${tableName}.family_group_id`) &&
    block.includes("(select auth.uid())") &&
    !block.includes("current_device_id");
  const hasNonRecursiveFamilyMemberCheck =
    block.includes("family_group_id is null") &&
    block.includes("family_group_id is not null") &&
    block.includes(`public.is_current_family_member(${tableName}.family_group_id)`) &&
    block.includes("(select auth.uid())") &&
    !block.includes("current_device_id");

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

for (const policyName of signedOwnershipPolicies) {
  const block = getPolicyBlock(sql, policyName);
  if (!block) {
    continue;
  }

  if (
    block.includes("to authenticated") &&
    block.includes("(select auth.uid())") &&
    !block.includes("current_device_id") &&
    !block.includes("request_header")
  ) {
    addResult(results, "pass", `${policyName} ownership`, "uses only the signed auth uid");
  } else {
    addResult(
      results,
      "fail",
      `${policyName} ownership`,
      "must require authenticated and constrain ownership to the signed auth uid",
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

for (const tableName of phaseOneTables.filter((name) => name !== "recipe_categories")) {
  const revokePattern = new RegExp(
    `revoke\\s+all\\s+on\\s+table\\s+public\\.${escapeRegex(tableName)}\\s+from\\s+anon,\\s*authenticated`,
    "i",
  );
  if (revokePattern.test(sql)) {
    addResult(results, "pass", `${tableName} privileges`, "direct app-role access is revoked");
  } else {
    addResult(results, "fail", `${tableName} privileges`, "must revoke direct anon/authenticated access");
  }
}

const phaseOneFunctionRequirements = [
  "create or replace function app.build_recipe_v2_snapshot",
  "create or replace function public.capture_recipe_version",
  "create or replace function public.restore_recipe_version",
  "set search_path = pg_catalog, public, app",
  "recipe_version_conflict",
  "snapshot_recipe_mismatch",
  "grant execute on function public.capture_recipe_version(uuid, integer, text, uuid) to service_role",
  "grant execute on function public.restore_recipe_version(uuid, integer, integer, text, uuid) to service_role",
  "revoke all on function public.capture_recipe_version(uuid, integer, text, uuid) from public, anon, authenticated",
  "revoke all on function public.restore_recipe_version(uuid, integer, integer, text, uuid) from public, anon, authenticated",
];
if (phaseOneFunctionRequirements.every((requirement) => sql.includes(requirement))) {
  addResult(results, "pass", "recipe version RPC", "capture and restore are optimistic and service-role only");
} else {
  addResult(results, "fail", "recipe version RPC", "service-role capture/restore contract is incomplete");
}

if (
  sql.includes("add column if not exists schema_version smallint not null default 1") &&
  sql.includes("check (schema_version in (1, 2))") &&
  sql.includes("foreign key (recipe_step_id, recipe_id)") &&
  sql.includes("foreign key (recipe_ingredient_id, recipe_id)")
) {
  addResult(results, "pass", "recipe v2 integrity", "schema promotion is explicit and step usage cannot cross recipes");
} else {
  addResult(results, "fail", "recipe v2 integrity", "schema version or same-recipe foreign keys are missing");
}

if (
  sql.includes("unique (locale, normalized_alias)") &&
  sql.includes("ingredient_aliases_normalized_matches_alias") &&
  sql.includes("on conflict (locale, normalized_alias) do update")
) {
  addResult(results, "pass", "ingredient alias integrity", "aliases are normalized exact keys with one global owner");
} else {
  addResult(results, "fail", "ingredient alias integrity", "alias normalization and global uniqueness are required");
}

const apiRateLimitMigration = readFileSync(
  path.join(migrationsDir, "20260710160000_add_distributed_api_rate_limits.sql"),
  "utf8",
).toLowerCase();
if (
  apiRateLimitMigration.includes("primary key (route_key, key_hash, window_start)") &&
  apiRateLimitMigration.includes("on conflict (route_key, key_hash, window_start)") &&
  apiRateLimitMigration.includes("security definer") &&
  apiRateLimitMigration.includes("set search_path = pg_catalog, public") &&
  apiRateLimitMigration.includes("revoke all on function public.consume_api_rate_limit") &&
  apiRateLimitMigration.includes("from public, anon, authenticated") &&
  apiRateLimitMigration.includes("to service_role") &&
  !/\bto\s+(anon|authenticated)\b/i.test(apiRateLimitMigration)
) {
  addResult(results, "pass", "API rate-limit RPC", "atomic counters are private and service-role only");
} else {
  addResult(results, "fail", "API rate-limit RPC", "atomic fixed-window RPC privileges are incomplete");
}

const recipePublicationPolicy = getPolicyBlock(sql, "recipes_select_public");
const publicationRequirements = [
  "review_status = 'approved'",
  "reviewed_for_beginner is true",
  "actual_cooking_tested is true",
  "food_safety_reviewed is true",
  "image_rights_status in ('approved', 'no_image_approved')",
  "source_id is not null",
  "published_at is not null",
  "jsonb_array_length(ingredients) >= 3",
  "jsonb_array_length(steps) >= 3",
  "jsonb_array_elements(ingredients)",
  "jsonb_array_elements(steps)",
  "step.value ->> 'visualcue'",
];
if (
  publicationRequirements.every((requirement) => recipePublicationPolicy.includes(requirement)) &&
  !recipePublicationPolicy.includes("using (true)")
) {
  addResult(results, "pass", "recipes publication gate", "anon reads require approved, sourced, reviewed content");
} else {
  addResult(
    results,
    "fail",
    "recipes publication gate",
    "anon reads must require complete approval, source, rights, safety, and cooking-test evidence",
  );
}

const recipeSourcePublicationPolicy = getPolicyBlock(sql, "recipe_sources_select_public");
if (
  recipeSourcePublicationPolicy.includes("exists") &&
  recipeSourcePublicationPolicy.includes("from public.recipes") &&
  recipeSourcePublicationPolicy.includes("recipes.source_id = recipe_sources.id") &&
  !recipeSourcePublicationPolicy.includes("using (true)")
) {
  addResult(results, "pass", "recipe sources publication gate", "only sources referenced by public recipes are readable");
} else {
  addResult(
    results,
    "fail",
    "recipe sources publication gate",
    "anon source reads must be limited to sources referenced by public recipes",
  );
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
    addResult(results, "pass", policyName, "storage writes require permanent auth uid paths");
  } else {
    addResult(
      results,
      "fail",
      policyName,
      "must require a permanent signed user and an auth.uid path prefix",
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
console.log("- recipe and source reads are publication-gated");
