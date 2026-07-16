import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";

/** @param {string} root @param {string} candidate */
function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}

/** @param {string} [cwd] */
export function resolveRepositoryRoot(cwd = process.cwd()) {
  const result = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd, encoding: "utf8" },
  );
  const commonDirectory = result.status === 0 ? result.stdout.trim() : "";

  if (commonDirectory && path.basename(commonDirectory) === ".git") {
    return path.dirname(commonDirectory);
  }

  return cwd;
}

/**
 * @param {string} value
 * @param {{ cwd?: string, repositoryRoot?: string }} [options]
 */
export function releaseEvidenceReferenceExists(
  value,
  { cwd = process.cwd(), repositoryRoot } = {},
) {
  const normalized = value.replace(/^`|`$/g, "").trim();
  if (!normalized || normalized === "pending") {
    return false;
  }
  if (/^https?:\/\//.test(normalized)) {
    return true;
  }

  if (normalized === "<repo>" || normalized.startsWith("<repo>/")) {
    const root = repositoryRoot ?? resolveRepositoryRoot(cwd);
    const relativePath = normalized === "<repo>" ? "" : normalized.slice("<repo>/".length);
    const artifactPath = path.resolve(root, relativePath);
    if (!isWithin(root, artifactPath) || !existsSync(artifactPath)) {
      return false;
    }
    return isWithin(realpathSync(root), realpathSync(artifactPath));
  }

  const artifactPath = path.isAbsolute(normalized) ? normalized : path.join(cwd, normalized);
  return existsSync(artifactPath);
}
