import { Sequelize } from "sequelize";

const databaseUrl = process.env.DATABASE_URL || "postgres://localhost:5432/app";

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
  console.log("Database connection established successfully.");
}
