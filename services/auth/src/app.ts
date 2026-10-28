import express, { type Express, type Request, type Response } from "express";
import { connectDatabase } from "@app/database";
import type { HealthResponse } from "@app/shared";

const app: Express = express();

app.use(express.json());

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await connectDatabase();
    const response: HealthResponse = { status: "ok" };
    res.status(200).json(response);
  } catch {
    const response: HealthResponse = { status: "error" };
    res.status(503).json(response);
  }
});

export default app;
