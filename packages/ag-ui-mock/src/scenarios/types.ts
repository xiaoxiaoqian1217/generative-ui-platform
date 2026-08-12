import { type BaseEvent, EventType, type RunAgentInput } from "@ag-ui/core";

export type AgUiMockScenarioName = "echo" | "locate-device";

export interface AgUiMockScenario {
  readonly description: string;
  readonly name: AgUiMockScenarioName;
  events(input: RunAgentInput): readonly BaseEvent[];
}

export function textFromLatestUserMessage(input: RunAgentInput): string {
  const message = [...input.messages]
    .reverse()
    .find((candidate) => candidate.role === "user");
  if (message?.role !== "user") return "";
  if (typeof message.content === "string") return message.content;
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function runBoundaryEvents(
  input: RunAgentInput,
  events: readonly BaseEvent[],
): readonly BaseEvent[] {
  return [
    {
      type: EventType.RUN_STARTED,
      runId: input.runId,
      threadId: input.threadId,
    },
    ...events,
    {
      type: EventType.RUN_FINISHED,
      outcome: { type: "success" },
      runId: input.runId,
      threadId: input.threadId,
    },
  ];
}

export function textEvents(
  input: RunAgentInput,
  content: string,
): readonly BaseEvent[] {
  const messageId = `message-${input.runId}`;
  return runBoundaryEvents(input, [
    { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" },
    { type: EventType.TEXT_MESSAGE_CONTENT, delta: content, messageId },
    { type: EventType.TEXT_MESSAGE_END, messageId },
  ]);
}
