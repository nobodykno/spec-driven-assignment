import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkDatabase, closeDatabase } from './index.js';

describe('checkDatabase', () => {
  // Models bind the shared instance at import; drop it so the URL set below is used.
  beforeAll(async () => {
    await closeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('FR-SYS-001: checkDatabase returns false within 3s when the database is unreachable', async () => {
    process.env.DATABASE_URL = 'postgresql://x:x@127.0.0.1:1/x';
    const started = Date.now();
    await expect(checkDatabase(500)).resolves.toBe(false);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
