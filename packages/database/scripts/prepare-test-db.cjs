// Creates the integration-test database when missing and migrates it (SDS §11).
// Never touches the development database: the target name must end in `_test`.
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');

const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://dev:dev@localhost:5433/tracker_test',
);
const name = url.pathname.slice(1);

async function main() {
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to prepare "${name}": the test database name must end in _test`);
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
  execFileSync('pnpm', ['exec', 'sequelize-cli', 'db:migrate'], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'ignore',
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
