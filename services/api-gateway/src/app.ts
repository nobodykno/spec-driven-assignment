import express, { type Express, type Request, type Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { HealthResponse } from "@app/shared";

const app: Express = express();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4001";

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  const response: HealthResponse = { status: "ok" };
  res.status(200).json(response);
});

app.use(
  "/api/v1/auth",
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
  }),
);

export default app;
