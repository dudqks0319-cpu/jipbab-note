import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import {
  releaseEvidenceReferenceExists,
  resolveRepositoryRoot,
} from "../scripts/lib/release-evidence-reference.mjs";

const repositoryRoot = mkdtempSync(path.join(tmpdir(), "jipbab-release-evidence-"));
const worktreeRoot = path.join(repositoryRoot, ".worktrees", "release-check");
const evidenceDirectory = path.join(repositoryRoot, "output", "release-evidence", "confirmed");

mkdirSync(worktreeRoot, { recursive: true });
mkdirSync(evidenceDirectory, { recursive: true });
writeFileSync(path.join(evidenceDirectory, "summary.md"), "confirmed\n");
writeFileSync(path.join(worktreeRoot, "local-evidence.txt"), "confirmed\n");
symlinkSync(tmpdir(), path.join(repositoryRoot, "escaped-evidence"));

after(() => {
  rmSync(repositoryRoot, { recursive: true, force: true });
});

test("release evidence references resolve <repo> paths from linked worktrees", () => {
  assert.equal(
    releaseEvidenceReferenceExists("<repo>/output/release-evidence/confirmed", {
      cwd: worktreeRoot,
      repositoryRoot,
    }),
    true,
  );
});

test("release evidence references preserve URLs and worktree-relative paths", () => {
  assert.equal(
    releaseEvidenceReferenceExists("https://example.com/evidence", { cwd: worktreeRoot, repositoryRoot }),
    true,
  );
  assert.equal(
    releaseEvidenceReferenceExists("local-evidence.txt", { cwd: worktreeRoot, repositoryRoot }),
    true,
  );
  assert.equal(releaseEvidenceReferenceExists("pending", { cwd: worktreeRoot, repositoryRoot }), false);
});

test("release evidence references reject <repo> path traversal", () => {
  assert.equal(
    releaseEvidenceReferenceExists("<repo>/../outside-evidence", { cwd: worktreeRoot, repositoryRoot }),
    false,
  );
  assert.equal(
    releaseEvidenceReferenceExists("<repo>/escaped-evidence", { cwd: worktreeRoot, repositoryRoot }),
    false,
  );
});

test("repository root resolution returns the canonical Git root for this worktree", () => {
  const commonDirectory = execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" },
  ).trim();

  assert.equal(resolveRepositoryRoot(), path.dirname(commonDirectory));
});
