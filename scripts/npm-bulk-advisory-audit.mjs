const severityOrder = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectDependencyVersions(dependencies, versionsByName) {
  if (!isRecord(dependencies)) return;

  for (const [name, dependency] of Object.entries(dependencies)) {
    if (!isRecord(dependency)) continue;

    if (typeof dependency.version === "string" && dependency.version.trim()) {
      const versions = versionsByName.get(name) ?? new Set();
      versions.add(dependency.version.trim());
      versionsByName.set(name, versions);
    }

    collectDependencyVersions(dependency.dependencies, versionsByName);
  }
}

export function buildBulkAuditPayload(projects) {
  if (!Array.isArray(projects)) {
    throw new Error("pnpm production dependency tree must be a JSON array");
  }

  const versionsByName = new Map();
  for (const project of projects) {
    if (!isRecord(project)) continue;
    collectDependencyVersions(project.dependencies, versionsByName);
  }

  return Object.fromEntries(
    [...versionsByName.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, versions]) => [name, [...versions].sort()]),
  );
}

export function findBlockingAdvisories(report, minimumSeverity = "moderate") {
  if (!isRecord(report)) {
    throw new Error("npm bulk advisory response must be a JSON object");
  }

  const minimumRank = severityOrder[minimumSeverity];
  if (!minimumRank) {
    throw new Error(`unsupported audit severity: ${minimumSeverity}`);
  }

  const advisories = [];
  for (const [packageName, packageAdvisories] of Object.entries(report)) {
    if (!Array.isArray(packageAdvisories)) {
      throw new Error(`npm bulk advisory entry for ${packageName} must be an array`);
    }

    for (const advisory of packageAdvisories) {
      if (!isRecord(advisory) || typeof advisory.severity !== "string") {
        throw new Error(`npm bulk advisory entry for ${packageName} is malformed`);
      }

      const severity = advisory.severity.toLowerCase();
      const severityRank = severityOrder[severity];
      if (!severityRank) {
        throw new Error(`npm bulk advisory entry for ${packageName} has unknown severity`);
      }
      if (severityRank < minimumRank) continue;

      const url = typeof advisory.url === "string" ? advisory.url : "";
      const ghsa = url.match(/GHSA-[a-z0-9-]+/i)?.[0]?.toUpperCase() ?? "advisory";
      advisories.push({
        packageName,
        severity,
        ghsa,
        title: typeof advisory.title === "string" ? advisory.title : "untitled advisory",
      });
    }
  }

  return advisories.sort((left, right) => {
    const severityDelta = severityOrder[right.severity] - severityOrder[left.severity];
    return severityDelta || left.packageName.localeCompare(right.packageName);
  });
}
