// Rehearses a code rollback from an explicit current checkpoint to an explicit
// earlier commit without changing the caller's checkout, Vercel aliases, or Supabase.
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const cwd = process.cwd();
const outputRoot = path.resolve(cwd, "output");
const rollbackMigrations = [
  "20260710130000_gate_recipe_publication.sql",
  "20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
  "20260710150000_add_recipe_v2_schema_and_versioning.sql",
  "20260710151000_seed_phase1_ingredient_catalog.sql",
  "20260710160000_add_distributed_api_rate_limits.sql",
  "20260711113000_harden_security_definer_privileges.sql",
];
const requiredCommands = [
  { label: "install", command: "pnpm", args: ["install", "--offline", "--frozen-lockfile"] },
  { label: "mobile-sync-ios", command: "pnpm", args: ["mobile:sync:ios"] },
  { label: "lint", command: "pnpm", args: ["lint"] },
  { label: "typecheck", command: "pnpm", args: ["typecheck"] },
  { label: "test", command: "pnpm", args: ["test"] },
  { label: "integration", command: "pnpm", args: ["test:integration"] },
  { label: "recipe-validation", command: "pnpm", args: ["validate:recipes"] },
  { label: "content", command: "pnpm", args: ["test:content"] },
  { label: "build", command: "pnpm", args: ["build"] },
];
const forbiddenDatabaseStatements = /\b(?:drop\s+(?:table|column)|truncate)\b/i;
const sensitiveOutput = [
  /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
];

function usage() {
  return `Phase 6 rollback rehearsal

Usage:
  pnpm capture:phase6-rollback --target-ref <known-good-commit> --target-url <known-good-preview> [options]

Options:
  --target-ref <ref>       Required earlier commit to reproduce
  --target-url <url>       Required HTTPS app URL paired with that commit
  --output-dir <path>      Directory under output/ (default: output/rollback-evidence)
  --help                   Show this help

This command uses git archive, offline dependencies, a temporary local server,
and read-only HTTP checks. It never changes a Git branch, Vercel alias, or Supabase.`;
}

function parseArgs(argv) {
  const parsed = {
    targetRef: "",
    targetUrl: "",
    outputDir: "output/rollback-evidence",
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") {
      parsed.help = true;
    } else if (token === "--target-ref") {
      parsed.targetRef = argv[++index] ?? "";
    } else if (token === "--target-url") {
      parsed.targetUrl = argv[++index] ?? "";
    } else if (token === "--output-dir") {
      parsed.outputDir = argv[++index] ?? "";
    } else {
      throw new Error("unknown_argument");
    }
  }
  if (parsed.help) return parsed;
  if (!/^[A-Za-z0-9._/-]{7,128}$/.test(parsed.targetRef)) {
    throw new Error("target_ref_required_or_invalid");
  }
  let targetUrl;
  try {
    targetUrl = new URL(parsed.targetUrl);
  } catch {
    throw new Error("target_url_required_or_invalid");
  }
  if (
    targetUrl.protocol !== "https:" ||
    targetUrl.username ||
    targetUrl.password ||
    targetUrl.search ||
    targetUrl.hash ||
    targetUrl.pathname !== "/" ||
    targetUrl.port ||
    !targetUrl.hostname.startsWith("jipbab-note-") ||
    !targetUrl.hostname.endsWith(".vercel.app")
  ) {
    throw new Error("target_url_required_or_invalid");
  }
  parsed.targetUrl = targetUrl.origin;
  if (!parsed.outputDir) throw new Error("output_dir_invalid");
  return parsed;
}

function minimalEnvironment(targetCommit, targetUrl) {
  const allowed = ["PATH", "HOME", "TMPDIR", "TMP", "TEMP", "PNPM_HOME", "SHELL", "LANG"];
  const environment = Object.fromEntries(
    allowed.flatMap((key) => (process.env[key] ? [[key, process.env[key]]] : [])),
  );
  return {
    ...environment,
    CI: "1",
    CAPACITOR_SERVER_URL: targetUrl,
    DEPLOYMENT_SHA: targetCommit,
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

function sanitize(value, temporaryRoot = "") {
  let result = String(value ?? "");
  if (temporaryRoot) {
    const temporaryPaths = [
      temporaryRoot,
      temporaryRoot.startsWith("/var/") ? `/private${temporaryRoot}` : "",
    ].filter(Boolean);
    for (const temporaryPath of temporaryPaths) {
      result = result.replaceAll(temporaryPath, "<rollback-workspace>");
    }
  }
  for (const pattern of sensitiveOutput) result = result.replace(pattern, "[redacted]");
  return result
    .split(/\r?\n/)
    .slice(-80)
    .join("\n")
    .slice(0, 12_000);
}

function run(command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const record = {
    command: [command, ...args].join(" "),
    duration_ms: Date.now() - startedAt,
    exit_code: result.status ?? 1,
    output_tail: sanitize(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, options.temporaryRoot),
  };
  if (result.error || result.status !== 0) {
    const error = new Error(`command_failed:${options.label ?? command}`);
    error.record = record;
    throw error;
  }
  return { value: result.stdout.trim(), record };
}

function resolveCommit(ref) {
  return run("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
    label: "resolve-commit",
  }).value;
}

function inspectRollbackSql() {
  return rollbackMigrations.map((fileName) => {
    const migrationPath = path.join(cwd, "supabase", "migrations", fileName);
    const rollbackPath = path.join(cwd, "supabase", "rollbacks", fileName);
    if (!existsSync(migrationPath) || !existsSync(rollbackPath)) {
      throw new Error(`rollback_pair_missing:${fileName}`);
    }
    const rollback = readFileSync(rollbackPath, "utf8");
    if (forbiddenDatabaseStatements.test(rollback)) {
      throw new Error(`destructive_rollback_rejected:${fileName}`);
    }
    return {
      migration: fileName,
      rollback_present: true,
      destructive_statement_found: false,
    };
  });
}

function choosePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (!port) reject(new Error("local_port_unavailable"));
        else resolve(port);
      });
    });
  });
}

async function waitForServer(server, url) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("rollback_server_exited_early");
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // Expected while Next.js starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("rollback_server_start_timeout");
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (server.exitCode === null) server.kill("SIGKILL");
      resolve();
    }, 3_000);
    server.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function smoke(baseUrl) {
  const root = await fetch(`${baseUrl}/`, { redirect: "manual" });
  const rootBody = await root.text();
  const recipes = await fetch(`${baseUrl}/recipe`, { redirect: "manual" });
  const recipesBody = await recipes.text();
  const api = await fetch(`${baseUrl}/api/v1/recipes?limit=1`, { redirect: "manual" });
  const apiBody = await api.text();
  const forbiddenLeak = /SUPABASE_SERVICE_ROLE_KEY|API_RATE_LIMIT_HMAC_SECRET|stack trace|at file:\/\//i;
  const checks = {
    home_status_200: root.status === 200,
    home_identity_present: rootBody.includes("있는 재료"),
    recipe_status_200: recipes.status === 200,
    recipe_identity_present: recipesBody.includes("레시피"),
    api_fail_closed_503: api.status === 503,
    api_dependency_code: apiBody.includes("DEPENDENCY_NOT_READY"),
    api_no_store: (api.headers.get("cache-control") ?? "").includes("no-store"),
    api_retry_after_present: api.headers.has("retry-after"),
    api_request_id_present: api.headers.has("x-request-id"),
    api_sensitive_detail_absent: !forbiddenLeak.test(apiBody),
  };
  if (Object.values(checks).some((value) => !value)) {
    throw new Error("rollback_http_smoke_failed");
  }
  return checks;
}

function markdownReport(evidence) {
  return [
    "# Phase 6 Rollback Rehearsal Evidence",
    "",
    `- Result: ${evidence.result}`,
    `- Captured at: ${evidence.captured_at}`,
    `- Current commit: ${evidence.current_commit}`,
    `- Rollback target: ${evidence.target_commit}`,
    `- Target app URL: ${evidence.target_url}`,
    "- External mutations: none",
    "- Scope: clean archived code rollback, local build, local HTTP smoke, static non-destructive DB rollback contract",
    "",
    "## Commands",
    "",
    ...evidence.commands.map(
      (command) => `- ${command.exit_code === 0 ? "PASS" : "FAIL"}: \`${command.command}\` (${command.duration_ms}ms)`,
    ),
    "",
    "## HTTP Smoke",
    "",
    ...Object.entries(evidence.http_smoke ?? {}).map(
      ([name, passed]) => `- ${passed ? "PASS" : "FAIL"}: ${name}`,
    ),
    "",
    "## Database Rollback Boundary",
    "",
    `- Static rollback pairs: ${evidence.database.rollback_pairs.length}/${rollbackMigrations.length}`,
    "- Destructive table/column removal or truncate: rejected",
    "- Live/staging SQL execution: blocked_external",
    "- Required before DB rollout: reconciled migration history, restorable backup, isolated staging PostgreSQL restore drill",
    "",
    "## Vercel Boundary",
    "",
    "- Vercel deployment or alias mutation: not executed",
    "- Operator approval is still required before any production rollback command.",
    "",
    ...(evidence.failure_code ? ["## Failure", "", `- ${evidence.failure_code}`, ""] : []),
  ].join("\n");
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Rollback rehearsal failed: ${error.message}`);
    console.error(usage());
    process.exit(1);
  }
  if (args.help) {
    console.log(usage());
    return;
  }

  const requestedOutput = path.resolve(cwd, args.outputDir);
  if (requestedOutput !== outputRoot && !requestedOutput.startsWith(`${outputRoot}${path.sep}`)) {
    throw new Error("output_dir_must_be_under_output");
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDirectory = path.join(requestedOutput, stamp);
  mkdirSync(runDirectory, { recursive: true });

  const currentCommit = resolveCommit("HEAD");
  const targetCommit = resolveCommit(args.targetRef);
  const evidence = {
    schema_version: 1,
    captured_at: new Date().toISOString(),
    result: "failed",
    current_commit: currentCommit,
    target_ref: args.targetRef,
    target_commit: targetCommit,
    target_url: args.targetUrl,
    commands: [],
    http_smoke: null,
    database: {
      status: "static_contract_only",
      rollback_pairs: [],
      live_execution: "blocked_external",
    },
    vercel: { mutation: "not_executed" },
    failure_code: null,
  };

  let temporaryRoot = "";
  let server = null;
  let serverOutput = "";
  try {
    if (currentCommit === targetCommit) throw new Error("rollback_target_matches_current_commit");
    run("git", ["merge-base", "--is-ancestor", targetCommit, currentCommit], {
      label: "target-ancestor-check",
    });
    evidence.database.rollback_pairs = inspectRollbackSql();

    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "jipbab-note-rollback-"));
    const archivePath = path.join(temporaryRoot, "source.tar");
    const sourceDirectory = path.join(temporaryRoot, "source");
    mkdirSync(sourceDirectory, { recursive: true });
    run("git", ["archive", "--format=tar", `--output=${archivePath}`, targetCommit], {
      label: "git-archive",
      temporaryRoot,
    });
    run("tar", ["-xf", archivePath, "-C", sourceDirectory], {
      label: "extract-archive",
      temporaryRoot,
    });
    const environment = minimalEnvironment(targetCommit, args.targetUrl);
    for (const command of requiredCommands) {
      try {
        const result = run(command.command, command.args, {
          cwd: sourceDirectory,
          env: environment,
          label: command.label,
          temporaryRoot,
        });
        evidence.commands.push(result.record);
      } catch (error) {
        if (error.record) evidence.commands.push(error.record);
        throw error;
      }
    }

    const port = await choosePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    server = spawn("pnpm", ["start", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: sourceDirectory,
      env: { ...environment, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const appendServerOutput = (chunk) => {
      serverOutput = `${serverOutput}${chunk}`.slice(-12_000);
    };
    server.stdout.on("data", appendServerOutput);
    server.stderr.on("data", appendServerOutput);
    await waitForServer(server, baseUrl);
    evidence.http_smoke = await smoke(baseUrl);
    evidence.result = "passed_local_code_rehearsal";
  } catch (error) {
    evidence.failure_code = /^[a-z0-9_:-]+$/i.test(error.message)
      ? error.message
      : "rollback_rehearsal_failed";
  } finally {
    await stopServer(server);
    if (serverOutput) {
      writeFileSync(path.join(runDirectory, "server-output.txt"), `${sanitize(serverOutput, temporaryRoot)}\n`);
    }
    if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
    writeFileSync(
      path.join(runDirectory, "rollback-rehearsal.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    writeFileSync(path.join(runDirectory, "rollback-rehearsal.md"), `${markdownReport(evidence)}\n`);
  }

  console.log("Phase 6 rollback rehearsal captured");
  console.log(`Result: ${evidence.result}`);
  console.log(`Current commit: ${currentCommit}`);
  console.log(`Target commit: ${targetCommit}`);
  console.log(`Output: ${runDirectory}`);
  if (evidence.result !== "passed_local_code_rehearsal") {
    console.error(`Failure: ${evidence.failure_code}`);
    process.exit(1);
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "rollback_rehearsal_failed";
  const failureCode = /^[a-z0-9_:-]+$/i.test(message) ? message : "rollback_rehearsal_failed";
  console.error(`Rollback rehearsal failed: ${failureCode}`);
  process.exit(1);
}
