import type { JsonValue } from "@generative-ui/shared-types";
import { Ajv } from "ajv";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type AgentContent,
  agentContentSchema,
  type PresentationDecision,
  presentationDecisionSchema,
  presentationRequestSchema,
  presentationResultSchema,
  type UIPlan,
  uiPlanSchema,
  validateAgentContent,
  validatePresentationDecision,
  validatePresentationRequest,
  validatePresentationResult,
  validateUIPlan,
} from "../src/index.js";
import {
  formLoweredUIIRExample,
  formPlanExample,
  summaryLoweredUIIRExample,
  summaryPlanExample,
} from "./fixtures/lowering-examples.js";

const markdownContent = {
  contentType: "markdown",
  markdown: "# Safe content",
} as const;

const structuredContent = {
  contentType: "structured-data",
  data: {
    status: "ready",
    totals: [3, 5, 8],
  },
  fallbackMarkdown: "Status: ready",
} as const;

const presentationRequest = {
  requestId: "request-14",
  content: structuredContent,
  context: {
    userMessage: "Show me a summary.",
    locale: "en-US",
    viewport: {
      width: 1280,
      height: 720,
    },
    domain: "accounts",
  },
  catalog: {
    catalogId: "default",
    catalogVersion: "1.0.0",
  },
} as const;

const summaryRegionExample = summaryPlanExample.regions[0];
const formRegionExample = formPlanExample.regions[0];
const formActionExample = formRegionExample?.actions[0];

if (!summaryRegionExample || !formRegionExample || !formActionExample) {
  throw new Error("Lowering fixtures must contain their required examples.");
}

describe("AgentContent", () => {
  it.each([markdownContent, structuredContent])(
    "accepts the %s branch",
    (content) => {
      expect(validateAgentContent(content)).toEqual({
        success: true,
        value: content,
      });
    },
  );

  it.each([
    {
      contentType: "markdown",
      markdown: "# Content",
      data: {},
    },
    {
      contentType: "structured-data",
      data: {},
      markdown: "# Content",
    },
    {
      contentType: "markdown",
      markdown: "",
    },
  ])("rejects an illegal branch shape", (content) => {
    expect(validateAgentContent(content)).toMatchObject({
      success: false,
      error: {
        code: "PRESENTATION_REQUEST_INVALID",
      },
    });
  });

  it("derives the public type from the discriminated schema", () => {
    expectTypeOf<AgentContent>().toEqualTypeOf<
      | {
          contentType: "markdown";
          markdown: string;
        }
      | {
          contentType: "structured-data";
          data: JsonValue;
          fallbackMarkdown?: string;
        }
    >();
  });
});

describe("PresentationRequest", () => {
  it("accepts Markdown or structured Agent content with optional context", () => {
    expect(validatePresentationRequest(presentationRequest)).toEqual({
      success: true,
      value: presentationRequest,
    });
  });

  it("reports a stable error without exposing validator messages", () => {
    const result = validatePresentationRequest({
      ...presentationRequest,
      unexpected: "field",
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "PRESENTATION_REQUEST_INVALID",
        path: "",
        constraint: "additional-properties",
        message: "Presentation Request does not match its contract.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("must NOT have");
  });
});

describe("UI Plan Candidate", () => {
  it.each([summaryPlanExample, formPlanExample])(
    "accepts semantic summary and form plans",
    (plan) => {
      expect(validateUIPlan(plan)).toEqual({
        success: true,
        value: plan,
      });
    },
  );

  it.each([
    {
      ...summaryPlanExample,
      componentTree: [],
    },
    {
      ...summaryPlanExample,
      dom: {
        nodeType: 1,
      },
    },
    {
      ...summaryPlanExample,
      providerResponse: {
        choices: [],
      },
    },
    {
      ...summaryPlanExample,
      code: "return <Card />",
    },
    {
      ...formPlanExample,
      regions: [
        {
          ...formRegionExample,
          actions: [
            {
              ...formActionExample,
              payload: {
                code: "return <Card />",
              },
            },
          ],
        },
      ],
    },
    {
      ...formPlanExample,
      regions: [
        {
          ...formRegionExample,
          actions: [
            {
              ...formActionExample,
              payload: {
                dom: {
                  nodeType: 1,
                },
              },
            },
          ],
        },
      ],
    },
    {
      ...formPlanExample,
      regions: [
        {
          ...formRegionExample,
          actions: [
            {
              ...formActionExample,
              payload: {
                componentInstance: {
                  props: {},
                },
              },
            },
          ],
        },
      ],
    },
    {
      ...formPlanExample,
      regions: [
        {
          ...formRegionExample,
          actions: [
            {
              ...formActionExample,
              payload: {
                providerResponse: {
                  choices: [],
                },
              },
            },
          ],
        },
      ],
    },
  ])("rejects final UI or executable representations", (plan) => {
    expect(validateUIPlan(plan)).toMatchObject({
      success: false,
      error: {
        code: "UI_PLAN_INVALID",
      },
    });
  });

  it("accepts business data named code when it is an explicit literal", () => {
    const plan = {
      ...formPlanExample,
      regions: [
        {
          ...formRegionExample,
          actions: [
            {
              ...formActionExample,
              payload: {
                code: {
                  kind: "literal",
                  value: "PROMO-14",
                },
              },
            },
          ],
        },
      ],
    } as const;

    expect(validateUIPlan(plan)).toEqual({
      success: true,
      value: plan,
    });
  });

  it.each([
    {
      object: "chat.completion",
      model: "provider-model",
      choices: [],
    },
    {
      tagName: "button",
      attributes: {},
      children: [],
    },
    {
      type: "Card",
      props: {},
    },
    {
      handler: "alert(1)",
    },
    {
      "provider.response": {
        object: "chat.completion",
        choices: [],
      },
    },
    {
      $raw: {
        handler: "alert(1)",
      },
    },
  ])("rejects opaque implementation payloads", (payload) => {
    const plan = {
      ...formPlanExample,
      regions: [
        {
          ...formRegionExample,
          actions: [
            {
              ...formActionExample,
              payload,
            },
          ],
        },
      ],
    };

    expect(validateUIPlan(plan)).toMatchObject({
      success: false,
      error: {
        code: "UI_PLAN_INVALID",
      },
    });
  });

  it("keeps Candidate examples structurally distinct from lowered UI IR", () => {
    for (const [plan, ir] of [
      [summaryPlanExample, summaryLoweredUIIRExample],
      [formPlanExample, formLoweredUIIRExample],
    ] as const) {
      expect(plan.regions[0]).not.toHaveProperty("componentId");
      expect(plan.regions[0]).not.toHaveProperty("props");
      expect(plan.regions[0]).not.toHaveProperty("children");
      expect(ir.components[0]).toHaveProperty("componentId");
      expect(ir.components[0]).toHaveProperty("props");
      expect(ir.components[0]).toHaveProperty("children");
    }
  });

  it.each([
    {
      ...summaryPlanExample,
      regions: [summaryPlanExample.regions[0], summaryPlanExample.regions[0]],
    },
    {
      ...formPlanExample,
      regions: [
        {
          ...formPlanExample.regions[0],
          actions: [
            {
              ...formActionExample,
              targetRegionId: "missing-region",
            },
          ],
        },
      ],
    },
    {
      ...summaryPlanExample,
      regions: [
        {
          ...summaryPlanExample.regions[0],
          layout: {
            ...summaryRegionExample.layout,
            minColumns: 3,
            maxColumns: 2,
          },
        },
      ],
    },
  ])("rejects inconsistent Candidate references and constraints", (plan) => {
    expect(validateUIPlan(plan)).toMatchObject({
      success: false,
      error: {
        code: "UI_PLAN_INVALID",
      },
    });
  });
});

describe("PresentationDecision", () => {
  const markdownDecision = {
    mode: "markdown",
    reason: "The content is already readable.",
  } as const;
  const generativeDecision = {
    mode: "generative-ui",
    reason: "A form supports the requested interaction.",
    plan: formPlanExample,
  } as const;

  it.each([markdownDecision, generativeDecision])(
    "accepts valid discriminated branches",
    (decision) => {
      expect(validatePresentationDecision(decision)).toEqual({
        success: true,
        value: decision,
      });
    },
  );

  it.each([
    {
      ...markdownDecision,
      plan: summaryPlanExample,
    },
    {
      mode: "generative-ui",
      reason: "Missing plan",
    },
  ])("rejects illegal field combinations", (decision) => {
    expect(validatePresentationDecision(decision)).toMatchObject({
      success: false,
      error: {
        code: "PRESENTATION_DECISION_INVALID",
      },
    });
  });

  it("narrows the inferred union by mode", () => {
    const decision: PresentationDecision = generativeDecision;

    if (decision.mode === "generative-ui") {
      expectTypeOf(decision.plan).toEqualTypeOf<UIPlan>();
    }
  });
});

describe("PresentationResult", () => {
  const error = {
    code: "UI_PLAN_INVALID",
    message: "The UI plan was rejected.",
    stage: "ui-plan-validation",
    retryable: false,
  } as const;

  const validResults = [
    {
      requestId: "request-1",
      status: "completed",
      mode: "markdown",
      markdown: "# Result",
    },
    {
      requestId: "request-2",
      status: "completed",
      mode: "generative-ui",
      surfaceId: "surface-2",
      operations: [
        {
          version: "v0.9",
          createSurface: {
            surfaceId: "surface-2",
          },
        },
      ],
    },
    {
      requestId: "request-3",
      status: "degraded",
      mode: "markdown",
      markdown: "# Fallback",
      errors: [error],
    },
    {
      requestId: "request-4",
      status: "failed",
      errors: [error],
    },
  ] as const;

  it.each(validResults)("accepts each legal result branch", (result) => {
    expect(validatePresentationResult(result)).toEqual({
      success: true,
      value: result,
    });
  });

  it.each([
    {
      ...validResults[0],
      operations: [],
    },
    {
      ...validResults[1],
      markdown: "# Illegal",
    },
    {
      ...validResults[2],
      surfaceId: "surface-3",
    },
    {
      ...validResults[3],
      markdown: "# Illegal",
    },
    {
      ...validResults[1],
      operations: [null],
    },
    {
      ...validResults[1],
      operations: [42],
    },
  ])("rejects illegal field combinations", (result) => {
    expect(validatePresentationResult(result)).toMatchObject({
      success: false,
      error: {
        code: "PRESENTATION_RESULT_INVALID",
      },
    });
  });
});

describe("serialized schemas", () => {
  it.each([
    agentContentSchema,
    presentationRequestSchema,
    uiPlanSchema,
    presentationDecisionSchema,
    presentationResultSchema,
  ])("is valid Draft 7 JSON Schema with a stable identifier", (schema) => {
    const ajv = new Ajv({
      strict: true,
      validateSchema: true,
    });

    expect(schema.$id).toMatch(/^https:\/\/generative-ui\.dev\/schemas\//);
    expect(ajv.validateSchema(JSON.parse(JSON.stringify(schema)))).toBe(true);
  });
});
