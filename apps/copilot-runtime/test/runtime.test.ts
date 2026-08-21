import { createHmac } from "node:crypto";
import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { validateA2UIComponents } from "@ag-ui/a2ui-toolkit";
import type { AbstractAgent } from "@ag-ui/client";
import { type BaseEvent, EventType, type RunAgentInput } from "@ag-ui/core";
import { Subject } from "rxjs";
import { afterEach, describe, expect, it } from "vitest";
import {
  A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
  createRuntimeHandler,
  DYNAMIC_A2UI_COMPONENT_NAMES,
  DynamicA2uiPresentationPolicy,
  dynamicA2uiCatalogSchema,
  dynamicA2uiValidationCatalog,
  type InvokeSubagent,
  loadRuntimeConfig,
} from "../src/index.js";

const servers: Server[] = [];
const sacsServiceKey = "server-only-key-with-at-least-32-characters";
const sacsJwtSecret = "server-only-jwt-secret-with-at-least-32-characters";
const sacsPrincipalId = "workbench-test-user";

const INSPECTION_ACTIVITY_CONTENT = {
  contentType: "inspection-summary",
  schemaVersion: "1",
  payload: {
    status: "completed",
    totalDevices: 5,
    okDevices: 4,
    errorDevices: 1,
    completionRate: 1.0,
    startedAt: "14:20",
    durationMinutes: 12,
    area: "A 区",
  },
} as const;

const INSPECTION_CONTENT = JSON.stringify(INSPECTION_ACTIVITY_CONTENT);

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

interface RuntimeEvent {
  readonly activityType?: string;
  readonly content?: unknown;
  readonly delta?: string;
  readonly messageId?: string;
  readonly type?: string;
}

function parseEventStream(stream: string): RuntimeEvent[] {
  return stream.split("\n\n").flatMap((block) => {
    const data = block
      .split("\n")
      .find((line) => line.startsWith("data: "))
      ?.slice(6);
    return data === undefined ? [] : [JSON.parse(data) as RuntimeEvent];
  });
}

async function upstream(handle: RequestListener): Promise<string> {
  const server = createServer(handle);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

function sseEvents(events: readonly unknown[]): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

function textMessageEvents(content: string): unknown[] {
  return [
    { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" },
    { type: "TEXT_MESSAGE_START", messageId: "upstream-message-1" },
    {
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "upstream-message-1",
      delta: content,
    },
    { type: "TEXT_MESSAGE_END", messageId: "upstream-message-1" },
    {
      type: "RUN_FINISHED",
      threadId: "thread-1",
      runId: "run-1",
    },
  ];
}

function inspectionActivitySnapshot(
  content: Record<string, unknown> = INSPECTION_ACTIVITY_CONTENT,
): BaseEvent {
  return {
    type: EventType.ACTIVITY_SNAPSHOT,
    messageId: "inspection-summary-activity-1",
    activityType: "inspection-summary",
    content,
    replace: true,
  };
}

function inspectionActivityEvents(
  content: Record<string, unknown> = INSPECTION_ACTIVITY_CONTENT,
): unknown[] {
  return [
    { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" },
    inspectionActivitySnapshot(content),
    { type: "RUN_FINISHED", threadId: "thread-1", runId: "run-1" },
  ];
}

function mockUpstreamReturning(events: readonly unknown[]) {
  const received: { body?: unknown } = {};
  return upstream(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    received.body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.end(sseEvents(events));
  }).then((url) => ({ received, url }));
}

function runRequestBody(forwardedProps: Record<string, unknown>) {
  return {
    context: [],
    forwardedProps,
    messages: [],
    runId: "run-1",
    state: {},
    threadId: "thread-1",
    tools: [],
  };
}

async function runAgainstMock(
  handler: (request: Request) => Promise<Response> | Response,
  body: Record<string, unknown>,
): Promise<RuntimeEvent[]> {
  const response = await handler(
    new Request(
      "http://runtime.example.test/api/copilotkit/agent/ag-ui-mock/run",
      {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    ),
  );
  return parseEventStream(await readEventStream(response));
}

const legalSubagentArgs = {
  surfaceId: "inspection-summary-dynamic",
  components: [
    { id: "root", component: "Card", child: "summary" },
    {
      id: "summary",
      component: "Column",
      children: ["badge", "metric", "info"],
    },
    {
      id: "badge",
      component: "StatusBadge",
      label: "已完成",
      variant: "success",
    },
    {
      id: "metric",
      component: "Metric",
      label: "设备总数",
      value: { path: "/total" },
    },
    {
      id: "info",
      component: "InfoRow",
      label: "执行区域",
      value: { path: "/area" },
    },
  ],
  data: { area: "A 区", total: 5 },
};

function createSubagentProbe(
  result: Awaited<ReturnType<InvokeSubagent>> = legalSubagentArgs,
) {
  const prompts: string[] = [];
  const invokeSubagent: InvokeSubagent = async (prompt) => {
    prompts.push(prompt);
    return result;
  };
  return { invokeSubagent, prompts };
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
      scenarioDraftLlmBaseUrl: "https://openrouter.ai/api/v1",
      scenarioDraftLlmModel: "openai/gpt-4.1-mini",
      scenarioLabEnabled: false,
      secondaryLlmBaseUrl: "https://openrouter.ai/api/v1",
      secondaryLlmModel: "openai/gpt-4.1-mini",
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

  it("requires explicit Scenario Lab enablement and separate authoring config", () => {
    expect(
      loadRuntimeConfig({
        SCENARIO_DRAFT_LLM_API_KEY: "authoring-key",
        SCENARIO_DRAFT_LLM_BASE_URL: "https://authoring.example.test/v1",
        SCENARIO_DRAFT_LLM_MODEL: "fixture-author",
        SCENARIO_LAB_ENABLED: "true",
      }),
    ).toMatchObject({
      scenarioDraftLlmApiKey: "authoring-key",
      scenarioDraftLlmBaseUrl: "https://authoring.example.test/v1",
      scenarioDraftLlmModel: "fixture-author",
      scenarioLabEnabled: true,
    });
    expect(() =>
      loadRuntimeConfig({ SCENARIO_LAB_ENABLED: "sometimes" }),
    ).toThrow("SCENARIO_LAB_ENABLED_INVALID");
  });

  it("does not mount Scenario Lab unless explicitly enabled", async () => {
    const baseConfig = {
      agUiMockUrl: "http://mock.example.test",
      sacsAgUiUrl: "http://sacs.example.test/ag-ui",
    };
    const disabled = createRuntimeHandler(baseConfig);
    const disabledResponse = await disabled(
      new Request("http://runtime.example.test/api/dev/scenario-lab/scenarios"),
    );
    expect(disabledResponse.status).toBe(404);

    const enabled = createRuntimeHandler({
      ...baseConfig,
      scenarioLabEnabled: true,
    });
    const enabledResponse = await enabled(
      new Request("http://runtime.example.test/api/dev/scenario-lab/scenarios"),
    );
    expect(enabledResponse.status).toBe(200);
    expect(await enabledResponse.json()).toMatchObject({
      capabilities: { drafting: false },
      scenarios: expect.any(Array),
    });
  });

  it("registers exactly the two Business Agent sources", async () => {
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
    expect(Object.keys(body.agents).sort()).toEqual([
      "ag-ui-mock",
      "single-agent-chat-server",
    ]);
    expect(body.agents).toMatchObject({
      "ag-ui-mock": {
        capabilities: { tools: { clientProvided: true, supported: true } },
      },
      "single-agent-chat-server": {
        capabilities: { tools: { clientProvided: false, supported: false } },
      },
    });
    expect(body.a2ui).toBeUndefined();
  });

  it("builds the dynamic generation boundary from Basic and Platform Catalog components", () => {
    expect(dynamicA2uiCatalogSchema.catalogId).toBe(
      "https://generative-ui.dev/a2ui/v0_9/platform_catalog.json",
    );
    expect(DYNAMIC_A2UI_COMPONENT_NAMES).toHaveLength(21);
    expect(DYNAMIC_A2UI_COMPONENT_NAMES).toEqual(
      expect.arrayContaining([
        "Card",
        "Column",
        "InfoRow",
        "Metric",
        "Row",
        "StatusBadge",
        "Text",
      ]),
    );
    expect(DYNAMIC_A2UI_COMPONENT_NAMES).not.toContain("DeviceCard");

    const result = validateA2UIComponents({
      catalog: dynamicA2uiValidationCatalog,
      components: [
        {
          id: "root",
          component: "Column",
          children: ["metric", "status", "info"],
        },
        {
          id: "metric",
          component: "Metric",
          label: "设备总数",
          value: { path: "/summary/total" },
        },
        {
          id: "status",
          component: "StatusBadge",
          label: "已完成",
          variant: "success",
        },
        {
          id: "info",
          component: "InfoRow",
          label: "执行区域",
          value: { path: "/summary/area" },
        },
      ],
      data: { summary: { area: "A 区", total: 5 } },
    });
    expect(result).toEqual({ errors: [], valid: true });

    const outsideCatalog = validateA2UIComponents({
      catalog: dynamicA2uiValidationCatalog,
      components: [{ id: "root", component: "DeviceCard" }],
    });
    expect(outsideCatalog.valid).toBe(false);
    expect(outsideCatalog.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_component" }),
      ]),
    );
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

    const parsedMockEvents = parseEventStream(mockEvents);
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

describe("Dynamic A2UI presentation policy", () => {
  const dynamicProps = {
    clientCapabilities: { a2ui: true },
    requestedMode: "dynamic",
  };

  it("stitches a catalog-valid a2ui-surface into the run at the stable checkpoint", async () => {
    const { received, url } = await mockUpstreamReturning(
      inspectionActivityEvents(),
    );
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "ACTIVITY_SNAPSHOT",
      "RUN_FINISHED",
    ]);
    const activity = events.find(
      (event) => event.activityType === "a2ui-surface",
    );
    expect(activity).toMatchObject({
      activityType: "a2ui-surface",
      messageId: "dynamic-a2ui-run-1",
      replace: true,
    });
    const content = activity?.content as {
      a2ui_operations: Array<Record<string, unknown>>;
    };
    const createSurface = content.a2ui_operations.find(
      (operation) => "createSurface" in operation,
    );
    expect(createSurface).toMatchObject({
      createSurface: {
        catalogId: "https://generative-ui.dev/a2ui/v0_9/platform_catalog.json",
      },
    });
    expect(subagent.prompts).toHaveLength(1);
    expect(subagent.prompts[0]).toContain(INSPECTION_CONTENT);
    expect(received.body).toMatchObject({ forwardedProps: dynamicProps });
  });

  it("keeps the original content and reports an explicit error when generation violates the catalog", async () => {
    const { url } = await mockUpstreamReturning(inspectionActivityEvents());
    const invokeSubagent: InvokeSubagent = async () => ({
      components: [{ id: "root", component: "DeviceCard" }],
      data: {},
    });
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "ACTIVITY_SNAPSHOT",
      "RUN_FINISHED",
    ]);
    const activity = events.find(
      (event) => event.activityType === A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
    );
    expect(activity?.activityType).toBe(A2UI_GENERATION_ERROR_ACTIVITY_TYPE);
    expect(activity?.content).toMatchObject({
      code: "A2UI_GENERATION_FAILED",
    });
    expect(events.some((event) => event.activityType === "a2ui-surface")).toBe(
      false,
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        activityType: "inspection-summary",
        content: INSPECTION_ACTIVITY_CONTENT,
      }),
    );
  });

  it("reports an explicit error when the Secondary LLM is not configured", async () => {
    const { url } = await mockUpstreamReturning(inspectionActivityEvents());
    const handler = createRuntimeHandler({
      agUiMockUrl: url,
      sacsAgUiUrl: "http://sacs.example.test/ag-ui",
    });

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    const activity = events.find(
      (event) => event.activityType === A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
    );
    expect(activity?.activityType).toBe(A2UI_GENERATION_ERROR_ACTIVITY_TYPE);
    expect(activity?.content).toMatchObject({
      code: "A2UI_GENERATION_UNAVAILABLE",
    });
    expect(events.at(-1)?.type).toBe("RUN_FINISHED");
  });

  it("keeps JSON text as text instead of treating it as a structured activity", async () => {
    const { url } = await mockUpstreamReturning(
      textMessageEvents(INSPECTION_CONTENT),
    );
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(subagent.prompts).toHaveLength(0);
    expect(
      events.find((event) => event.type === "TEXT_MESSAGE_CONTENT"),
    ).toMatchObject({ delta: INSPECTION_CONTENT });
    expect(
      events.find(
        (event) => event.activityType === A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
      )?.content,
    ).toMatchObject({ code: "A2UI_GENERATION_FAILED" });
  });

  it.each([
    [
      "missing schemaVersion",
      {
        contentType: "inspection-summary",
        payload: INSPECTION_ACTIVITY_CONTENT.payload,
      },
    ],
    [
      "primitive payload",
      {
        contentType: "inspection-summary",
        schemaVersion: "1",
        payload: "not-structured",
      },
    ],
  ])("rejects %s before generation", async (_label, content) => {
    const { url } = await mockUpstreamReturning(
      inspectionActivityEvents(content),
    );
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(subagent.prompts).toHaveLength(0);
    expect(
      events.find(
        (event) => event.activityType === A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
      )?.content,
    ).toMatchObject({ code: "A2UI_GENERATION_FAILED" });
  });

  it("does not generate after RUN_ERROR", async () => {
    const { url } = await mockUpstreamReturning([
      { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" },
      inspectionActivitySnapshot(),
      { type: "RUN_ERROR", message: "mock failure", code: "MOCK_FAILURE" },
    ]);
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "RUN_ERROR",
    ]);
    expect(subagent.prompts).toHaveLength(0);
    expect(
      events.some(
        (event) => event.activityType === A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
      ),
    ).toBe(false);
  });

  it("does not generate when the stream ends without RUN_FINISHED", async () => {
    const { url } = await mockUpstreamReturning([
      { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" },
      inspectionActivitySnapshot(),
    ]);
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "RUN_ERROR",
    ]);
    expect(subagent.prompts).toHaveLength(0);
  });

  it("does not generate from an interrupted RUN_FINISHED", async () => {
    const { url } = await mockUpstreamReturning([
      { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" },
      inspectionActivitySnapshot(),
      {
        type: "RUN_FINISHED",
        threadId: "thread-1",
        runId: "run-1",
        outcome: {
          type: "interrupt",
          interrupts: [{ id: "approval-1", reason: "approval_required" }],
        },
      },
    ]);
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "RUN_FINISHED",
    ]);
    expect(subagent.prompts).toHaveLength(0);
  });

  it("does not generate when the response stream is cancelled", async () => {
    const upstreamEvents = new Subject<BaseEvent>();
    const subagent = createSubagentProbe();
    const policy = new DynamicA2uiPresentationPolicy({
      invokeSubagent: subagent.invokeSubagent,
    });
    const next = {
      run: () => upstreamEvents.asObservable(),
    } as unknown as AbstractAgent;
    const subscription = policy
      .run(runRequestBody(dynamicProps) as RunAgentInput, next)
      .subscribe();

    upstreamEvents.next({
      type: EventType.RUN_STARTED,
      threadId: "thread-1",
      runId: "run-1",
    });
    upstreamEvents.next(inspectionActivitySnapshot());
    subscription.unsubscribe();
    upstreamEvents.next({
      type: EventType.RUN_FINISHED,
      threadId: "thread-1",
      runId: "run-1",
      outcome: { type: "success" },
    });
    upstreamEvents.complete();
    await Promise.resolve();

    expect(subscription.closed).toBe(true);
    expect(upstreamEvents.observed).toBe(false);
    expect(subagent.prompts).toHaveLength(0);
  });

  it("passes through native A2UI output untouched even under requestedMode dynamic", async () => {
    const nativeSurface = {
      type: "ACTIVITY_SNAPSHOT",
      messageId: "upstream-surface-1",
      activityType: "a2ui-surface",
      content: {
        a2ui_operations: [
          {
            version: "v0.9",
            createSurface: {
              surfaceId: "native-fixture",
              catalogId:
                "https://generative-ui.dev/a2ui/v0_9/platform_catalog.json",
            },
          },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId: "native-fixture",
              components: legalSubagentArgs.components,
            },
          },
          {
            version: "v0.9",
            updateDataModel: {
              surfaceId: "native-fixture",
              path: "/",
              value: legalSubagentArgs.data,
            },
          },
        ],
      },
      replace: true,
    };
    const { url } = await mockUpstreamReturning([
      { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" },
      nativeSurface,
      { type: "RUN_FINISHED", threadId: "thread-1", runId: "run-1" },
    ]);
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "ACTIVITY_SNAPSHOT",
      "RUN_FINISHED",
    ]);
    const activity = events.find((event) => event.type === "ACTIVITY_SNAPSHOT");
    expect(activity).toMatchObject(nativeSurface);
    expect(subagent.prompts).toHaveLength(0);
  });

  it("does not let invalid Native A2UI block Dynamic A2UI fallback", async () => {
    const invalidNativeSurface = {
      type: "ACTIVITY_SNAPSHOT",
      messageId: "upstream-invalid-surface-1",
      activityType: "a2ui-surface",
      content: {
        a2ui_operations: [
          {
            version: "v0.9",
            createSurface: {
              surfaceId: "invalid-native-fixture",
              catalogId: "urn:catalog:not-registered",
            },
          },
        ],
      },
      replace: true,
    };
    const { url } = await mockUpstreamReturning([
      { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" },
      inspectionActivitySnapshot(),
      invalidNativeSurface,
      {
        type: "RUN_FINISHED",
        threadId: "thread-1",
        runId: "run-1",
      },
    ]);
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(subagent.prompts).toHaveLength(1);
    expect(events).not.toContainEqual(
      expect.objectContaining({ messageId: invalidNativeSurface.messageId }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        activityType: A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        activityType: "a2ui-surface",
        messageId: "dynamic-a2ui-run-1",
      }),
    );
    expect(events.at(-1)?.type).toBe("RUN_FINISHED");
  });

  it("rejects Native A2UI with unresolved data bindings", async () => {
    const invalidNativeSurface = {
      type: "ACTIVITY_SNAPSHOT",
      messageId: "upstream-unresolved-surface-1",
      activityType: "a2ui-surface",
      content: {
        a2ui_operations: [
          {
            version: "v0.9",
            createSurface: {
              surfaceId: "unresolved-native-fixture",
              catalogId:
                "https://generative-ui.dev/a2ui/v0_9/platform_catalog.json",
            },
          },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId: "unresolved-native-fixture",
              components: [
                {
                  id: "root",
                  component: "Text",
                  text: { path: "/missing" },
                },
              ],
            },
          },
        ],
      },
      replace: true,
    };
    const { url } = await mockUpstreamReturning([
      { type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" },
      inspectionActivitySnapshot(),
      invalidNativeSurface,
      {
        type: "RUN_FINISHED",
        threadId: "thread-1",
        runId: "run-1",
      },
    ]);
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody(dynamicProps));

    expect(subagent.prompts).toHaveLength(1);
    expect(events).not.toContainEqual(
      expect.objectContaining({ messageId: invalidNativeSurface.messageId }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        activityType: "a2ui-surface",
        messageId: "dynamic-a2ui-run-1",
      }),
    );
  });

  it("does not intercept runs without an explicit dynamic requestedMode", async () => {
    const { url } = await mockUpstreamReturning(
      textMessageEvents(INSPECTION_CONTENT),
    );
    const subagent = createSubagentProbe();
    const handler = createRuntimeHandler(
      { agUiMockUrl: url, sacsAgUiUrl: "http://sacs.example.test/ag-ui" },
      { invokeSubagent: subagent.invokeSubagent },
    );

    const events = await runAgainstMock(handler, runRequestBody({}));

    expect(events.map((event) => event.type)).toEqual([
      "RUN_STARTED",
      "TEXT_MESSAGE_START",
      "TEXT_MESSAGE_CONTENT",
      "TEXT_MESSAGE_END",
      "RUN_FINISHED",
    ]);
    expect(subagent.prompts).toHaveLength(0);
  });
});
