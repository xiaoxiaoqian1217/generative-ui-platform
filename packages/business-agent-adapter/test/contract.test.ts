import type {
  BusinessAgentResumeActionRequest,
  BusinessAgentRunRequest,
} from "@generative-ui/runtime-contract";
import { describe, expect, it } from "vitest";
import {
  type BusinessAgentAdapter,
  BusinessAgentAdapterRequestError,
  MockBusinessAgentAdapter,
} from "../src/index.js";

const runRequest: BusinessAgentRunRequest = {
  protocolVersion: "1.0",
  requestId: "request-contract-run",
  threadId: "thread-contract",
  runId: "run-contract",
  input: { message: "Query device status" },
};

const resumeRequest: BusinessAgentResumeActionRequest = {
  protocolVersion: "1.0",
  requestId: "request-contract-resume",
  threadId: "thread-contract",
  runId: "run-contract",
  action: {
    actionId: "confirm-patrol-plan",
    actionType: "patrol.confirm",
    surfaceId: "surface-contract",
    approved: true,
  },
};

describe("BusinessAgentAdapter contract", () => {
  it("runs through the stable interface with the Mock adapter", async () => {
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Device is healthy." },
      }),
      resumeAction: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Patrol confirmed." },
      }),
    });

    await expect(adapter.run(runRequest)).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "request-contract-run",
      threadId: "thread-contract",
      runId: "run-contract",
      status: "completed",
      content: { contentType: "markdown", markdown: "Device is healthy." },
    });
  });

  it("resumes an action through the same Mock adapter interface", async () => {
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Run completed." },
      }),
      resumeAction: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Patrol confirmed." },
      }),
    });

    await expect(adapter.resumeAction(resumeRequest)).resolves.toEqual({
      protocolVersion: "1.0",
      requestId: "request-contract-resume",
      threadId: "thread-contract",
      runId: "run-contract",
      status: "completed",
      content: { contentType: "markdown", markdown: "Patrol confirmed." },
    });
  });

  it("rejects a Mock response whose correlation IDs do not match", async () => {
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: "request-from-another-call",
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Wrong response." },
      }),
      resumeAction: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Patrol confirmed." },
      }),
    });

    await expect(adapter.run(runRequest)).resolves.toMatchObject({
      protocolVersion: "1.0",
      requestId: "request-contract-run",
      threadId: "thread-contract",
      runId: "run-contract",
      status: "failed",
      error: {
        code: "BUSINESS_AGENT_PROTOCOL_INVALID",
        retryable: false,
        requestId: "request-contract-run",
        threadId: "thread-contract",
        runId: "run-contract",
        path: "/requestId",
        constraint: "correlation-consistency",
      },
    });
  });

  it("keeps AbortSignal behavior interchangeable in the Mock adapter", async () => {
    let calls = 0;
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async (request) => {
        calls += 1;
        return {
          protocolVersion: request.protocolVersion,
          requestId: request.requestId,
          threadId: request.threadId,
          runId: request.runId,
          status: "completed",
          content: { contentType: "markdown", markdown: "Too late." },
        };
      },
      resumeAction: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Patrol confirmed." },
      }),
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      adapter.run(runRequest, { signal: controller.signal }),
    ).resolves.toMatchObject({
      status: "failed",
      error: { code: "REQUEST_CANCELLED", retryable: false },
    });
    expect(calls).toBe(0);
  });

  it("cancels a running Mock handler even when the handler ignores the signal", async () => {
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async () => new Promise(() => undefined),
      resumeAction: async () => new Promise(() => undefined),
    });
    const controller = new AbortController();

    const invocation = adapter.run(runRequest, { signal: controller.signal });
    controller.abort();

    await expect(invocation).resolves.toMatchObject({
      status: "failed",
      error: { code: "REQUEST_CANCELLED", retryable: false },
    });
  });

  it("observes a Mock rejection that races with cancellation", async () => {
    const controller = new AbortController();
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async () => {
        controller.abort();
        throw new Error("failure after cancellation");
      },
      resumeAction: async () => new Promise(() => undefined),
    });

    await expect(
      adapter.run(runRequest, { signal: controller.signal }),
    ).resolves.toMatchObject({
      status: "failed",
      error: { code: "REQUEST_CANCELLED", retryable: false },
    });
  });

  it("rejects an uncorrelatable request with a stable boundary error", async () => {
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async () => new Promise(() => undefined),
      resumeAction: async () => new Promise(() => undefined),
    });

    const invocation = adapter.run({ ...runRequest, requestId: "" });

    await expect(invocation).rejects.toMatchObject({
      name: BusinessAgentAdapterRequestError.name,
      error: {
        code: "REQUEST_INVALID",
        retryable: false,
        path: "/requestId",
        constraint: "minimum-length",
      },
    });
  });

  it("rejects a non-object request without leaking a native TypeError", async () => {
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async () => new Promise(() => undefined),
      resumeAction: async () => new Promise(() => undefined),
    });

    const invocation = adapter.run(null as unknown as BusinessAgentRunRequest);

    await expect(invocation).rejects.toMatchObject({
      name: BusinessAgentAdapterRequestError.name,
      error: { code: "REQUEST_INVALID", retryable: false },
    });
  });

  it("normalizes a Mock implementation failure without leaking its error", async () => {
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async () => {
        throw new Error("sensitive mock implementation detail");
      },
      resumeAction: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Patrol confirmed." },
      }),
    });

    const result = await adapter.run(runRequest);
    expect(result).toMatchObject({
      status: "failed",
      error: { code: "BUSINESS_AGENT_ERROR", retryable: false },
    });
    expect(JSON.stringify(result)).not.toContain("sensitive mock");
  });

  it("rejects mismatched correlation nested inside an Agent error", async () => {
    const adapter: BusinessAgentAdapter = new MockBusinessAgentAdapter({
      run: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "failed",
        error: {
          code: "BUSINESS_AGENT_ERROR",
          message: "Agent failed.",
          retryable: false,
          requestId: "request-from-another-call",
          threadId: request.threadId,
          runId: request.runId,
        },
      }),
      resumeAction: async (request) => ({
        protocolVersion: request.protocolVersion,
        requestId: request.requestId,
        threadId: request.threadId,
        runId: request.runId,
        status: "completed",
        content: { contentType: "markdown", markdown: "Patrol confirmed." },
      }),
    });

    await expect(adapter.run(runRequest)).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "BUSINESS_AGENT_PROTOCOL_INVALID",
        path: "/error/requestId",
        constraint: "correlation-consistency",
      },
    });
  });
});
