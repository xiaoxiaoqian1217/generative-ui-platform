import { createInterventionAgentServer } from "../src/features/intervention-lab/server/index.js";

const configuredPort = process.env.INTERVENTION_AGENT_PORT;
const port = configuredPort === undefined ? 4802 : Number(configuredPort);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("INTERVENTION_AGENT_PORT必须为1至65535的整数。");
}

const server = createInterventionAgentServer({ port });
const url = await server.start();
console.info(`Intervention validation Agent: ${url}/api/intervention-agent`);
console.info(
  "Real AG-UI HTTP/SSE transport; rule-driven simulation; no LLM or device.",
);

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await server.stop();
};
process.on("SIGINT", () => {
  void stop();
});
process.on("SIGTERM", () => {
  void stop();
});
