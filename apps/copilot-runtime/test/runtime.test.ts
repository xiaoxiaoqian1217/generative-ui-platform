import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createRuntimeHandler, loadRuntimeConfig } from "../src/index.js";

const servers: Server[] = [];

async function readEventStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let result = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return result;
    result += typeof value === "string" ? value : decoder.decode(value);
  }
}

function parseEventStream(stream: string): unknown[] {
  return stream.split("\n\n").flatMap((block) => {
    const data = block
      .split("\n")
      .find((line) => line.startsWith("data: "))
      ?.slice(6);
    return data === undefined ? [] : [JSON.parse(data)];
  });
}

async function upstream(handle: RequestListener): Promise<string> {
  const server = createServer(handle);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

describe("thin CopilotKit Runtime", () => {
  it("uses local development endpoints without exposing SACS credentials", () => {
    expect(loadRuntimeConfig({})).toEqual({
      agUiMockUrl: "http://127.0.0.1:4800/",
      sacsAgUiUrl: "http://127.0.0.1:8000/ag-ui",
    });
  });

  it("registers both Agent sources and keeps their capability difference explicit", async () => {
    const handler = createRuntimeHandler({
      agUiMockUrl: "http://mock.example.test",
      sacsAgUiUrl: "http://sacs.example.test/ag-ui",
    });

    const response = await handler(
      new Request("http://runtime.example.test/api/copilotkit/info"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(body.agents).toMatchObject({
      "ag-ui-mock": {
        capabilities: { tools: { clientProvided: true, supported: true } },
      },
      "single-agent-chat-server": {
        capabilities: { tools: { clientProvided: false, supported: false } },
      },
    });
  });

  it("discovers the SACS capability profile with server-side credentials", async () => {
    const received: Array<{
      authorization?: string;
      path: string;
      userJwt?: string;
    }> = [];
    const sacsUrl = await upstream((request, response) => {
      received.push({
        ...(request.headers.authorization === undefined
          ? {}
          : { authorization: request.headers.authorization }),
        path: request.url ?? "",
        ...(request.headers["x-openwebui-user-jwt"] === undefined
          ? {}
          : {
              userJwt: request.headers["x-openwebui-user-jwt"] as string,
            }),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          identity: { name: "SACS fixture", version: "0.2" },
          state: { deltas: true, snapshots: true },
          tools: { clientProvided: false, supported: false },
          transport: { streaming: true },
        }),
      );
    });
    const handler = createRuntimeHandler({
      agUiMockUrl: "http://mock.example.test",
      sacsAgUiUrl: `${sacsUrl}/ag-ui`,
      sacsServiceKey: "server-only-key",
      sacsUserJwt: "server-only-jwt",
    });

    const response = await handler(
      new Request("http://runtime.example.test/api/copilotkit/info"),
    );
    const body = await response.json();

    expect(body.agents["single-agent-chat-server"].capabilities).toMatchObject({
      identity: {
        metadata: { discovery: "live" },
        name: "SACS fixture",
        version: "0.2",
      },
    });
    expect(received).toEqual([
      {
        authorization: "Bearer server-only-key",
        path: "/ag-ui/capabilities",
        userJwt: "server-only-jwt",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("server-only-key");
    expect(JSON.stringify(body)).not.toContain("server-only-jwt");
  });

  it("routes runs to the selected upstream and keeps SACS credentials server-side", async () => {
    // 合成透传探针:只验证 ACTIVITY_SNAPSHOT 经 Runtime 原样透传,
    // 不复制 AGUIMock 的具体 fixture 内容。
    const mockActivitySnapshot = {
      type: "ACTIVITY_SNAPSHOT",
      messageId: "probe-activity-1",
      activityType: "a2ui-surface",
      content: {
        a2ui_operations: [
          {
            version: "v0.9",
            createSurface: {
              surfaceId: "runtime-passthrough-probe",
              catalogId: "urn:test:probe-catalog",
            },
          },
        ],
      },
      replace: true,
    };
    const received: Array<{
      authorization?: string;
      body: unknown;
      path: string;
      userJwt?: string;
    }> = [];
    const mockUrl = await upstream(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received.push({
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
        path: request.url ?? "",
      });
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(
        'data: {"type":"RUN_STARTED","threadId":"thread-1","runId":"run-1"}\n\n' +
          `data: ${JSON.stringify(mockActivitySnapshot)}\n\n` +
          'data: {"type":"RUN_FINISHED","threadId":"thread-1","runId":"run-1"}\n\n',
      );
    });
    const sacsUrl = await upstream(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const authorization = request.headers.authorization;
      const userJwt = request.headers["x-openwebui-user-jwt"] as
        | string
        | undefined;
      received.push({
        ...(authorization === undefined ? {} : { authorization }),
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
        path: request.url ?? "",
        ...(userJwt === undefined ? {} : { userJwt }),
      });
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(
        'data: {"type":"RUN_STARTED","threadId":"thread-1","runId":"run-1"}\n\n' +
          'data: {"type":"RUN_FINISHED","threadId":"thread-1","runId":"run-1"}\n\n',
      );
    });
    const handler = createRuntimeHandler({
      agUiMockUrl: mockUrl,
      sacsAgUiUrl: `${sacsUrl}/ag-ui`,
      sacsServiceKey: "server-only-key",
      sacsUserJwt: "server-only-jwt",
    });
    const run = {
      context: [],
      forwardedProps: {},
      messages: [],
      runId: "run-1",
      state: {},
      threadId: "thread-1",
      tools: [],
    };

    const mockResponse = await handler(
      new Request(
        "http://runtime.example.test/api/copilotkit/agent/ag-ui-mock/run",
        {
          body: JSON.stringify(run),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      ),
    );
    const mockEvents = await readEventStream(mockResponse);
    const sacsRun = { ...run, runId: "run-2", threadId: "thread-2" };
    const sacsResponse = await handler(
      new Request(
        "http://runtime.example.test/api/copilotkit/agent/single-agent-chat-server/run",
        {
          body: JSON.stringify(sacsRun),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      ),
    );
    const sacsEvents = await readEventStream(sacsResponse);

    const parsedMockEvents = parseEventStream(mockEvents) as Array<{
      type?: string;
    }>;
    expect(parsedMockEvents.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "RUN_FINISHED",
    ]);
    expect(
      parsedMockEvents.find((event) => event.type === "ACTIVITY_SNAPSHOT"),
    ).toEqual(mockActivitySnapshot);
    expect(sacsEvents).toContain('"type":"RUN_FINISHED"');
    expect(received).toEqual([
      { body: run, path: "/" },
      {
        authorization: "Bearer server-only-key",
        body: sacsRun,
        path: "/ag-ui",
        userJwt: "server-only-jwt",
      },
    ]);
  });
});
