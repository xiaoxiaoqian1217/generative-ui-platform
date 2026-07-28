import { validateUICompileRequest } from "@generative-ui/compiler-contract";
import type {
  PresentationError,
  PresentationResult,
} from "@generative-ui/presentation-contract";
import { describe, expect, it, vi } from "vitest";
import {
  type AGUIEventSequence,
  agUICompileRequestBodySchema,
  agUICompileRequestSchema,
  agUIEventSchema,
  agUIEventSequenceSchema,
  agUIRequestContextSchema,
  agUIRequestCorrelationSchema,
  consumablePresentationResultSchema,
  createPresentationErrorEvent,
  createPresentationResultEvent,
  createRunErrorEvent,
  createRunFinishedEvent,
  createRunStartedEvent,
  createStepFinishedEvent,
  createStepStartedEvent,
  mapPresentationResultToCustomEvent,
  parseAGUICompileRequest,
  parsedAGUICompileRequestSchema,
  presentationErrorCustomEventSchema,
  presentationErrorPayloadSchema,
  presentationResultCustomEventSchema,
  presentationResultPayloadSchema,
  runErrorEventSchema,
  runFinishedEventSchema,
  runStartedEventSchema,
  stepFinishedEventSchema,
  stepStartedEventSchema,
  validateAGUICompileRequest,
  validateAGUIEvent,
  validateAGUIEventSequence,
} from "../src/index.js";

const validCompileRequest = {
  requestId: "request-16",
  threadId: "thread-16",
  runId: "run-16",
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
} as const;

const {
  requestId: validRequestId,
  threadId: validThreadId,
  runId: validRunId,
  ...validCompileRequestBody
} = validCompileRequest;

const validAGUICompileRequest = {
  requestId: validRequestId,
  threadId: validThreadId,
  runId: validRunId,
  compileRequest: validCompileRequestBody,
} as const;

const requestContext = {
  requestId: "request-16",
  threadId: "thread-16",
  runId: "run-16",
} as const;

const presentationError: PresentationError = {
  code: "COMPILATION_FAILED",
  message: "The presentation could not be compiled.",
  stage: "ui-compilation",
  retryable: false,
};

const completedMarkdownResult: PresentationResult = {
  requestId: "request-16",
  status: "completed",
  mode: "markdown",
  markdown: "Total: 42",
};

const degradedMarkdownResult: PresentationResult = {
  requestId: "request-16",
  status: "degraded",
  mode: "markdown",
  markdown: "Total: 42",
  errors: [presentationError],
};

const failedResult: PresentationResult = {
  requestId: "request-16",
  status: "failed",
  errors: [presentationError],
};

describe("AG-UI compile request parsing", () => {
  it("preserves caller identifiers and returns one request context", () => {
    const identifierFactory = vi.fn(() => "unused");
    const result = parseAGUICompileRequest(
      validAGUICompileRequest,
      identifierFactory,
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.value.context).toEqual(requestContext);
    expect(result.value.request).toEqual(validCompileRequest);
    expect(identifierFactory).not.toHaveBeenCalled();
    expect(validateAGUICompileRequest(validAGUICompileRequest).success).toBe(
      true,
    );
    expect(validateUICompileRequest(result.value.request).success).toBe(true);
  });

  it("generates every missing identifier once and reuses it in the request context", () => {
    const requestWithoutIdentifiers = {
      compileRequest: validCompileRequestBody,
    };
    const identifierFactory = vi.fn(
      (kind: "requestId" | "threadId" | "runId") => `generated-${kind}`,
    );

    const result = parseAGUICompileRequest(
      requestWithoutIdentifiers,
      identifierFactory,
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.value.context).toEqual({
      requestId: "generated-requestId",
      threadId: "generated-threadId",
      runId: "generated-runId",
    });
    expect(result.value.request).toMatchObject(result.value.context);
    expect(identifierFactory.mock.calls).toEqual([
      ["requestId"],
      ["threadId"],
      ["runId"],
    ]);
    expect(validateUICompileRequest(result.value.request).success).toBe(true);
  });

  it("generates only a missing run identifier", () => {
    const { runId: _runId, ...requestWithoutRunId } = validAGUICompileRequest;
    const identifierFactory = vi.fn(() => "generated-run");

    const result = parseAGUICompileRequest(
      requestWithoutRunId,
      identifierFactory,
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.value.context).toEqual({
      requestId: "request-16",
      threadId: "thread-16",
      runId: "generated-run",
    });
    expect(identifierFactory).toHaveBeenCalledExactlyOnceWith("runId");
  });

  it.each([
    {
      name: "non-object input",
      input: null,
      expectedPath: "",
      expectedConstraint: "object",
    },
    {
      name: "an empty caller identifier",
      input: { ...validAGUICompileRequest, threadId: "" },
      expectedPath: "/threadId",
      expectedConstraint: "minimum-length",
    },
    {
      name: "an invalid compile request",
      input: {
        ...validAGUICompileRequest,
        compileRequest: {
          ...validCompileRequestBody,
          sourceData: undefined,
        },
      },
      expectedPath: "/compileRequest",
      expectedConstraint: "required",
    },
  ])(
    "rejects $name with a stable request error",
    ({ input, expectedPath, expectedConstraint }) => {
      const result = parseAGUICompileRequest(input);

      expect(result).toEqual({
        success: false,
        error: {
          code: "AG_UI_REQUEST_INVALID",
          path: expectedPath,
          constraint: expectedConstraint,
          message: "AG-UI compile request does not match its contract.",
        },
      });
    },
  );

  it.each([
    {
      name: "returns an empty identifier",
      identifierFactory: () => "",
      expectedConstraint: "non-empty-generated-identifier",
    },
    {
      name: "throws",
      identifierFactory: () => {
        throw new Error("private generator failure");
      },
      expectedConstraint: "identifier-generation",
    },
  ])(
    "normalizes a factory that $name to a safe stable error",
    ({ identifierFactory, expectedConstraint }) => {
      const { requestId: _requestId, ...requestWithoutRequestId } =
        validAGUICompileRequest;
      const result = parseAGUICompileRequest(
        requestWithoutRequestId,
        identifierFactory,
      );

      expect(result).toEqual({
        success: false,
        error: {
          code: "AG_UI_IDENTIFIER_GENERATION_FAILED",
          path: "/requestId",
          constraint: expectedConstraint,
          message: "AG-UI compile request does not match its contract.",
        },
      });
    },
  );
});

describe("AG-UI event mapping", () => {
  it("maps a completed result to one versioned result event and RUN_FINISHED", () => {
    const mappedEvent = mapPresentationResultToCustomEvent(
      requestContext,
      completedMarkdownResult,
    );
    expect(mappedEvent.success).toBe(true);
    if (!mappedEvent.success) {
      return;
    }
    const events: AGUIEventSequence = [
      createRunStartedEvent(requestContext),
      mappedEvent.value,
      createRunFinishedEvent(requestContext),
    ];

    expect(events).toEqual([
      {
        type: "RUN_STARTED",
        threadId: "thread-16",
        runId: "run-16",
      },
      {
        type: "CUSTOM",
        name: "generative-ui.presentation-result",
        value: {
          mappingVersion: "1.0",
          result: completedMarkdownResult,
        },
      },
      {
        type: "RUN_FINISHED",
        threadId: "thread-16",
        runId: "run-16",
      },
    ]);
    expect(validateAGUIEventSequence(events, requestContext).success).toBe(
      true,
    );
  });

  it("maps a degraded result to a consumable result and RUN_FINISHED", () => {
    const mappedEvent = mapPresentationResultToCustomEvent(
      requestContext,
      degradedMarkdownResult,
    );
    expect(mappedEvent.success).toBe(true);
    if (!mappedEvent.success) {
      return;
    }
    const events: AGUIEventSequence = [
      createRunStartedEvent(requestContext),
      mappedEvent.value,
      createRunFinishedEvent(requestContext),
    ];

    expect(events[1]).toEqual(
      createPresentationResultEvent(degradedMarkdownResult),
    );
    expect(events.at(-1)?.type).toBe("RUN_FINISHED");
    expect(events.some((event) => event.type === "RUN_ERROR")).toBe(false);
    expect(validateAGUIEventSequence(events, requestContext).success).toBe(
      true,
    );
  });

  it("maps a failed result to an error event followed by RUN_ERROR", () => {
    const mappedEvent = mapPresentationResultToCustomEvent(
      requestContext,
      failedResult,
    );
    expect(mappedEvent.success).toBe(true);
    if (!mappedEvent.success) {
      return;
    }
    const events: AGUIEventSequence = [
      createRunStartedEvent(requestContext),
      mappedEvent.value,
      createRunErrorEvent(presentationError),
    ];

    expect(events).toEqual([
      createRunStartedEvent(requestContext),
      createPresentationErrorEvent([presentationError]),
      createRunErrorEvent(presentationError),
    ]);
    expect(events[1]).toMatchObject({
      type: "CUSTOM",
      name: "generative-ui.presentation-error",
      value: {
        mappingVersion: "1.0",
      },
    });
    expect(events.at(-1)?.type).toBe("RUN_ERROR");
    expect(events.some((event) => event.type === "RUN_FINISHED")).toBe(false);
    expect(validateAGUIEventSequence(events, requestContext).success).toBe(
      true,
    );
  });

  it("creates minimal standard lifecycle and paired step events", () => {
    const events: AGUIEventSequence = [
      createRunStartedEvent(requestContext),
      createStepStartedEvent("presentation-routing"),
      createStepFinishedEvent("presentation-routing"),
      createPresentationResultEvent(completedMarkdownResult),
      createRunFinishedEvent(requestContext),
    ];

    expect(validateAGUIEventSequence(events, requestContext).success).toBe(
      true,
    );
    for (const event of events) {
      expect(validateAGUIEvent(event).success).toBe(true);
    }
  });

  it("does not expose a failed result through the result event contract", () => {
    const invalidEvent = {
      type: "CUSTOM",
      name: "generative-ui.presentation-result",
      value: {
        mappingVersion: "1.0",
        result: failedResult,
      },
    };

    expect(validateAGUIEvent(invalidEvent).success).toBe(false);
    expect(
      validateAGUIEventSequence([
        createRunStartedEvent(requestContext),
        invalidEvent,
        createRunFinishedEvent(requestContext),
      ]).success,
    ).toBe(false);
  });

  it("rejects a result that does not reuse the request identifier", () => {
    const result = mapPresentationResultToCustomEvent(requestContext, {
      ...completedMarkdownResult,
      requestId: "other-request",
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "AG_UI_REQUEST_ID_MISMATCH",
        path: "/requestId",
        constraint: "request-correlation-consistency",
        message:
          "Presentation Result cannot be mapped to an AG-UI CustomEvent.",
      },
    });
  });

  it("rejects an empty failed result without throwing or emitting an invalid event", () => {
    const result = mapPresentationResultToCustomEvent(requestContext, {
      requestId: "request-16",
      status: "failed",
      errors: [],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error).toMatchObject({
      code: "AG_UI_PRESENTATION_RESULT_INVALID",
    });
  });

  it.each([
    {
      name: "a wrong mapping version",
      event: {
        ...createPresentationResultEvent(completedMarkdownResult),
        value: {
          mappingVersion: "2.0",
          result: completedMarkdownResult,
        },
      },
    },
    {
      name: "an empty run identifier",
      event: {
        ...createRunStartedEvent(requestContext),
        runId: "",
      },
    },
    {
      name: "an unknown lifecycle event",
      event: {
        type: "RUN_CANCELLED",
      },
    },
  ])("rejects $name", ({ event }) => {
    const result = validateAGUIEvent(event);

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error.code).toBe("AG_UI_EVENT_INVALID");
  });
});

describe("AG-UI event sequence invariants", () => {
  const resultEvent = createPresentationResultEvent(completedMarkdownResult);
  const errorEvent = createPresentationErrorEvent([presentationError]);

  it.each([
    {
      name: "RUN_STARTED is not first",
      events: [
        resultEvent,
        createRunStartedEvent(requestContext),
        createRunFinishedEvent(requestContext),
      ],
      constraint: "run-started-first",
    },
    {
      name: "terminal correlation differs",
      events: [
        createRunStartedEvent(requestContext),
        resultEvent,
        createRunFinishedEvent({
          ...requestContext,
          runId: "other-run",
        }),
      ],
      constraint: "run-correlation-consistency",
    },
    {
      name: "RUN_ERROR follows a result event",
      events: [
        createRunStartedEvent(requestContext),
        resultEvent,
        createRunErrorEvent(presentationError),
      ],
      constraint: "error-before-run-error",
    },
    {
      name: "RUN_FINISHED follows an error event",
      events: [
        createRunStartedEvent(requestContext),
        errorEvent,
        createRunFinishedEvent(requestContext),
      ],
      constraint: "result-before-run-finished",
    },
    {
      name: "two terminal events are emitted",
      events: [
        createRunStartedEvent(requestContext),
        resultEvent,
        createRunFinishedEvent(requestContext),
        createRunErrorEvent(presentationError),
      ],
      constraint: "terminal-event-last",
    },
    {
      name: "step names do not pair",
      events: [
        createRunStartedEvent(requestContext),
        createStepStartedEvent("presentation-routing"),
        createStepFinishedEvent("ui-compilation"),
        resultEvent,
        createRunFinishedEvent(requestContext),
      ],
      constraint: "step-pair-order",
    },
    {
      name: "a step is left open",
      events: [
        createRunStartedEvent(requestContext),
        createStepStartedEvent("presentation-routing"),
        resultEvent,
        createRunFinishedEvent(requestContext),
      ],
      constraint: "step-finished-required",
    },
  ])("rejects a sequence where $name", ({ events, constraint }) => {
    const result = validateAGUIEventSequence(events);

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error).toMatchObject({
      code: "AG_UI_EVENT_SEQUENCE_INVALID",
      constraint,
    });
  });
});

describe("public runtime schemas", () => {
  it("publishes stable versioned schema identifiers", () => {
    const schemas = [
      agUIRequestContextSchema,
      agUIRequestCorrelationSchema,
      agUICompileRequestBodySchema,
      agUICompileRequestSchema,
      parsedAGUICompileRequestSchema,
      runStartedEventSchema,
      runFinishedEventSchema,
      runErrorEventSchema,
      stepStartedEventSchema,
      stepFinishedEventSchema,
      consumablePresentationResultSchema,
      presentationResultPayloadSchema,
      presentationErrorPayloadSchema,
      presentationResultCustomEventSchema,
      presentationErrorCustomEventSchema,
      agUIEventSchema,
      agUIEventSequenceSchema,
    ];

    expect(schemas.map((schema) => schema.$id)).toEqual([
      "https://generative-ui.dev/schemas/ag-ui/request-context/1.0",
      "https://generative-ui.dev/schemas/ag-ui/request-correlation/1.0",
      "https://generative-ui.dev/schemas/ag-ui/compile-request-body/1.0",
      "https://generative-ui.dev/schemas/ag-ui/compile-request/1.0",
      "https://generative-ui.dev/schemas/ag-ui/parsed-compile-request/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event/run-started/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event/run-finished/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event/run-error/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event/step-started/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event/step-finished/1.0",
      "https://generative-ui.dev/schemas/ag-ui/consumable-presentation-result/1.0",
      "https://generative-ui.dev/schemas/ag-ui/payload/presentation-result/1.0",
      "https://generative-ui.dev/schemas/ag-ui/payload/presentation-error/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event/presentation-result/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event/presentation-error/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event/1.0",
      "https://generative-ui.dev/schemas/ag-ui/event-sequence/1.0",
    ]);
    for (const schema of schemas) {
      expect(() => JSON.stringify(schema)).not.toThrow();
    }
  });
});
