import { z } from "zod";

// Error codes from SDS §6.4.
export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "ASSIGNEE_NOT_MEMBER",
  "UNAUTHORIZED",
  "INVALID_CREDENTIALS",
  "INVALID_REFRESH_TOKEN",
  "FORBIDDEN",
  "NOT_FOUND",
  "USER_NOT_FOUND",
  "EMAIL_TAKEN",
  "ALREADY_MEMBER",
  "LAST_OWNER",
  "PROJECT_ARCHIVED",
  "TASK_ARCHIVED",
  "INVALID_STATUS_TRANSITION",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

// SDS §6.1: { error: { code, message, details? } }
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// SDS §10: thrown by services, mapped to an HTTP response by the error middleware.
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
  }

  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}
