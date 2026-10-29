import { ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { AppError } from "@app/shared";
import express, { type Express } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";

export interface GatewayConfig {
  authServiceUrl: string;
}

// SDS §10: an unreachable downstream service becomes 503 SERVICE_UNAVAILABLE,
// without the upstream address or error details.
function sendServiceUnavailable(_err: Error, _req: unknown, res: ServerResponse | Socket): void {
  if (!(res instanceof ServerResponse)) {
    res.destroy();
    return;
  }
  if (res.headersSent) {
    res.end();
    return;
  }
  const body = new AppError("SERVICE_UNAVAILABLE", 503, "Service unavailable").toResponse();
  res.writeHead(503, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export function createApp(config: GatewayConfig): Express {
  const app = express();
  app.disable("x-powered-by");

  // Answered by the gateway itself, never proxied (FR-SYS-001, FR-SYS-002).
  app.use(healthRouter());

  // No body parser before the proxy: it would consume the request stream.
  app.use(
    "/api/v1/auth",
    createProxyMiddleware({
      target: config.authServiceUrl,
      changeOrigin: true,
      on: { error: sendServiceUnavailable },
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
