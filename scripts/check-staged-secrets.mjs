// Fails when a staged file is a .env file or contains an obvious secret (NFR-SEC-005).
// Usage: node scripts/check-staged-secrets.mjs   (run by .husky/pre-commit)
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const JWT_SECRET_PATTERNS = [
  // `KEY=value`, `export`/`ENV`/`- ` prefixes, YAML `KEY: value`, JSON `"KEY": "value"`, also
  // after `{` or `,` for single-line JSON and inline YAML maps.
  // Group 1 is the opening quote (empty when unquoted), group 2 the value.
  /(?:^[\t ]*(?:-[\t ]*)?(?:(?:export|ENV)[\t ]+)?|[{,][\t ]*)["']?JWT_SECRET["']?[\t ]*[=:][\t ]*(["']?)([^"'\s#,]*)/gim,
  // Legacy Dockerfile form: `ENV KEY value`.
  /^[\t ]*ENV[\t ]+JWT_SECRET[\t ]+(["']?)([^"'\s=#]*)/gim,
];
// In source code an unquoted value is an expression (`z.string()`, `process.env.X`), not a secret.
const CODE_FILE = /\.(ts|tsx|js|mjs|cjs)$/;
const JWT_PLACEHOLDER = /^(?:change-?me|<.*>|\$\{.*\}|your[-_].*|x+)$/i;
const AWS_ACCESS_KEY = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/;
const AWS_SECRET_KEY =
  /aws_secret_access_key[\t ]*[=:][\t ]*["']?[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/i;

/** True for `.env` and `.env.*`, except `.env.example`. */
export function isEnvFile(path) {
  const name = basename(path);
  return name === '.env' || (name.startsWith('.env.') && name !== '.env.example');
}

function isRealValue([, quote, value], inCode) {
  if (value === '' || JWT_PLACEHOLDER.test(value)) {
    return false;
  }
  return !inCode || quote !== '';
}

function hasRealJwtSecret(path, content) {
  const inCode = CODE_FILE.test(path);
  return JWT_SECRET_PATTERNS.some((pattern) =>
    [...content.matchAll(pattern)].some((match) => isRealValue(match, inCode)),
  );
}

/**
 * Findings name the file and the rule, never the matched text.
 * @param {{ path: string, content: string }[]} files
 * @returns {string[]} findings
 */
export function findSecrets(files) {
  const findings = [];
  for (const { path, content } of files) {
    if (isEnvFile(path)) {
      findings.push(`${path}: .env files must not be committed (use .env.example)`);
      continue;
    }
    if (content.includes('\u0000')) {
      continue;
    }
    if (PRIVATE_KEY.test(content)) {
      findings.push(`${path}: contains a private key`);
    }
    if (hasRealJwtSecret(path, content)) {
      findings.push(`${path}: contains a real JWT_SECRET value`);
    }
    if (AWS_ACCESS_KEY.test(content)) {
      findings.push(`${path}: contains an AWS access key id`);
    }
    if (AWS_SECRET_KEY.test(content)) {
      findings.push(`${path}: contains an AWS secret access key`);
    }
  }
  return findings;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Reads the staged blob, so unstaged edits can't hide or fake a finding. .env files are never read. */
function stagedFiles() {
  const paths = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
    .split('\u0000')
    .filter(Boolean);
  return paths.map((path) => ({ path, content: isEnvFile(path) ? '' : git(['show', `:${path}`]) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const findings = findSecrets(stagedFiles());
  if (findings.length > 0) {
    console.error(`Commit blocked: possible secrets staged (${findings.length}):`);
    for (const finding of findings) {
      console.error(`  - ${finding}`);
    }
    console.error(
      'Unstage the file or remove the secret. Secrets belong in environment variables.',
    );
    process.exit(1);
  }
}
