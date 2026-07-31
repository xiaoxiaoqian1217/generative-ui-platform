import { once } from "node:events";
import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { attachDemoSocket, DEMO_SOCKET_PATH } from "../src/demo-socket.js";

const openSockets = new Set<WebSocket>();
const openServers = new Set<ReturnType<typeof createServer>>();

function waitForMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    socket.addEventListener(
      "message",
      (event) => {
        if (typeof event.data !== "string") {
          reject(new Error("Expected a text WebSocket message"));
          return;
        }

        resolve(JSON.parse(event.data) as Record<string, unknown>);
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => reject(new Error("WebSocket connection failed")),
      { once: true },
    );
  });
}

afterEach(async () => {
  for (const socket of openSockets) {
    socket.close();
  }
  openSockets.clear();

  await Promise.all(
    [...openServers].map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
  openServers.clear();
});

describe("demo WebSocket", () => {
  it("pushes one complete mock text response", async () => {
    const server = createServer();
    openServers.add(server);
    attachDemoSocket(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a TCP server address");
    }

    const socket = new WebSocket(
      `ws://127.0.0.1:${address.port}${DEMO_SOCKET_PATH}`,
    );
    openSockets.add(socket);

    const systemMessagePromise = waitForMessage(socket);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener(
        "error",
        () => reject(new Error("WebSocket connection failed")),
        { once: true },
      );
    });

    await expect(systemMessagePromise).resolves.toMatchObject({
      type: "system_message",
    });

    const agentMessagePromise = waitForMessage(socket);
    socket.send(
      JSON.stringify({
        type: "user_message",
        messageId: "message-1",
        content: "查询设备状态",
      }),
    );

    await expect(agentMessagePromise).resolves.toMatchObject({
      type: "agent_message",
      replyTo: "message-1",
      content: expect.stringContaining("当前未接入真实 Business Agent"),
    });
  });
});
