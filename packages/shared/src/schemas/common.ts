import { z } from "zod";

// FR-SYS-001: body returned by every GET /health endpoint.
export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
