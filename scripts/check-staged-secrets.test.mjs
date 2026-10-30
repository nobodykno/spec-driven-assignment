import { describe, expect, it } from 'vitest';
import { findSecrets } from './check-staged-secrets.mjs';

// Secret-looking fixtures are assembled at runtime so this file never matches the check itself.
const PRIVATE_KEY = [
  '-----BEGIN',
  ' RSA PRIVATE ',
  'KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----',
].join('');
const JWT_LINE = 'JWT_' + 'SECRET=' + 's3cr3t-real-value-123';
const AWS_ACCESS_KEY = 'AK' + 'IA' + 'ABCDEFGHIJKLMNOP';
const AWS_SECRET_LINE =
  'aws_secret_' + 'access_key = ' + 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

const file = (path, content = '') => ({ path, content });

describe('check-staged-secrets', () => {
  it.each(['.env', 'services/auth/.env', '.env.production', 'apps/web/.env.local'])(
    'NFR-SEC-005: rejects .env, nested .env and .env.production (%s)',
    (path) => {
      const findings = findSecrets([file(path, 'PORT=4001')]);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toContain(path);
    },
  );

  it('NFR-SEC-005: allows .env.example', () => {
    expect(
      findSecrets([file('.env.example', 'JWT_' + 'SECRET='), file('services/auth/.env.example')]),
    ).toEqual([]);
  });

  it('NFR-SEC-005: allows ordinary source files', () => {
    expect(findSecrets([file('services/auth/src/app.ts', 'export const port = 4001;\n')])).toEqual(
      [],
    );
  });

  it('NFR-SEC-005: rejects a private key block', () => {
    const findings = findSecrets([file('keys/id_rsa', PRIVATE_KEY)]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('keys/id_rsa');
    expect(findings[0]).toContain('private key');
  });

  it.each([JWT_LINE, `export ${JWT_LINE}`, 'JWT_' + 'SECRET="quoted-real-value-456"'])(
    'NFR-SEC-005: rejects JWT_SECRET with a real value and allows placeholders (%#)',
    (line) => {
      const findings = findSecrets([file('docker-compose.yml', `env:\n  ${line}\n`)]);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toContain('JWT_SECRET');
    },
  );

  it.each(['', 'change-me', 'changeme', '<your-secret>', '${JWT_SECRET}', 'your-secret', 'xxxxxx'])(
    'NFR-SEC-005: rejects JWT_SECRET with a real value and allows placeholders (placeholder %j)',
    (value) => {
      expect(findSecrets([file('README.txt', 'JWT_' + 'SECRET=' + value)])).toEqual([]);
    },
  );

  it.each([
    ['Dockerfile', 'ENV JWT_' + 'SECRET=docker-real-value-1'],
    [
      'docker-compose.yml',
      'services:\n  auth:\n    environment:\n      JWT_' + 'SECRET: compose-real-2',
    ],
    ['config/app.json', '{\n  "JWT_' + 'SECRET": "json-real-value-3"\n}'],
    ['config/min.json', '{"PORT":4001,"JWT_' + 'SECRET":"minified-real-4"}'],
    ['compose.inline.yml', 'environment: { PORT: 4001, JWT_' + 'SECRET: inline-real-5 }'],
    ['old.Dockerfile', 'ENV JWT_' + 'SECRET legacy-real-value-6'],
  ])(
    'NFR-SEC-005: rejects JWT_SECRET in Dockerfile, compose and JSON form (%s)',
    (path, content) => {
      const findings = findSecrets([file(path, content)]);
      expect(findings).toEqual([`${path}: contains a real JWT_SECRET value`]);
    },
  );

  it.each([
    ['docker-compose.yml', '      JWT_' + 'SECRET: ${JWT_SECRET}'],
    ['Dockerfile', 'ENV JWT_' + 'SECRET=change-me'],
    ['config/app.json', '{\n  "JWT_' + 'SECRET": ""\n}'],
    ['config/min.json', '{"JWT_' + 'SECRET":""}'],
    ['README.md', 'Set JWT_' + 'SECRET before starting the auth service.'],
  ])('NFR-SEC-005: allows JWT_SECRET placeholders in other forms (%s)', (path, content) => {
    expect(findSecrets([file(path, content)])).toEqual([]);
  });

  it('NFR-SEC-005: rejects AWS-style access and secret keys', () => {
    const findings = findSecrets([
      file('config/a.json', `{"key":"${AWS_ACCESS_KEY}"}`),
      file('config/b.ini', AWS_SECRET_LINE),
    ]);
    expect(findings).toHaveLength(2);
    expect(findings[0]).toContain('config/a.json');
    expect(findings[1]).toContain('config/b.ini');
  });

  it('NFR-SEC-005: findings never contain the secret value', () => {
    const findings = findSecrets([
      file('a', PRIVATE_KEY),
      file('b', JWT_LINE),
      file('c', AWS_ACCESS_KEY),
      file('d', AWS_SECRET_LINE),
    ]);
    expect(findings).toHaveLength(4);
    const text = findings.join('\n');
    expect(text).not.toContain('MIIEow');
    expect(text).not.toContain('s3cr3t-real-value-123');
    expect(text).not.toContain(AWS_ACCESS_KEY);
    expect(text).not.toContain('wJalrXUtnFEMI');
  });

  it('NFR-SEC-005: skips binary content', () => {
    expect(findSecrets([file('img.png', '\u0000' + AWS_ACCESS_KEY)])).toEqual([]);
  });
});
