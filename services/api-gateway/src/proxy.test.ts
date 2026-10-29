import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("gateway auth proxy", () => {
  let upstream: Server;
  let upstreamUrl: string;

  beforeAll(async () => {
    const auth = express();
    auth.get("/health", (_req, res) => {
      res.status(200).json({ status: "ok", from: "auth" });
    });
    upstream = await new Promise<Server>((resolve) => {
      const server = auth.listen(0, "127.0.0.1", () => resolve(server));
    });
    upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  });

  it("FR-SYS-001: /api/v1/auth/health is forwarded to auth /health", async () => {
    const response = await request(createApp({ authServiceUrl: upstreamUrl })).get(
      "/api/v1/auth/health",
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", from: "auth" });
  });

  it("FR-SYS-001: /api/v1/auth/* returns 503 SERVICE_UNAVAILABLE without internal details when auth is unreachable", async () => {
    const response = await request(createApp({ authServiceUrl: "http://127.0.0.1:1" })).get(
      "/api/v1/auth/health",
    );
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: { code: "SERVICE_UNAVAILABLE", message: "Service unavailable" },
    });
    expect(response.text).not.toContain("127.0.0.1");
    expect(response.text).not.toContain("ECONNREFUSED");
    expect(response.text).not.toContain("at ");
  });
});
