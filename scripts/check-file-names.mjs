// Fails when a source file or one of its folders is not kebab-case (NFR-MNT-001, design D15).
// Usage: node scripts/check-file-names.mjs   (part of pnpm lint)
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CODE_FILE = /\.(ts|tsx|js|mjs|cjs)$/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The stem is the part before the first dot: `app.test.tsx` → `app`. Dot folders (`.husky`) are fine.
const isKebab = (segment) => KEBAB.test(segment.replace(/^\./, '').split('.')[0]);

/**
 * @param {string[]} paths repository-relative paths
 * @returns {string[]} the code files whose name or folder is not kebab-case
 */
export function findBadFileNames(paths) {
  return paths.filter((path) => CODE_FILE.test(path) && !path.split('/').every(isKebab));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tracked = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      encoding: 'utf8',
    },
  )
    .split('\u0000')
    .filter(Boolean);
  const bad = findBadFileNames(tracked);
  if (bad.length > 0) {
    console.error(`File names must be kebab-case (${bad.length}):`);
    for (const path of bad) {
      console.error(`  - ${path}`);
    }
    process.exit(1);
  }
}
