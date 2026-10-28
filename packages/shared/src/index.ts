import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
