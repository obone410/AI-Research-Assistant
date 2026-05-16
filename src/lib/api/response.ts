import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "not_found"
  | "rate_limit_exceeded"
  | "validation_error"
  | "upstream_error"
  | "internal_error";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export function validationFail(error: ZodError) {
  return fail(
    "validation_error",
    "Request validation failed.",
    422,
    error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    })),
  );
}

export function unknownFail(error: unknown) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return fail("internal_error", message, 500);
}
