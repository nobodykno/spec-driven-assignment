import express, { type Express } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";

export interface GatewayConfig {
  authServiceUrl: string;
}

export function createApp(config: GatewayConfig): Express {
  const app = express();
  app.disable("x-powered-by");

  // Answered by the gateway itself, never proxied (FR-SYS-001, FR-SYS-002).
  app.use(healthRouter());

  // No body parser before the proxy: it would consume the request stream.
  app.use(
    "/api/v1/auth",
    createProxyMiddleware({ target: config.authServiceUrl, changeOrigin: true }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
