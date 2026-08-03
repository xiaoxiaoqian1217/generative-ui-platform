import type { RuntimeRunRequest } from "@generative-ui/runtime-contract";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebSocketRuntimeClient } from "../../src/runtime/websocket-runtime-client.js";

class FakeWebSocket {
  readonly sent: string[] = [];
  readyState = 0;
  private readonly listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  close(): void {
    this.readyState = 3;
    this.emit("close", new Event("close"));
  }

  open(): void {
    this.readyState = 1;
    this.emit("open", new Event("open"));
  }

  receive(value: unknown): void {
    this.emit(
      "message",
      new MessageEvent("message", { data: JSON.stringify(value) }),
    );
  }

  send(value: string): void {
    this.sent.push(value);
  }

  private emit(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const request: RuntimeRunRequest = {
  protocolVersion: "1.0",
  requestId: "request-ws-1",
  message: { role: "user", content: "展示 A2UI" },
};

const result = {
  protocolVersion: "1.0",
  requestId: "request-ws-1",
  threadId: "thread-1",
  runId: "run-1",
  presentationRequestId: "presentation-ws-1",
  status: "completed",
  presentation: {
    requestId: "presentation-ws-1",
    status: "completed",
    mode: "generative-ui",
    surfaceId: "surface-1",
    operations: [{ beginRendering: { root: "root" } }],
  },
} as const;

describe("WebSocket Runtime client", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses Runtime WebSocket envelopes and correlates the validated result", async () => {
    const socket = new FakeWebSocket();
    const states: string[] = [];
    const client = createWebSocketRuntimeClient({
      endpoint: "wss://runtime.test.example/ws/runs",
      onConnectionStateChange: (state) => states.push(state),
      socketFactory: () => socket as unknown as WebSocket,
    });

    client.connect();
    socket.open();
    const pendingResult = client.run(request);

    expect(JSON.parse(socket.sent[0] ?? "null")).toEqual({
      type: "runtime.run.request",
      payload: request,
    });

    socket.receive({ type: "runtime.run.result", payload: result });
    await expect(pendingResult).resolves.toEqual(result);
    expect(states).toEqual(["connecting", "connected"]);
    client.close();
  });

  it("rejects a pending run when an untrusted message violates the contract", async () => {
    const socket = new FakeWebSocket();
    const client = createWebSocketRuntimeClient({
      endpoint: "wss://runtime.test.example/ws/runs",
      socketFactory: () => socket as unknown as WebSocket,
    });
    client.connect();
    socket.open();
    const pendingResult = client.run(request);

    socket.receive({
      type: "runtime.run.result",
      payload: { status: "completed" },
    });

    await expect(pendingResult).rejects.toMatchObject({
      code: "WORKBENCH_RESPONSE_INVALID",
    });
    client.close();
  });

  it("times out a run that never receives a Runtime result", async () => {
    vi.useFakeTimers();
    const socket = new FakeWebSocket();
    const client = createWebSocketRuntimeClient({
      endpoint: "wss://runtime.test.example/ws/runs",
      socketFactory: () => socket as unknown as WebSocket,
      timeoutMs: 25,
    });
    client.connect();
    socket.open();
    const pendingResult = client.run(request);
    const expectedTimeout = expect(pendingResult).rejects.toMatchObject({
      code: "WORKBENCH_REQUEST_TIMEOUT",
    });

    await vi.advanceTimersByTimeAsync(25);

    await expectedTimeout;
    client.close();
  });
});
