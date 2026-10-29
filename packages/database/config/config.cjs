// sequelize-cli configuration (SDS §5.4). DATABASE_URL comes from the environment.
const databaseUrl = process.env.DATABASE_URL || "postgresql://dev:dev@localhost:5433/tracker";

module.exports = {
  development: { url: databaseUrl, dialect: "postgres" },
  test: { url: databaseUrl, dialect: "postgres" },
  production: { url: databaseUrl, dialect: "postgres" },
};
