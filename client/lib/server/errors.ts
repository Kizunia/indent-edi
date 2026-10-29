import { ERROR_MESSAGES, ERROR_STATUS, type ErrorCode } from "../shared/messages";

/**
 * Expected, user-presentable failure (DEC-015). Anything that is not an
 * AppError is treated as a bug: it is logged and the client gets INTERNAL.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: ErrorCode,
    options: { message?: string; fieldErrors?: Record<string, string>; cause?: unknown } = {}
  ) {
    super(options.message ?? ERROR_MESSAGES[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.fieldErrors = options.fieldErrors;
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
