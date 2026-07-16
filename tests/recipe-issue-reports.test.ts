import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isAllowedRecipeIssueStatusTransition,
  parseRecipeIssueReportInput,
  parseRecipeIssueTriageInput,
} from "../lib/recipe-issue-report.ts";

const migration = readFileSync(
  "supabase/migrations/20260717091000_add_recipe_issue_reports.sql",
  "utf8",
);
const rollback = readFileSync(
  "supabase/rollbacks/20260717091000_add_recipe_issue_reports.sql",
  "utf8",
);
const route = readFileSync(
  "app/api/v1/recipes/[id]/issue-reports/route.ts",
  "utf8",
);
const component = readFileSync("components/recipe/RecipeIssueReport.tsx", "utf8");
const detailPage = readFileSync("app/recipe/[id]/page.tsx", "utf8");
const schema = readFileSync("supabase/schema.sql", "utf8");
const triageMigration = readFileSync(
  "supabase/migrations/20260717100000_add_recipe_issue_triage.sql",
  "utf8",
);
const triageRollback = readFileSync(
  "supabase/rollbacks/20260717100000_add_recipe_issue_triage.sql",
  "utf8",
);
const adminListRoute = readFileSync(
  "app/api/v1/admin/recipe-issue-reports/route.ts",
  "utf8",
);
const adminUpdateRoute = readFileSync(
  "app/api/v1/admin/recipe-issue-reports/[id]/route.ts",
  "utf8",
);
const adminPage = readFileSync("app/admin/recipe-issues/page.tsx", "utf8");

test("recipe issue reports accept only bounded structured categories and details", () => {
  assert.deepEqual(
    parseRecipeIssueReportInput({ issueType: "allergen", details: "간장에 포함된 대두 표시를 확인해 주세요." }),
    { issueType: "allergen", details: "간장에 포함된 대두 표시를 확인해 주세요." },
  );
  for (const input of [
    { issueType: "unknown", details: "잘못된 유형" },
    { issueType: "allergen", details: "  " },
    { issueType: "allergen", details: "가".repeat(501) },
    { issueType: "allergen", details: "정상", extra: true },
  ]) {
    assert.throws(() => parseRecipeIssueReportInput(input), /invalid_recipe_issue_report/);
  }
});

test("recipe issue reports require a signed user and distributed rate limiting", () => {
  assert.match(route, /consumeDistributedRateLimit/);
  assert.match(route, /getAuthenticatedServerUser/);
  assert.match(route, /isPermanentSupabaseUser/);
  assert.match(route, /review_status/);
  assert.match(route, /published_at/);
  assert.match(route, /status: "open"/);
});

test("issue report storage is private and the detail UI exposes the report flow", () => {
  assert.match(migration, /create table if not exists public\.recipe_issue_reports/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /revoke all on table public\.recipe_issue_reports from anon/);
  assert.match(schema, /create table if not exists public\.recipe_issue_reports/);
  assert.doesNotMatch(rollback, /drop table|truncate|delete from/i);
  assert.match(component, /레시피 오류 신고/);
  assert.match(component, /authorization: `Bearer \$\{accessToken\}`/);
  assert.match(detailPage, /<RecipeIssueReport/);
});

test("admin triage requires resolution evidence and only allows explicit transitions", () => {
  const versionId = "123e4567-e89b-42d3-a456-426614174000";
  assert.deepEqual(
    parseRecipeIssueTriageInput({
      status: "resolved",
      resolutionNote: "레시피 계량을 검수해 수정했습니다.",
      resolutionRecipeVersionId: versionId,
    }),
    {
      status: "resolved",
      resolutionNote: "레시피 계량을 검수해 수정했습니다.",
      resolutionRecipeVersionId: versionId,
    },
  );
  assert.throws(
    () => parseRecipeIssueTriageInput({ status: "resolved", resolutionNote: "근거 없음" }),
    /invalid_recipe_issue_triage/,
  );
  assert.throws(
    () => parseRecipeIssueTriageInput({
      status: "resolved",
      resolutionNote: "근거 있음",
      resolutionRecipeVersionId: "------------------------------------",
    }),
    /invalid_recipe_issue_triage/,
  );
  assert.equal(isAllowedRecipeIssueStatusTransition("open", "triaged"), true);
  assert.equal(isAllowedRecipeIssueStatusTransition("open", "resolved"), false);
  assert.equal(isAllowedRecipeIssueStatusTransition("resolved", "triaged"), true);
});

test("admin triage is authorized, rate limited, atomic, and audit logged", () => {
  assert.match(adminListRoute, /getAuthorizedAdminEmail/);
  assert.match(adminListRoute, /consumeDistributedRateLimit/);
  assert.match(adminUpdateRoute, /getAuthorizedAdminEmail/);
  assert.match(adminUpdateRoute, /readBoundedJsonObject/);
  assert.match(adminUpdateRoute, /transition_recipe_issue_report/);
  assert.match(triageMigration, /create table if not exists public\.recipe_issue_report_events/);
  assert.match(triageMigration, /security definer/);
  assert.match(triageMigration, /if \(select auth\.role\(\)\) <> 'service_role'/);
  assert.match(triageMigration, /for update/);
  assert.match(triageMigration, /recipe_version_mismatch/);
  assert.match(triageMigration, /insert into public\.recipe_issue_report_events/);
  assert.match(schema, /create or replace function public\.transition_recipe_issue_report/);
  assert.doesNotMatch(triageRollback, /drop table|truncate|delete from/i);
  assert.match(adminPage, /레시피 오류 신고함/);
  assert.match(adminPage, /레시피 본문을 자동 수정하지 않습니다/);
});
