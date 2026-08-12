#!/usr/bin/env node
import type { AgUiMockScenarioName } from "./scenarios/types.js";
import { createAguiMockServer } from "./server.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const port = Number(argument("--port") ?? "4800");
const scenario = (argument("--scenario") ?? "echo") as AgUiMockScenarioName;
if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
  throw new Error("AG_UI_MOCK_PORT_INVALID");
}
if (scenario !== "echo" && scenario !== "locate-device") {
  throw new Error("AG_UI_MOCK_SCENARIO_INVALID");
}

const server = createAguiMockServer({ scenario });
const address = await server.listen({ port });
console.log(`AGUIMock '${scenario}' listening on ${address.url}`);

async function shutdown(): Promise<void> {
  await server.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
