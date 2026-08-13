#!/usr/bin/env node

import { createAguiMockServer } from "./server.js";

interface CliOptions {
  readonly port: number;
}

function usage(): string {
  return "Usage: ag-ui-mock [--port <port>]";
}

function parseCliOptions(argv: readonly string[]): CliOptions {
  let port = 4800;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--port" && value !== undefined) {
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65_535) {
        throw new Error(`Invalid port: ${value}`);
      }
      port = parsed;
      index += 1;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${argument ?? ""}`);
  }

  return { port };
}

async function main(): Promise<void> {
  try {
    const options = parseCliOptions(process.argv.slice(2));
    const server = createAguiMockServer(options);
    const url = await server.start();
    console.log(`AG-UI mock listening on ${url}`);

    const shutdown = () => {
      void server.stop().finally(() => process.exit(0));
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage());
    process.exitCode = 1;
  }
}

void main();
