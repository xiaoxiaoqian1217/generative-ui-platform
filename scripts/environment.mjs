import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads ignored development files without overriding values supplied by the
 * invoking shell.  Production `start` commands deliberately do not use this.
 */
export function loadDevelopmentEnvironment(
  directory,
  environment = process.env,
) {
  const supplied = new Map(Object.entries(environment));
  for (const name of [".env", ".env.local"]) {
    const path = resolve(directory, name);
    if (!existsSync(path)) continue;
    const values = process.loadEnvFile(path);
    for (const [key, value] of supplied) {
      process.env[key] = value;
    }
    void values;
  }
  return process.env;
}

export function redactEnvironmentError(message) {
  return String(message).replace(
    /((?:API[_-]?KEY|TOKEN|SECRET|AUTHORIZATION)(?:=|:|\s+Bearer\s+))[^\s,]*/giu,
    "$1=[REDACTED]",
  );
}
