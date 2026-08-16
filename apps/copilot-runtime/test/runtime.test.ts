import { createHmac } from "node:crypto";
import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createRuntimeHandler, loadRuntimeConfig } from "../src/index.js";

const servers: Server[] = [];
const sacsServiceKey = "server-only-key-with-at-least-32-characters";
const sacsJwtSecret = "server-only-jwt-secret-with-at-least-32-characters";
const sacsPrincipalId = "workbench-test-user";

function verifyUserJwt(token: string, nowSeconds: number) {
  const parts = token.split(".");
  expect(parts).toHaveLength(3);
  const [header, payload, signature] = parts as [string, string, string];
  const expectedSignature = createHmac("sha256", sacsJwtSecret)
    .update(`${header}.${payload}`, "ascii")
    .digest("base64url");
  expect(signature).toBe(expectedSignature);
  expect(JSON.parse(Buffer.from(header, "base64url").toString("utf8"))).toEqual(
    {
      alg: "HS256",
      typ: "JWT",
    },
  );
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  expect(claims).toEqual({
    exp: nowSeconds + 300,
    iat: nowSeconds,
    iss: "open-webui",
    role: "user",
    sub: sacsPrincipalId,
  });
  return claims;
}

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
      sacsAgUiUrl: "http://127.0.0.1:3000/ag-ui",
    });
  });

  it("rejects static or incomplete SACS identity configuration", () => {
    expect(() =>
      loadRuntimeConfig({ SACS_OPENWEBUI_USER_JWT: "static-token" }),
    ).toThrow("SACS_STATIC_USER_JWT_UNSUPPORTED");
    expect(() =>
      loadRuntimeConfig({ SACS_AG_UI_SERVICE_KEY: sacsServiceKey }),
    ).toThrow("SACS_CREDENTIALS_INCOMPLETE");
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
    const nowSeconds = 1_800_000_000;
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
    const handler = createRuntimeHandler(
      {
        agUiMockUrl: "http://mock.example.test",
        sacsAgUiUrl: `${sacsUrl}/ag-ui`,
        sacsJwtSecret,
        sacsPrincipalId,
        sacsPrincipalRole: "user",
        sacsServiceKey,
      },
      { now: () => nowSeconds * 1000 },
    );

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
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      authorization: `Bearer ${sacsServiceKey}`,
      path: "/ag-ui/capabilities",
    });
    verifyUserJwt(received[0]?.userJwt ?? "", nowSeconds);
    expect(JSON.stringify(body)).not.toContain(sacsServiceKey);
    expect(JSON.stringify(body)).not.toContain(sacsJwtSecret);
  });

  it("routes runs to the selected upstream and keeps SACS credentials server-side", async () => {
    const nowSeconds = 1_800_000_100;
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
    const handler = createRuntimeHandler(
      {
        agUiMockUrl: mockUrl,
        sacsAgUiUrl: `${sacsUrl}/ag-ui`,
        sacsJwtSecret,
        sacsPrincipalId,
        sacsPrincipalRole: "user",
        sacsServiceKey,
      },
      { now: () => nowSeconds * 1000 },
    );
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
    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ body: run, path: "/" });
    expect(received[1]).toMatchObject({
      authorization: `Bearer ${sacsServiceKey}`,
      body: sacsRun,
      path: "/ag-ui",
    });
    verifyUserJwt(received[1]?.userJwt ?? "", nowSeconds);
  });

  it("issues a fresh SACS user JWT for every upstream request", async () => {
    let nowSeconds = 1_800_001_000;
    const receivedTokens: string[] = [];
    const sacsUrl = await upstream(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const userJwt = request.headers["x-openwebui-user-jwt"];
      if (typeof userJwt === "string") receivedTokens.push(userJwt);
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(
        'data: {"type":"RUN_STARTED","threadId":"thread-1","runId":"run-1"}\n\n' +
          'data: {"type":"RUN_FINISHED","threadId":"thread-1","runId":"run-1"}\n\n',
      );
    });
    const handler = createRuntimeHandler(
      {
        agUiMockUrl: "http://mock.example.test",
        sacsAgUiUrl: `${sacsUrl}/ag-ui`,
        sacsJwtSecret,
        sacsPrincipalId,
        sacsPrincipalRole: "user",
        sacsServiceKey,
      },
      { now: () => nowSeconds * 1000 },
    );
    const request = (runId: string) =>
      handler(
        new Request(
          "http://runtime.example.test/api/copilotkit/agent/single-agent-chat-server/run",
          {
            body: JSON.stringify({
              context: [],
              forwardedProps: {},
              messages: [],
              runId,
              state: {},
              threadId: "thread-1",
              tools: [],
            }),
            headers: { "content-type": "application/json" },
            method: "POST",
          },
        ),
      );

    await readEventStream(await request("run-1"));
    verifyUserJwt(receivedTokens[0] ?? "", nowSeconds);
    nowSeconds += 60;
    await readEventStream(await request("run-2"));
    verifyUserJwt(receivedTokens[1] ?? "", nowSeconds);
    expect(receivedTokens[1]).not.toBe(receivedTokens[0]);
  });
});
