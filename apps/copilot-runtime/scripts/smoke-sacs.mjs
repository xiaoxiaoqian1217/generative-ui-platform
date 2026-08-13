import { randomUUID } from "node:crypto";

const runtimeUrl = (
  process.env.SACS_SMOKE_RUNTIME_URL ?? "http://127.0.0.1:4801/api/copilotkit"
).replace(/\/$/, "");
const prompt =
  process.env.SACS_SMOKE_PROMPT ??
  "Submit a small business task and return its status, published state, activity, and artifact.";
const agentId = "single-agent-chat-server";
const errorPrompt = process.env.SACS_SMOKE_ERROR_PROMPT;

function events(stream) {
  return [...stream.matchAll(/^data: (.+)$/gm)].map((match) =>
    JSON.parse(match[1]),
  );
}

const infoResponse = await fetch(`${runtimeUrl}/info`);
if (!infoResponse.ok) throw new Error(`RUNTIME_INFO_${infoResponse.status}`);
const info = await infoResponse.json();
const capabilities = info.agents?.[agentId]?.capabilities;
if (!capabilities) throw new Error("SACS_AGENT_NOT_REGISTERED");
if (capabilities.identity?.metadata?.discovery !== "live")
  throw new Error("SACS_CAPABILITY_DISCOVERY_NOT_LIVE");

async function run(prompt) {
  const runId = randomUUID();
  const threadId = randomUUID();
  const response = await fetch(`${runtimeUrl}/agent/${agentId}/run`, {
    body: JSON.stringify({
      context: [],
      forwardedProps: {},
      messages: [{ content: prompt, id: randomUUID(), role: "user" }],
      runId,
      state: {},
      threadId,
      tools: [],
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(`SACS_RUN_HTTP_${response.status}`);
  return events(await response.text());
}

const receivedEvents = await run(prompt);
const types = receivedEvents.map((event) => event.type);
for (const required of [
  "RUN_STARTED",
  "TEXT_MESSAGE_START",
  "TEXT_MESSAGE_CONTENT",
  "TEXT_MESSAGE_END",
  "STATE_SNAPSHOT",
  "STATE_DELTA",
  "ACTIVITY_SNAPSHOT",
  "ACTIVITY_DELTA",
  "RUN_FINISHED",
]) {
  if (!types.includes(required))
    throw new Error(`SACS_EVENT_MISSING_${required}`);
}
if (types.includes("RUN_ERROR")) throw new Error("SACS_RUN_ERROR");
const finished = receivedEvents.find((event) => event.type === "RUN_FINISHED");
const artifact = finished?.result?.artifact ?? finished?.result?.artifacts?.[0];
if (typeof artifact !== "object" || artifact === null)
  throw new Error("SACS_ARTIFACT_MISSING");

if (!errorPrompt) throw new Error("SACS_SMOKE_ERROR_PROMPT_REQUIRED");
const errorTypes = (await run(errorPrompt)).map((event) => event.type);
if (!errorTypes.includes("RUN_ERROR"))
  throw new Error("SACS_EXPECTED_RUN_ERROR_MISSING");
if (errorTypes.includes("RUN_FINISHED"))
  throw new Error("SACS_ERROR_RUN_FINISHED_UNEXPECTEDLY");

console.log(`SACS smoke passed: ${[...new Set(types)].join(", ")}`);
