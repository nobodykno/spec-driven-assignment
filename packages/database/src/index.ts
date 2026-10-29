import { Sequelize } from "sequelize";

// SDS §12.3 default for local development (Docker Postgres on host port 5433).
const DEFAULT_DATABASE_URL = "postgresql://dev:dev@localhost:5433/tracker";
const CONNECT_TIMEOUT_MS = 2000;

let sequelize: Sequelize | undefined;

export function getSequelize(): Sequelize {
  sequelize ??= new Sequelize(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    dialectOptions: { connectionTimeoutMillis: CONNECT_TIMEOUT_MS },
    pool: { acquire: CONNECT_TIMEOUT_MS },
  });
  return sequelize;
}

/**
 * FR-SYS-001: resolves true when the database accepts a connection within
 * `timeoutMs`, false otherwise. Never throws and never logs.
 */
export async function checkDatabase(timeoutMs = CONNECT_TIMEOUT_MS): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  const probe = getSequelize()
    .authenticate()
    .then(() => true)
    .catch(() => false);
  try {
    return await Promise.race([probe, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function closeDatabase(): Promise<void> {
  const current = sequelize;
  sequelize = undefined;
  await current?.close();
}
