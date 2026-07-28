import type { UICompileRequest } from "@generative-ui/compiler-contract";
import type { PresentationResult } from "@generative-ui/presentation-contract";
import type {
  AGUICompileRequest,
  AGUIEvent,
  AGUIRequestContext,
  PresentationResultCustomEvent,
} from "../src/index.js";

const wireRequest: AGUICompileRequest = {
  requestId: "request-16",
  compileRequest: {
    plan: {
      version: "1.0",
      scenario: "summary",
      regions: [
        {
          regionId: "summary",
          purpose: "Summarize the total.",
          bindings: [{ sourcePointer: "/total", role: "content" }],
          componentPreferences: [{ componentType: "Card" }],
          layout: {
            flow: "vertical",
            density: "comfortable",
          },
        },
      ],
    },
    sourceKind: "structured-data",
    sourceData: {
      total: 42,
    },
    fallbackMarkdown: "Total: 42",
    catalog: {
      catalogId: "base",
      catalogVersion: "1.0.0",
    },
  },
};

const context: AGUIRequestContext = {
  requestId: "request-16",
  threadId: "thread-16",
  runId: "run-16",
};

const result: PresentationResult = {
  requestId: "request-16",
  status: "completed",
  mode: "markdown",
  markdown: "Ready.",
};

const event: PresentationResultCustomEvent = {
  type: "CUSTOM",
  name: "generative-ui.presentation-result",
  value: {
    mappingVersion: "1.0",
    result,
  },
};

const lifecycleEvent: AGUIEvent = {
  type: "RUN_STARTED",
  threadId: context.threadId,
  runId: context.runId,
};

declare const request: UICompileRequest;

// @ts-expect-error Mapping versions are contract literals.
event.value.mappingVersion = "2.0";

// @ts-expect-error AG-UI request contexts require all normalized identifiers.
const incompleteContext: AGUIRequestContext = {
  requestId: "request-16",
  threadId: "thread-16",
};

void context;
void event;
void incompleteContext;
void lifecycleEvent;
void request;
void wireRequest;
