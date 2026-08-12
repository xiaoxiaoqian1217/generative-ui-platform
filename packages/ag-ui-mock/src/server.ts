import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { type BaseEvent, RunAgentInputSchema } from "@ag-ui/core";
import { echoScenario } from "./scenarios/echo.js";
import { locateDeviceScenario } from "./scenarios/locate-device.js";
import type {
  AgUiMockScenario,
  AgUiMockScenarioName,
} from "./scenarios/types.js";

const scenarios: Record<AgUiMockScenarioName, AgUiMockScenario> = {
  echo: echoScenario,
  "locate-device": locateDeviceScenario,
};

export interface CreateAguiMockServerOptions {
  readonly scenario?: AgUiMockScenarioName;
}

export interface ListenOptions {
  readonly host?: string;
  readonly port?: number;
}

export interface AgUiMockServerAddress {
  readonly host: string;
  readonly port: number;
  readonly url: string;
}

export interface AgUiMockServer {
  close(): Promise<void>;
  listen(options?: ListenOptions): Promise<AgUiMockServerAddress>;
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
  };
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    ...corsHeaders(),
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendEvents(
  response: ServerResponse,
  events: readonly BaseEvent[],
): void {
  response.writeHead(200, {
    ...corsHeaders(),
    connection: "keep-alive",
    "content-type": "text/event-stream; charset=utf-8",
  });
  for (const event of events) {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  response.end();
}

function requestHandler(scenario: AgUiMockScenario) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://ag-ui-mock.local");
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders()).end();
      return;
    }
    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, { scenario: scenario.name, status: "ok" });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/copilotkit/info") {
      json(response, 200, {
        agents: { default: { description: scenario.description } },
        mode: "sse",
        version: "ag-ui-mock/1.0",
      });
      return;
    }
    if (
      request.method === "POST" &&
      url.pathname === "/api/copilotkit/agent/default/run"
    ) {
      try {
        const parsed = RunAgentInputSchema.safeParse(await readJson(request));
        if (!parsed.success) {
          json(response, 400, {
            code: "AG_UI_MOCK_RUN_INPUT_INVALID",
            issues: parsed.error.issues,
          });
          return;
        }
        sendEvents(response, scenario.events(parsed.data));
      } catch {
        json(response, 400, { code: "AG_UI_MOCK_JSON_INVALID" });
      }
      return;
    }
    json(response, 404, { code: "AG_UI_MOCK_ROUTE_NOT_FOUND" });
  };
}

function close(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export function createAguiMockServer(
  options: CreateAguiMockServerOptions = {},
): AgUiMockServer {
  const scenario = scenarios[options.scenario ?? "echo"];
  const server = createServer(requestHandler(scenario));
  return {
    close: () => close(server),
    listen(listenOptions = {}) {
      const host = listenOptions.host ?? "127.0.0.1";
      const port = listenOptions.port ?? 4800;
      return new Promise((resolve, reject) => {
        const onError = (error: Error) => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          server.off("error", onError);
          const address = server.address();
          if (address === null || typeof address === "string") {
            reject(new Error("AG_UI_MOCK_ADDRESS_UNAVAILABLE"));
            return;
          }
          resolve({
            host,
            port: address.port,
            url: `http://${host}:${address.port}`,
          });
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, host);
      });
    },
  };
}
