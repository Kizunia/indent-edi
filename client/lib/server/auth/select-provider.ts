import type { AppConfig } from "../config";
import { createDevProvider } from "./dev-provider";
import { externalProvider } from "./external-provider";
import type { AuthProvider } from "./types";

/** Chooses the provider from config. Refuses the dev provider in production (DEC-003). */
export function selectProvider(
  config: Pick<AppConfig, "authProvider" | "isProduction" | "devSessionSecret">,
  readCookie: () => Promise<string | undefined>
): AuthProvider {
  if (config.authProvider === "external") return externalProvider;
  return createDevProvider({
    secret: config.devSessionSecret,
    isProduction: config.isProduction,
    readCookie,
  });
}
