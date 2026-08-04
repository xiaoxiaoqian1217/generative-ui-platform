import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { LangGraphWebSocketBusinessAgentAdapter } from "../src/index.js";

const servers: Array<ReturnType<typeof createServer>> = [];
const sockets: WebSocketServer[] = [];

afterEach(async () => {
  await Promise.all(
    sockets
      .splice(0)
      .map(
        (socket) =>
          new Promise<void>((resolve) => socket.close(() => resolve())),
      ),
  );
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

async function startServer(): Promise<string> {
  const server = createServer();
  const websocket = new WebSocketServer({ server });
  servers.push(server);
  sockets.push(websocket);
  websocket.on("connection", (socket) => {
    socket.on("message", (frame) => {
      const message = JSON.parse(frame.toString()) as {
        type: string;
        payload: { requestId: string; threadId: string; runId: string };
      };
      socket.send(
        JSON.stringify({
          type: "business-agent.event",
          payload: {
            protocolVersion: "1.0",
            eventId: "event-1",
            requestId: message.payload.requestId,
            threadId: message.payload.threadId,
            runId: message.payload.runId,
            type: "business-agent.started",
          },
        }),
      );
      socket.send(
        JSON.stringify({
          type: "business-agent.result",
          payload: {
            protocolVersion: "1.0",
            requestId: message.payload.requestId,
            threadId: message.payload.threadId,
            runId: message.payload.runId,
            status: "completed",
            content: {
              contentType: "markdown",
              markdown:
                message.type === "business-agent.run"
                  ? "WebSocket run."
                  : "WebSocket resume.",
            },
          },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("LangGraphWebSocketBusinessAgentAdapter", () => {
  it("uses the same event and correlation semantics for Run and Resume", async () => {
    const adapter = new LangGraphWebSocketBusinessAgentAdapter({
      url: await startServer(),
    });
    const events: string[] = [];
    await expect(
      adapter.run(
        {
          protocolVersion: "1.0",
          requestId: "request-run",
          threadId: "thread-1",
          runId: "run-1",
          input: { message: "status" },
        },
        { onEvent: (event) => events.push(event.type) },
      ),
    ).resolves.toMatchObject({
      status: "completed",
      content: { markdown: "WebSocket run." },
    });
    await expect(
      adapter.resumeAction({
        protocolVersion: "1.0",
        requestId: "request-action",
        threadId: "thread-1",
        runId: "run-1",
        action: {
          actionId: "action-1",
          actionType: "patrol.confirm",
          surfaceId: "surface-1",
          approved: true,
        },
      }),
    ).resolves.toMatchObject({
      status: "completed",
      content: { markdown: "WebSocket resume." },
    });
    expect(events).toEqual(["business-agent.started"]);
  });
});
