import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { AGUIMock } from "@copilotkit/aimock";
import { registerEchoScenario } from "./scenarios/echo.js";
import { registerFrontendToolTimeoutScenario } from "./scenarios/frontend-tool-timeout.js";
import { registerConsultPatrolRouteSelectionScenario } from "./scenarios/consult-patrol-route-selection.js";
import { registerInspectionSummaryA2uiScenario } from "./scenarios/inspection-summary-a2ui.js";
import { registerInspectionSummaryPlatformA2uiScenario } from "./scenarios/inspection-summary-platform-a2ui.js";
import { registerInspectionSummaryStructuredScenario } from "./scenarios/inspection-summary-structured.js";
import { registerLocateDeviceScenario } from "./scenarios/locate-device.js";
import { registerMapPatrolRouteReviewScenario } from "./scenarios/map-patrol-route-review.js";
import { registerRunErrorScenario } from "./scenarios/run-error.js";

export interface CreateAguiMockServerOptions {
  readonly host?: string;
  readonly port?: number;
}

export interface ReusableAguiMockServer {
  readonly url: string;
  start(): Promise<string>;
  stop(): Promise<void>;
}

function writeJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}

function allowWorkbenchCors(response: ServerResponse): void {
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-origin", "*");
}

function isAguiRunRequest(request: IncomingMessage, pathname: string): boolean {
  return (
    request.method === "POST" &&
    (pathname === "/" || pathname === "/api/copilotkit/agent/default/run")
  );
}

export function createAguiMockServer(
  options: CreateAguiMockServerOptions = {},
): ReusableAguiMockServer {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4800;
  const mock = new AGUIMock();

  registerInspectionSummaryA2uiScenario(mock);
  registerInspectionSummaryPlatformA2uiScenario(mock);
  registerInspectionSummaryStructuredScenario(mock);
  registerEchoScenario(mock);
  registerFrontendToolTimeoutScenario(mock);
  registerConsultPatrolRouteSelectionScenario(mock);
  registerMapPatrolRouteReviewScenario(mock);
  registerLocateDeviceScenario(mock);
  registerRunErrorScenario(mock);

  const server = createServer(async (request, response) => {
    allowWorkbenchCors(response);
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? host}`,
    );
    if (request.method === "GET" && url.pathname === "/api/copilotkit/info") {
      writeJson(response, 200, {
        agents: { default: { description: "Reusable AG-UI mock" } },
        mode: "sse",
        version: "ag-ui-mock",
      });
      return;
    }
    if (isAguiRunRequest(request, url.pathname)) {
      await mock.handleRequest(request, response, "/");
      return;
    }
    writeJson(response, 404, { error: "Not found" });
  });
  let baseUrl = "";

  return {
    get url() {
      return baseUrl;
    },
    start() {
      return new Promise<string>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          const address = server.address();
          if (typeof address !== "object" || address === null) {
            reject(new Error("AG_UI_MOCK_ADDRESS_UNAVAILABLE"));
            return;
          }
          baseUrl = `http://${host}:${address.port}`;
          resolve(baseUrl);
        });
      });
    },
    stop() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
