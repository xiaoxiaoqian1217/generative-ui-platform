import type { RuntimeActionRequest, RuntimeRunRequest } from "@generative-ui/runtime-contract";
import { describe, expect, it, vi } from "vitest";
import { createHttpRuntimeClient } from "../../src/runtime/http-runtime-client.js";

const request: RuntimeRunRequest = {
  protocolVersion: "1.0",
  requestId: "request-1",
  message: {
    role: "user",
    content: "展示 Markdown",
  },
};

const completedResult = {
  protocolVersion: "1.0",
  requestId: "request-1",
  threadId: "thread-1",
  runId: "run-1",
  presentationRequestId: "presentation-1",
  status: "completed",
  presentation: {
    requestId: "presentation-1",
    status: "completed",
    mode: "markdown",
    markdown: "## Runtime result",
  },
} as const;

describe("HTTP Runtime client", () => {
  it("posts the Runtime contract and returns a validated result", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(completedResult), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const connectionStates: string[] = [];
    const client = createHttpRuntimeClient({
      endpoint: "https://runtime.test.example/api/runs",
      fetcher,
      onConnectionStateChange: (state) => connectionStates.push(state),
    });

    await expect(client.run(request)).resolves.toEqual(completedResult);
    expect(fetcher).toHaveBeenCalledWith(
      "https://runtime.test.example/api/runs",
      expect.objectContaining({
        body: JSON.stringify(request),
        method: "POST",
      }),
    );
    expect(connectionStates).toEqual(["connected"]);
  });

  it("submits an Action only through the Runtime Host Action endpoint", async () => {
    const request: RuntimeActionRequest = { protocolVersion: "1.0", requestId: "action-1", threadId: "thread-1", runId: "run-1", action: { actionId: "confirm", actionType: "patrol.confirm", surfaceId: "surface-1", approved: true } };
    const actionResult = { ...completedResult, requestId: "action-1", actionId: "confirm", sourcePresentationRequestId: "presentation-0" };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(actionResult), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createHttpRuntimeClient({ endpoint: "https://runtime.test.example/api/runs", fetcher });
    await expect(client.action(request)).resolves.toEqual(actionResult);
    expect(fetcher).toHaveBeenCalledWith("https://runtime.test.example/api/actions", expect.objectContaining({ body: JSON.stringify(request), method: "POST" }));
  });

  it("rejects untrusted responses that do not match Runtime Contract", async () => {
    const client = createHttpRuntimeClient({
      endpoint: "https://runtime.test.example/api/runs",
      fetcher: async () =>
        new Response(JSON.stringify({ status: "completed" }), { status: 200 }),
    });

    await expect(client.run(request)).rejects.toMatchObject({
      code: "WORKBENCH_RESPONSE_INVALID",
    });
  });
});
