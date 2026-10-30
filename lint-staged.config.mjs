// Runs on staged files from .husky/pre-commit (NFR-MNT-001). Prettier respects .prettierignore.
export default {
  '*.{ts,tsx,js,mjs}': ['eslint --fix --no-warn-ignored', 'prettier --write --ignore-unknown'],
  '*.{json,md,yaml,yml}': 'prettier --write --ignore-unknown',
};
