import { ReferenceBusinessAgent } from "./agent.js";
import { SqliteCheckpointStore } from "./checkpoint-store.js";
import { createBusinessAgentConfiguration } from "./config.js";
import { createBusinessAgentServer } from "./http-server.js";

async function start(): Promise<void> {
  const configuration = createBusinessAgentConfiguration();
  const checkpoints = new SqliteCheckpointStore(
    configuration.checkpointDatabasePath,
  );
  const server = createBusinessAgentServer(
    new ReferenceBusinessAgent(checkpoints),
  );
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await server.closeGracefully();
    checkpoints.close();
  };
  process.once("SIGINT", () => void close());
  process.once("SIGTERM", () => void close());
  const address = await server.listen(configuration);
  process.stdout.write(
    `${JSON.stringify({ event: "business-agent.listening", address })}\n`,
  );
}

start().catch((caught: unknown) => {
  const message = caught instanceof Error ? caught.message : "Unknown error";
  process.stderr.write(
    `Reference Business Agent failed to start: ${message}\n`,
  );
  process.exitCode = 1;
});
