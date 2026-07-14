import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPhase6AnalyticsDashboardReport,
  parseOperationalAnalyticsEvent,
  renderPhase6AnalyticsDashboardHtml,
} from "../lib/analytics/dashboard-report.ts";
import { parseProductAnalyticsEvent } from "../lib/analytics/product-events.ts";

const productFixturePath = "tests/fixtures/phase-6-product-events.jsonl";
const operationalFixturePath = "tests/fixtures/phase-6-operational-events.jsonl";

function readJsonLines<T>(file: string, parser: (value: unknown) => T): T[] {
  return readFileSync(file, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => parser(JSON.parse(line)));
}

const productEvents = readJsonLines(productFixturePath, parseProductAnalyticsEvent);
const operationalEvents = readJsonLines(
  operationalFixturePath,
  parseOperationalAnalyticsEvent,
);
const report = buildPhase6AnalyticsDashboardReport({
  productEvents,
  operationalEvents,
  generatedAt: "2026-07-13T10:00:00.000Z",
});

test("ordered product funnel counts only sequential cohort progress", () => {
  assert.equal(report.data_state, "ready");
  assert.equal(report.product.new_users, 3);
  assert.deepEqual(
    report.product.funnel.map((stage) => [stage.key, stage.sessions]),
    [
      ["new_users", 3],
      ["first_ingredient", 3],
      ["first_recommendation", 3],
      ["recipe_detail", 3],
      ["cooking_started", 3],
      ["cooking_completed", 1],
    ],
  );
  assert.equal(report.product.seven_day_returning_sessions, 1);
  assert.equal(report.product.seven_day_return_rate_pct, 33.3);
});

test("recipe quality ranking keeps safety first and reports transparent evidence", () => {
  assert.equal(report.recipes.length, 2);
  assert.equal(report.recipes[0].recipe_id, "22222222-2222-4222-8222-222222222222");
  assert.equal(report.recipes[0].failure_codes.safety_concern, 1);
  assert.equal(report.recipes[0].review_rank, 1);
  assert.equal(report.recipes[1].top_abandonment_step, 3);
  assert.equal(report.recipes[1].median_elapsed_seconds, 900);
  assert.equal(report.recipes[1].shopping_add_rate_pct, 50);
  assert.equal(report.recipes[1].sample_status, "insufficient");
});

test("operational dashboard separates status rates and latency by endpoint", () => {
  assert.equal(report.operations.overall.request_count, 4);
  assert.equal(report.operations.overall.client_error_rate_pct, 25);
  assert.equal(report.operations.overall.server_error_rate_pct, 25);
  assert.equal(report.operations.overall.p50_latency_ms, 90);
  assert.equal(report.operations.overall.p95_latency_ms, 410);
  assert.equal(report.operations.endpoints.length, 4);
  assert.ok(
    report.operations.endpoints.some(
      (endpoint) => endpoint.endpoint === "POST /api/v1/recipe-feedback",
    ),
  );
  assert.deepEqual(report.operations.instrumentation_gaps, [
    "external_api_failures_not_instrumented",
    "database_errors_not_instrumented",
    "image_errors_not_instrumented",
    "client_errors_not_instrumented",
  ]);
});

test("aggregate output does not emit session IDs or contact data", () => {
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /fixture_session_/);
  assert.doesNotMatch(serialized, /anonymous_session_id/);
  assert.doesNotMatch(serialized, /@example\./);
  assert.equal(report.source.unique_session_count, 3);
});

test("product and operational parsers reject unknown privacy-bearing properties", () => {
  const product = JSON.parse(readFileSync(productFixturePath, "utf8").split("\n")[0]);
  product.properties.email = "private-sentinel@example.invalid";
  assert.throws(() => parseProductAnalyticsEvent(product), /properties_property_not_allowed:email/);

  const operational = JSON.parse(
    readFileSync(operationalFixturePath, "utf8").split("\n")[0],
  );
  operational.metadata.url = "https://example.invalid/?token=private-sentinel";
  assert.throws(
    () => parseOperationalAnalyticsEvent(operational),
    /operational_metadata_property_not_allowed:url/,
  );
});

test("responsive HTML exposes direct values, landmarks, mobile rules, and caveats", () => {
  const html = renderPhase6AnalyticsDashboardHtml(report);
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<main id="main-content" tabindex="-1">/);
  assert.match(html, /@media \(max-width:700px\)/);
  assert.match(html, /신규 사용자 신규 대비 100\.0%/);
  assert.match(html, /안전 우려 우선/);
  assert.match(html, /라이브 제품 분석, 실제 사용자 field 지표/);
  assert.match(html, /2026\.07\.08 03:00 UTC/);
  assert.doesNotMatch(html, /fixture_session_/);
  assert.doesNotMatch(html, /<script|https?:\/\//);
  assert.doesNotMatch(html, /(?:linear|radial)-gradient/);
});

test("empty report renders an explicit no-data state", () => {
  const empty = buildPhase6AnalyticsDashboardReport({
    generatedAt: "2026-07-13T10:00:00.000Z",
  });
  assert.equal(empty.data_state, "empty");
  assert.equal(empty.data_quality.missing_coverage.length, 7);
  assert.match(renderPhase6AnalyticsDashboardHtml(empty), /데이터 없음/);
});

test("CLI generates JSON and HTML without session IDs", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "jipbab-dashboard-test-"));
  try {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/generate-phase-6-analytics-dashboard.mjs",
        "--product-input",
        productFixturePath,
        "--operational-input",
        operationalFixturePath,
        "--output-dir",
        directory,
        "--generated-at",
        "2026-07-13T10:00:00.000Z",
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Data state: ready/);
    const json = readFileSync(path.join(directory, "phase6-analytics-dashboard.json"), "utf8");
    const html = readFileSync(path.join(directory, "phase6-analytics-dashboard.html"), "utf8");
    assert.doesNotMatch(json, /fixture_session_/);
    assert.doesNotMatch(html, /fixture_session_/);
    assert.match(json, /product_sha256/);
    assert.match(html, /Phase 6 분석 대시보드/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("invalid JSONL fails with a line code and never echoes raw input", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "jipbab-dashboard-invalid-"));
  try {
    const input = path.join(directory, "invalid.jsonl");
    writeFileSync(input, '{"private":"private-sentinel@example.invalid"\n', "utf8");
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "scripts/generate-phase-6-analytics-dashboard.mjs",
        "--product-input",
        input,
        "--output-dir",
        directory,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /product_input_line_1:json_invalid/);
    assert.doesNotMatch(result.stderr, /private-sentinel|example\.invalid/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
