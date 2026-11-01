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
  });
});
