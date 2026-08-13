import { type AGUIEvent, EventType, type RunAgentInput } from "@ag-ui/core";
import type { AGUIRunContext } from "../src/index.js";

const context: AGUIRunContext = { threadId: "thread-1", runId: "run-1" };
const input: RunAgentInput = {
  ...context,
  state: {},
  messages: [],
  tools: [],
  context: [],
};
const event: AGUIEvent = { type: EventType.RUN_STARTED, ...context };

void input;
void event;
