// User-facing error catalogue (DEC-015, SRS 12.3, FR-22).
// Messages are written for end users: no SQL, table names or stack traces.

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "INDENT_EMPTY"
  | "DUPLICATE_ITEM"
  | "NOT_EDITABLE"
  | "VERSION_CONFLICT"
  | "STOCK_UNAVAILABLE"
  | "EXPORT_FAILED"
  | "INTERNAL";

export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  INDENT_EMPTY: 400,
  DUPLICATE_ITEM: 409,
  NOT_EDITABLE: 409,
  VERSION_CONFLICT: 409,
  STOCK_UNAVAILABLE: 502,
  EXPORT_FAILED: 500,
  INTERNAL: 500,
};

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "You are not signed in. Please sign in and try again.",
  FORBIDDEN: "You do not have permission to do this.",
  NOT_FOUND: "We could not find what you were looking for.",
  VALIDATION_FAILED: "Please correct the highlighted fields.",
  INDENT_EMPTY: "An Indent cannot be saved without at least one Item.",
  DUPLICATE_ITEM: "This item is already in the indent. Edit its quantity instead.",
  NOT_EDITABLE: "This indent can no longer be changed because it is not a Draft.",
  VERSION_CONFLICT:
    "This indent was changed by someone else. Reload to see the latest version.",
  STOCK_UNAVAILABLE: "Current stock could not be retrieved right now. Please try again.",
  EXPORT_FAILED: "The export could not be completed. Please try again.",
  INTERNAL: "Something went wrong. Please try again.",
};

/** Shape of every error response body (docs/spec/api.md). */
export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    fieldErrors?: Record<string, string>;
    requestId?: string;
  };
}
