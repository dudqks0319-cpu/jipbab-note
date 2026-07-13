import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  buildPhase6AnalyticsDashboardReport,
  parseOperationalAnalyticsEvent,
  renderPhase6AnalyticsDashboardHtml,
} from "../lib/analytics/dashboard-report.ts";
import { parseProductAnalyticsEvent } from "../lib/analytics/product-events.ts";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_RECORDS = 100_000;
const help = `Phase 6 analytics dashboard generator

Usage:
  pnpm capture:phase6-analytics-dashboard -- --product-input <events.jsonl> [options]

Options:
  --product-input <path>      Privacy-safe product event JSONL
  --operational-input <path>  API operational event JSONL
  --output-dir <path>         Output directory (default: output/phase6-analytics)
  --format <both|json|html>   Output format (default: both)
  --generated-at <ISO>        Stable report timestamp for evidence replay
  --help                      Show this help
`;

function parseArgs(argv) {
  const options = {
    format: "both",
    outputDir: "output/phase6-analytics",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      options.help = true;
      continue;
    }
    if (
      argument === "--product-input" ||
      argument === "--operational-input" ||
      argument === "--output-dir" ||
      argument === "--format" ||
      argument === "--generated-at"
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`missing_value:${argument}`);
      }
      index += 1;
      const key = {
        "--product-input": "productInput",
        "--operational-input": "operationalInput",
        "--output-dir": "outputDir",
        "--format": "format",
        "--generated-at": "generatedAt",
      }[argument];
      options[key] = value;
      continue;
    }
    throw new Error(`unknown_argument:${argument}`);
  }
  if (!options.help && !options.productInput && !options.operationalInput) {
    throw new Error("at_least_one_input_required");
  }
  if (!new Set(["both", "json", "html"]).has(options.format)) {
    throw new Error("format_invalid");
  }
  return options;
}

function readJsonLines(relativePath, parser, label) {
  const inputPath = path.resolve(relativePath);
  const stat = statSync(inputPath);
  if (!stat.isFile()) throw new Error(`${label}_not_a_file`);
  if (stat.size > MAX_INPUT_BYTES) throw new Error(`${label}_too_large`);
  const source = readFileSync(inputPath, "utf8");
  const lines = source.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length > MAX_RECORDS) throw new Error(`${label}_too_many_records`);
  const records = lines.map((line, index) => {
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`${label}_line_${index + 1}:json_invalid`);
    }
    try {
      return parser(value);
    } catch (error) {
      const code = error instanceof Error ? error.message : "record_invalid";
      throw new Error(`${label}_line_${index + 1}:${code}`);
    }
  });
  return {
    inputPath,
    records,
    sha256: createHash("sha256").update(source).digest("hex"),
  };
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Dashboard generation failed: ${error instanceof Error ? error.message : "invalid_arguments"}`);
  console.error(help);
  process.exit(1);
}

if (options.help) {
  console.log(help);
  process.exit(0);
}

try {
  const product = options.productInput
    ? readJsonLines(options.productInput, parseProductAnalyticsEvent, "product_input")
    : { records: [], inputPath: null, sha256: null };
  const operational = options.operationalInput
    ? readJsonLines(options.operationalInput, parseOperationalAnalyticsEvent, "operational_input")
    : { records: [], inputPath: null, sha256: null };
  const report = buildPhase6AnalyticsDashboardReport({
    productEvents: product.records,
    operationalEvents: operational.records,
    generatedAt: options.generatedAt,
  });
  const outputDir = path.resolve(options.outputDir);
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "phase6-analytics-dashboard.json");
  const htmlPath = path.join(outputDir, "phase6-analytics-dashboard.html");
  if (options.format === "both" || options.format === "json") {
    writeFileSync(
      jsonPath,
      `${JSON.stringify({
        ...report,
        evidence_inputs: {
          product_sha256: product.sha256,
          operational_sha256: operational.sha256,
        },
      }, null, 2)}\n`,
      "utf8",
    );
  }
  if (options.format === "both" || options.format === "html") {
    writeFileSync(htmlPath, renderPhase6AnalyticsDashboardHtml(report), "utf8");
  }

  console.log("Phase 6 analytics dashboard generated");
  console.log(`Data state: ${report.data_state}`);
  console.log(`Product events: ${report.source.product_event_count}`);
  console.log(`Operational events: ${report.source.operational_event_count}`);
  if (options.format === "both" || options.format === "json") console.log(`JSON: ${jsonPath}`);
  if (options.format === "both" || options.format === "html") console.log(`HTML: ${htmlPath}`);
} catch (error) {
  console.error(`Dashboard generation failed: ${error instanceof Error ? error.message : "generation_failed"}`);
  process.exit(1);
}
