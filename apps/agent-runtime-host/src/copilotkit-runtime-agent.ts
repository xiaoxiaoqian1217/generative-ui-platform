import { randomUUID } from "node:crypto";
import { AbstractAgent } from "@ag-ui/client";
import { type BaseEvent, EventType, type RunAgentInput } from "@ag-ui/core";
import { createPresentationResultEvent } from "@generative-ui/ag-ui-adapter";
import type { RuntimeRunResult } from "@generative-ui/runtime-contract";
import { Observable } from "rxjs";
import type { RunOrchestrator } from "./orchestrator.js";

function latestUserMessage(input: RunAgentInput): string | undefined {
  const message = [...input.messages]
    .reverse()
    .find((candidate) => candidate.role === "user");
  if (!message) return undefined;
  if (typeof message.content === "string") return message.content;
  const content = message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
  return content.length === 0 ? undefined : content;
}

function presentationEvent(result: RuntimeRunResult): BaseEvent | undefined {
  if (result.status === "failed" || result.presentation === undefined)
    return undefined;
  if (result.presentation.status === "failed") return undefined;
  return {
    ...createPresentationResultEvent(result.presentation),
    type: EventType.CUSTOM,
  };
}

function runtimeResultEvent(result: RuntimeRunResult): BaseEvent {
  return {
    type: EventType.CUSTOM,
    name: "generative-ui.runtime-run-result",
    value: {
      mappingVersion: "1.0",
      result,
    },
  };
}

function errorEvent(
  result: Extract<RuntimeRunResult, { status: "failed" }>,
): BaseEvent {
  return {
    type: EventType.RUN_ERROR,
    message: result.error?.message ?? "Runtime run failed.",
    code: result.error?.code ?? "RUNTIME_RUN_FAILED",
  };
}

export class CopilotKitRuntimeAgent extends AbstractAgent {
  private readonly runtimeAgentId: string;

  constructor(
    private readonly orchestrator: RunOrchestrator,
    agentId: string,
  ) {
    super({ agentId, description: "Generative UI Platform Runtime Agent" });
    this.runtimeAgentId = agentId;
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((observer) => {
      const controller = new AbortController();
      const message = latestUserMessage(input);
      observer.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      });

      if (!message) {
        observer.next({
          type: EventType.RUN_ERROR,
          message: "CopilotKit run does not contain a user text message.",
          code: "REQUEST_INVALID",
        });
        observer.complete();
        return () => controller.abort();
      }

      void this.orchestrator
        .run(
          {
            protocolVersion: "1.0",
            requestId: randomUUID(),
            threadId: input.threadId,
            runId: input.runId,
            agentId: this.runtimeAgentId,
            message: { role: "user", content: message },
          },
          controller.signal,
        )
        .then((result) => {
          const event = presentationEvent(result);
          if (event) observer.next(event);
          observer.next(runtimeResultEvent(result));
          if (result.status === "failed") {
            observer.next(errorEvent(result));
          } else {
            observer.next({
              type: EventType.RUN_FINISHED,
              threadId: input.threadId,
              runId: input.runId,
            });
          }
          observer.complete();
        })
        .catch(() => {
          observer.next({
            type: EventType.RUN_ERROR,
            message: "Runtime run failed.",
            code: "RUNTIME_RUN_FAILED",
          });
          observer.complete();
        });

      return () => controller.abort();
    });
  }
}
