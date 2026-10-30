// Creates the integration-test database when missing and migrates it (SDS §11).
// Never touches the development database: the target name must end in `_test`.
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');

const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://dev:dev@localhost:5433/tracker_test',
);
const name = url.pathname.slice(1);

async function main() {
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(
      `Refusing to prepare "${name}": the test database name must match [a-z0-9_]+_test`,
    );
  }
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (found.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
  try {
    execFileSync('pnpm', ['exec', 'sequelize-cli', 'db:migrate'], {
      env: { ...process.env, DATABASE_URL: url.toString() },
      stdio: 'pipe',
    });
  } catch (error) {
    throw new Error(`Migration failed: ${error.stderr?.toString() || error.message}`, {
      cause: error,
    });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
