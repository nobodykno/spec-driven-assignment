import { Writable } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { REDACT_PATHS } from './logger.js';

describe('auth logger redaction', () => {
  it('NFR-SEC-005: Redaction', () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _encoding, done) {
        lines.push(chunk.toString());
        done();
      },
    });
    const logger = pino({ redact: { paths: REDACT_PATHS, censor: '[Redacted]' } }, sink);
    logger.info({ password: 'abcdefg1', headers: { authorization: 'Bearer secret.jwt' } });
    const output = lines.join('');
    expect(output).toContain('[Redacted]');
    expect(output).not.toContain('abcdefg1');
    expect(output).not.toContain('secret.jwt');
    const entry = JSON.parse(output) as { password: string; headers: { authorization: string } };
    expect(entry.password).toBe('[Redacted]');
    expect(entry.headers.authorization).toBe('[Redacted]');

    // pino-http style: secrets nested two levels deep.
    lines.length = 0;
    logger.info({
      req: {
        headers: {
          authorization: 'Bearer deep.jwt.value',
          cookie: 'refresh=deep-cookie-value',
          'x-internal-token': 'deep-internal-token',
        },
        body: { password: 'deepPassw0rd', passwordHash: 'deep-hash-in-body' },
      },
      res: { headers: { 'set-cookie': ['refresh=deep-set-cookie; HttpOnly'] } },
      passwordHash: 'deep-hash-top',
    });
    const deepOutput = lines.join('');
    for (const secret of [
      'deep.jwt.value',
      'deep-cookie-value',
      'deep-internal-token',
      'deepPassw0rd',
      'deep-hash-in-body',
      'deep-set-cookie',
      'deep-hash-top',
    ]) {
      expect(deepOutput).not.toContain(secret);
    }
    const deep = JSON.parse(deepOutput) as {
      req: {
        headers: Record<string, unknown>;
        body: { password: unknown; passwordHash: unknown };
      };
      res: { headers: Record<string, unknown> };
      passwordHash: unknown;
    };
    expect(deep.req.headers.authorization).toBe('[Redacted]');
    expect(deep.req.headers.cookie).toBe('[Redacted]');
    expect(deep.req.headers['x-internal-token']).toBe('[Redacted]');
    expect(deep.req.body.password).toBe('[Redacted]');
    expect(deep.req.body.passwordHash).toBe('[Redacted]');
    expect(deep.res.headers['set-cookie']).toBe('[Redacted]');
    expect(deep.passwordHash).toBe('[Redacted]');
  });
});
