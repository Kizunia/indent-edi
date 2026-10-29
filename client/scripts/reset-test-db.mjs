// Drops and recreates the schema of the TEST database and applies migrations.
// Refuses to run unless DATABASE_URL_TEST names a database ending in "_test".
import { spawnSync } from "node:child_process";
import fs from "node:fs";

// Minimal .env loader (no extra dependency).
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*(#.*)?$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  console.error("DATABASE_URL_TEST is not set.");
  process.exit(1);
}
const dbName = new URL(url).pathname.replace(/^\//, "");
if (!dbName.endsWith("_test")) {
  console.error(`Refusing to reset "${dbName}": name must end in "_test".`);
  process.exit(1);
}

const r = spawnSync("npx", ["prisma", "migrate", "reset", "--force", "--skip-seed"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(r.status ?? 1);
