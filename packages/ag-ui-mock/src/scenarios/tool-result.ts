import type { AGUIEvent, AGUIRunAgentInput } from "@copilotkit/aimock/agui";

interface CompletedMapOperationResult {
  readonly affectedFeatureIds?: string[];
  readonly affectedLayerIds?: string[];
  readonly status: "completed";
}

export interface MapOperationExpectation {
  readonly affectedFeatureIds?: readonly string[];
  readonly affectedLayerIds?: readonly string[];
}

function sameIds(actual: unknown, expected: readonly string[] | undefined) {
  if (expected === undefined) return actual === undefined;
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((id, index) => id === expected[index])
  );
}

export function hasCompletedToolResult(
  input: AGUIRunAgentInput,
  toolName: string,
  expected: MapOperationExpectation,
): boolean {
  const messages = input.messages ?? [];
  const resultMessage = messages.at(-1);
  if (
    resultMessage?.role !== "tool" ||
    typeof resultMessage.content !== "string" ||
    typeof resultMessage.toolCallId !== "string"
  )
    return false;

  const toolCall = [...messages]
    .reverse()
    .flatMap((message) => message.toolCalls ?? [])
    .find((candidate) => candidate.id === resultMessage.toolCallId);
  if (toolCall?.function.name !== toolName) return false;

  try {
    const result = JSON.parse(
      resultMessage.content,
    ) as CompletedMapOperationResult;
    return (
      result.status === "completed" &&
      sameIds(result.affectedFeatureIds, expected.affectedFeatureIds) &&
      sameIds(result.affectedLayerIds, expected.affectedLayerIds)
    );
  } catch {
    return false;
  }
}

export function completedMapOperationResult(
  expectation: MapOperationExpectation,
): CompletedMapOperationResult {
  return {
    ...(expectation.affectedFeatureIds === undefined
      ? {}
      : { affectedFeatureIds: [...expectation.affectedFeatureIds] }),
    ...(expectation.affectedLayerIds === undefined
      ? {}
      : { affectedLayerIds: [...expectation.affectedLayerIds] }),
    status: "completed",
  };
}

export function acknowledgeToolResult(
  responseEvents: readonly AGUIEvent[],
  toolCallEvents: readonly AGUIEvent[],
  result: CompletedMapOperationResult,
): AGUIEvent[] {
  return acknowledgeToolResultContent(
    responseEvents,
    toolCallEvents,
    JSON.stringify(result),
  );
}

export function acknowledgeToolResultContent(
  responseEvents: readonly AGUIEvent[],
  toolCallEvents: readonly AGUIEvent[],
  content: string,
): AGUIEvent[] {
  const toolCallStart = toolCallEvents.find(
    (event) => event.type === "TOOL_CALL_START",
  );
  if (toolCallStart?.type !== "TOOL_CALL_START")
    throw new Error("AG_UI_MOCK_TOOL_CALL_START_MISSING");

  const [runStarted, ...remainingEvents] = responseEvents;
  if (runStarted?.type !== "RUN_STARTED")
    throw new Error("AG_UI_MOCK_RUN_STARTED_MISSING");

  return [
    runStarted,
    {
      content,
      messageId: `result-${toolCallStart.toolCallId}`,
      role: "tool",
      toolCallId: toolCallStart.toolCallId,
      type: "TOOL_CALL_RESULT",
    },
    ...remainingEvents,
  ];
}
