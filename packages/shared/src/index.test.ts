import { describe, it, expect } from "vitest";
import { HealthResponseSchema } from "./index.js";

describe("HealthResponseSchema", () => {
  it("validates ok status", () => {
    const result = HealthResponseSchema.safeParse({ status: "ok" });
    expect(result.success).toBe(true);
  });

  it("validates error status", () => {
    const result = HealthResponseSchema.safeParse({ status: "error" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = HealthResponseSchema.safeParse({ status: "unknown" });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = HealthResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = HealthResponseSchema.safeParse("ok");
    expect(result.success).toBe(false);
  });
});
