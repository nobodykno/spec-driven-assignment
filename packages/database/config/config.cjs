const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/app";

module.exports = {
  development: {
    url: databaseUrl,
    dialect: "postgres",
  },
  test: {
    url: databaseUrl,
    dialect: "postgres",
  },
  production: {
    url: databaseUrl,
    dialect: "postgres",
  },
};
