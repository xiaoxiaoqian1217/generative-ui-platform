import type {
  RunErrorEvent,
  RunFinishedEvent,
  RunStartedEvent,
} from "@ag-ui/core";
import { EventType } from "@ag-ui/core";

export interface AGUIRunContext {
  readonly runId: string;
  readonly threadId: string;
}

export function createRunStartedEvent(
  context: AGUIRunContext,
): RunStartedEvent {
  return {
    type: EventType.RUN_STARTED,
    threadId: context.threadId,
    runId: context.runId,
  };
}

export function createRunFinishedEvent(
  context: AGUIRunContext,
): RunFinishedEvent {
  return {
    type: EventType.RUN_FINISHED,
    threadId: context.threadId,
    runId: context.runId,
  };
}

export function createRunErrorEvent(
  message: string,
  code?: string,
): RunErrorEvent {
  return {
    type: EventType.RUN_ERROR,
    message,
    ...(code === undefined ? {} : { code }),
  };
}
