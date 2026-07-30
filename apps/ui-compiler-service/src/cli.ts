import { startRuntime } from "./runtime.js";

void startRuntime().catch((error: unknown) => {
  const code =
    error instanceof Error && "code" in error && typeof error.code === "string"
      ? error.code
      : "SERVICE_STARTUP_FAILED";
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
});
