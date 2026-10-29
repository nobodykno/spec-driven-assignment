import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

const appWithDatabase = (checkDatabase: () => Promise<boolean>) => createApp({ checkDatabase });

describe("tracker GET /health", () => {
  it("FR-SYS-001: GET /health returns 200 ok when the database is reachable", async () => {
    const response = await request(appWithDatabase(async () => true)).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("FR-SYS-001: GET /health returns 503 error when the database is down", async () => {
    const response = await request(appWithDatabase(async () => false)).get("/health");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "error" });
  });

  it("FR-SYS-001: GET /health recovers once the database is reachable again", async () => {
    const checkDatabase = vi.fn<() => Promise<boolean>>().mockResolvedValueOnce(false);
    checkDatabase.mockResolvedValue(true);
    const app = appWithDatabase(checkDatabase);
    expect((await request(app).get("/health")).status).toBe(503);
    expect((await request(app).get("/health")).status).toBe(200);
  });
});

describe("tracker errors", () => {
  it("FR-SYS-001: unknown path returns 404 NOT_FOUND", async () => {
    const response = await request(appWithDatabase(async () => true)).get("/healthz");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(typeof response.body.error.message).toBe("string");
  });

  it("NFR-MNT-001: unexpected error returns 500 INTERNAL_ERROR without stack", async () => {
    const response = await request(
      appWithDatabase(async () => {
        throw new Error("secret connection string leaked");
      }),
    ).get("/health");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect(response.text).not.toContain("secret");
    expect(response.text).not.toContain("at ");
  });
});
