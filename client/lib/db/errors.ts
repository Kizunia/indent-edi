// Errors whose message is safe to show to end users (FR-22). Anything else
// (e.g. a raw Prisma/MySQL error) is logged server-side and replaced with a
// generic message by `userMessage`.
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function userMessage(err: unknown, fallback: string): string {
  if (err instanceof AppError) return err.message;
  console.error(err);
  return fallback;
}
