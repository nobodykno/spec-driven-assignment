import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "./app.js";

vi.mock("@app/database", () => ({
  connectDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /health", () => {
  it("returns 200 with status ok when database is connected", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
