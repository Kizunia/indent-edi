import { z } from "zod";
import { isValidTimeZone } from "../shared/datetime";

// Central, validated configuration (docs/architecture/overview.md).
// Anything the SRS marks TBD is a PROVISIONAL setting read from here, never a
// literal in business code (DEC-001 rule 7). DATABASE_URL is checked by the
// database layer (WI-04), not here, so auth and validation work without a DB.

const text = (fallback: string) => z.preprocess((v) => (v === "" ? undefined : v), z.string().default(fallback));

const bool = (fallback: boolean) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z
      .enum(["true", "false"], { error: "Must be true or false." })
      .default(fallback ? "true" : "false")
      .transform((v) => v === "true")
  );

const pad = (fallback: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.coerce.number().int().min(1).max(12).default(fallback)
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_PROVIDER: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["dev", "external"]).optional()),
  DEV_SESSION_SECRET: text("dev-only-insecure-secret"),
  AUTH_LOGIN_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  // PROVISIONAL (DEC-021): company timezone is unconfirmed.
  APP_TIMEZONE: text("Asia/Kolkata").refine(isValidTimeZone, "Unknown time zone."),
  // PROVISIONAL (DEC-009)
  ALLOW_DUPLICATE_ITEMS: bool(false),
  // PROVISIONAL (DEC-010): formats are TBD in SRS 7.2 / 8.4.
  INDENT_NUMBER_PREFIX: text("IND-"),
  INDENT_NUMBER_PAD: pad(6),
  ITEM_CODE_PREFIX: text("ITM-"),
  ITEM_CODE_PAD: pad(6),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  authProvider: "dev" | "external";
  devSessionSecret: string;
  authLoginUrl?: string;
  appTimezone: string;
  allowDuplicateItems: boolean;
  indentNumber: { prefix: string; pad: number };
  itemCode: { prefix: string; pad: number };
}

/** Parses environment variables into a typed config. Throws on invalid values. */
export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${detail}`);
  }
  const e = parsed.data;
  const isProduction = e.NODE_ENV === "production";
  return {
    nodeEnv: e.NODE_ENV,
    isProduction,
    // Production never defaults to the dev switcher (DEC-003).
    authProvider: e.AUTH_PROVIDER ?? (isProduction ? "external" : "dev"),
    devSessionSecret: e.DEV_SESSION_SECRET,
    authLoginUrl: e.AUTH_LOGIN_URL,
    appTimezone: e.APP_TIMEZONE,
    allowDuplicateItems: e.ALLOW_DUPLICATE_ITEMS,
    indentNumber: { prefix: e.INDENT_NUMBER_PREFIX, pad: e.INDENT_NUMBER_PAD },
    itemCode: { prefix: e.ITEM_CODE_PREFIX, pad: e.ITEM_CODE_PAD },
  };
}

let cached: AppConfig | undefined;

/** Config for the running process (parsed once). */
export function getConfig(): AppConfig {
  cached ??= parseConfig(process.env);
  return cached;
}

/** Test helper: forget the cached config so the next getConfig() re-reads env. */
export function resetConfigForTests(): void {
  cached = undefined;
}
