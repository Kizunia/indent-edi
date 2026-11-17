import { NextResponse } from "next/server";
import type { ZodType } from "zod";

// INTERIM (until WI-06): validation for the prototype routes. Failures answer
// 400 with `{ error: "<first message>", fieldErrors }` because the current UI
// reads `data.error` as a string. The final routes use apiRoute + the envelope.

export class LegacyValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors)[0] ?? "Please correct the highlighted fields.");
  }
}

export function validate<T>(value: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  // Not zodToAppError: it maps "no items" to INDENT_EMPTY, which carries no field errors.
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    fieldErrors[key] ??= issue.message;
  }
  throw new LegacyValidationError(fieldErrors);
}

/** Reads a JSON body; invalid JSON is a validation error, not a crash. */
export async function validateBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new LegacyValidationError({ _: "The request body must be valid JSON." });
  }
  return validate(raw, schema);
}

export function validateQuery<T>(req: Request, schema: ZodType<T>): T {
  return validate(Object.fromEntries(new URL(req.url).searchParams.entries()), schema);
}

/** Returns the 400 response for a validation error, or null for anything else. */
export function validationResponse(err: unknown): NextResponse | null {
  if (!(err instanceof LegacyValidationError)) return null;
  return NextResponse.json({ error: err.message, fieldErrors: err.fieldErrors }, { status: 400 });
}
