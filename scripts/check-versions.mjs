// Fails when any npm dependency or Docker image uses a floating version (NFR-OPS-001).
// Usage: node scripts/check-versions.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXACT_SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
// Docker tags need at least major.minor; a suffix such as -alpine is allowed.
const EXACT_IMAGE_TAG = /^\d+\.\d+(\.\d+)?(-[0-9A-Za-z.-]+)?$/;
const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/** @returns {string[]} findings */
export function checkPackageJson(pkg, file) {
  const findings = [];
  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (range.startsWith("workspace:")) continue;
      if (!EXACT_SEMVER.test(range)) {
        findings.push(`${file}: ${field}.${name} uses floating version "${range}"`);
      }
    }
  }
  if (pkg.packageManager !== undefined) {
    const version = pkg.packageManager.split("@")[1] ?? "";
    if (!EXACT_SEMVER.test(version.split("+")[0])) {
      findings.push(`${file}: packageManager "${pkg.packageManager}" is not pinned`);
    }
  }
  return findings;
}

function checkImage(image, file) {
  const ref = image.replace(/^["']|["']$/g, "");
  if (ref.includes("@sha256:")) return null;
  const colon = ref.lastIndexOf(":");
  const tag = colon > ref.lastIndexOf("/") ? ref.slice(colon + 1) : "";
  return EXACT_IMAGE_TAG.test(tag) ? null : `${file}: image "${ref}" is not pinned to an exact tag`;
}

/** @returns {string[]} findings */
export function checkDockerfile(text, file) {
  const findings = [];
  const stages = new Set(["scratch"]);
  for (const line of text.split("\n")) {
    const from = line.match(/^\s*FROM\s+(?:--\S+\s+)*(\S+)(?:\s+AS\s+(\S+))?/i);
    if (from) {
      const [, image, stage] = from;
      if (!stages.has(image.toLowerCase())) {
        const finding = checkImage(image, file);
        if (finding) findings.push(finding);
      }
      if (stage) stages.add(stage.toLowerCase());
    }
    for (const match of line.matchAll(/pnpm@(\S+)/g)) {
      if (!EXACT_SEMVER.test(match[1])) {
        findings.push(`${file}: "pnpm@${match[1]}" is not pinned`);
      }
    }
  }
  return findings;
}

/** @returns {string[]} findings */
export function checkCompose(text, file) {
  const findings = [];
  for (const line of text.split("\n")) {
    const image = line.match(/^\s*image:\s*(\S+)/);
    if (image) {
      const finding = checkImage(image[1], file);
      if (finding) findings.push(finding);
    }
  }
  return findings;
}

function workspaceDirs(root) {
  const config = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  const dirs = [root];
  for (const match of config.matchAll(/^\s*-\s*["']?([^"'\s]+)\/\*["']?\s*$/gm)) {
    const parent = join(root, match[1]);
    if (!existsSync(parent)) continue;
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(join(parent, entry.name));
    }
  }
  return dirs;
}

export function checkRepository(root) {
  const findings = [];
  for (const dir of workspaceDirs(root)) {
    const pkgFile = join(dir, "package.json");
    if (existsSync(pkgFile)) {
      const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
      findings.push(...checkPackageJson(pkg, relative(root, pkgFile) || "package.json"));
    }
    const dockerfile = join(dir, "Dockerfile");
    if (existsSync(dockerfile)) {
      findings.push(...checkDockerfile(readFileSync(dockerfile, "utf8"), relative(root, dockerfile)));
    }
  }
  const compose = join(root, "docker-compose.yml");
  if (existsSync(compose)) {
    findings.push(...checkCompose(readFileSync(compose, "utf8"), "docker-compose.yml"));
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(fileURLToPath(import.meta.url), "..", "..");
  const findings = checkRepository(root);
  if (findings.length > 0) {
    console.error(`Floating versions found (${findings.length}):`);
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exit(1);
  }
  console.log("All dependency and image versions are pinned.");
}
