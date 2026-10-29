import { ZodError, type ZodType } from "zod";
import { AppError, isAppError } from "../errors";
import { ERROR_MESSAGES, ERROR_STATUS, type ErrorCode, type ErrorEnvelope } from "../../shared/messages";
import { EMPTY_INDENT_MESSAGE } from "../../shared/schemas/indent";

// Route-handler plumbing (DEC-015, docs/spec/api.md):
//   authenticate -> validate -> authorize -> service -> envelope
// Handlers wrapped in apiRoute() can simply throw; every failure becomes the
// one error envelope, and unexpected errors never leak their text.

export interface ApiMeta {
  requestId: string;
}

function envelope(
  code: ErrorCode,
  requestId: string,
  options: { message?: string; fieldErrors?: Record<string, string> } = {}
): Response {
  const body: ErrorEnvelope = {
    error: {
      code,
      message: options.message ?? ERROR_MESSAGES[code],
      ...(options.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
      requestId,
    },
  };
  return Response.json(body, { status: ERROR_STATUS[code] });
}

/** Converts Zod issues into an AppError with field errors keyed by path ("items.0.requiredQuantity"). */
export function zodToAppError(error: ZodError): AppError {
  const fieldErrors: Record<string, string> = {};
  let emptyItems = false;

  for (const issue of error.issues) {
    const path = issue.path.map(String);
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        fieldErrors[[...path, key].join(".")] = "This field is not allowed.";
      }
      continue;
    }
    // BR-01 / FR-08 has its own code so the UI can show the dedicated message.
    if (issue.code === "too_small" && path.join(".") === "items" && issue.message === EMPTY_INDENT_MESSAGE) {
      emptyItems = true;
    }
    const key = path.join(".") || "_";
    fieldErrors[key] ??= issue.message;
  }

  if (emptyItems && Object.keys(fieldErrors).length === 1) {
    return new AppError("INDENT_EMPTY", { cause: error });
  }
  return new AppError("VALIDATION_FAILED", { fieldErrors, cause: error });
}

/** Reads and validates a JSON body. Invalid JSON or shape -> VALIDATION_FAILED. */
export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("VALIDATION_FAILED", { message: "The request body must be valid JSON." });
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw zodToAppError(result.error);
  return result.data;
}

/** Validates query-string parameters of the request URL. */
export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) throw zodToAppError(result.error);
  return result.data;
}

/** Validates dynamic route parameters or any other already-parsed object. */
export function parseValue<T>(value: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(value);
  if (!result.success) throw zodToAppError(result.error);
  return result.data;
}

/** Turns any thrown value into the error response. Unknown errors are logged, not exposed. */
export function toErrorResponse(err: unknown, requestId: string): Response {
  if (isAppError(err)) {
    return envelope(err.code, requestId, { message: err.message, fieldErrors: err.fieldErrors });
  }
  if (err instanceof ZodError) {
    const appError = zodToAppError(err);
    return envelope(appError.code, requestId, {
      message: appError.message,
      fieldErrors: appError.fieldErrors,
    });
  }
  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  );
  return envelope("INTERNAL", requestId, {
    message: `${ERROR_MESSAGES.INTERNAL} Reference: ${requestId}`,
  });
}

/**
 * Wraps a route handler so every thrown error becomes the standard envelope.
 * `Ctx` is the Next.js route context (e.g. `{ params: Promise<{ indentNumber: string }> }`).
 */
export function apiRoute<Ctx = unknown>(
  handler: (req: Request, ctx: Ctx, meta: ApiMeta) => Promise<Response>
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    const requestId = crypto.randomUUID();
    try {
      return await handler(req, ctx, { requestId });
    } catch (err) {
      return toErrorResponse(err, requestId);
    }
  };
}
