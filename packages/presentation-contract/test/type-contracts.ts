import type {
  AgentContent,
  PresentationDecision,
  PresentationResult,
  UIPlan,
} from "../src/index.js";

const markdownContent: AgentContent = {
  contentType: "markdown",
  markdown: "# Content",
};

const summaryPlan: UIPlan = {
  version: "1.0",
  scenario: "summary",
  regions: [
    {
      regionId: "summary",
      purpose: "Summarize data.",
      bindings: [],
      componentPreferences: [
        {
          componentType: "Card",
        },
      ],
      layout: {
        flow: "vertical",
        density: "comfortable",
      },
    },
  ],
};

const decision: PresentationDecision = {
  mode: "generative-ui",
  reason: "A summary is useful.",
  plan: summaryPlan,
};

const result: PresentationResult = {
  requestId: "request-1",
  status: "completed",
  mode: "markdown",
  markdown: "# Result",
};

void markdownContent;
void decision;
void result;

const invalidContent: AgentContent = {
  contentType: "markdown",
  markdown: "# Content",
  // @ts-expect-error Markdown AgentContent cannot carry structured data.
  data: {},
};

const invalidDecision: PresentationDecision = {
  mode: "markdown",
  reason: "Markdown is enough.",
  // @ts-expect-error Markdown decisions cannot carry a UI Plan.
  plan: summaryPlan,
};

const invalidPlan: UIPlan = {
  ...summaryPlan,
  // @ts-expect-error UI Plan Candidate cannot contain a final component tree.
  componentTree: [],
};

const invalidResult: PresentationResult = {
  requestId: "request-1",
  status: "completed",
  mode: "markdown",
  markdown: "# Result",
  // @ts-expect-error Completed Markdown results cannot carry Operations.
  operations: [],
};

void invalidContent;
void invalidDecision;
void invalidPlan;
void invalidResult;
