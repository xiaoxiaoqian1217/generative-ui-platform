import { once } from "node:events";
import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { attachDemoHttp, DEMO_HTTP_PATH } from "../src/demo-http.js";

const openServers = new Set<ReturnType<typeof createServer>>();

afterEach(async () => {
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

describe("demo HTTP endpoint", () => {
  it("returns one complete mock text response", async () => {
    const app = express();
    app.use(express.json());
    attachDemoHttp(app);

    const server = createServer(app);
    openServers.add(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a TCP server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}${DEMO_HTTP_PATH}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "user_message",
          messageId: "message-http-1",
          content: "查询设备状态",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toMatchObject({
      type: "agent_message",
      replyTo: "message-http-1",
      content: expect.stringContaining("HTTP Mock 接口"),
    });
  });

  it("rejects invalid messages", async () => {
    const app = express();
    app.use(express.json());
    attachDemoHttp(app);

    const server = createServer(app);
    openServers.add(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a TCP server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}${DEMO_HTTP_PATH}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "" }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      type: "error_message",
    });
  });
});
