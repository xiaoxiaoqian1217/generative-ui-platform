import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createAguiMockServer } from "@generative-ui/ag-ui-mock";
import { createRuntimeHandler } from "@generative-ui/copilot-runtime";
import { createMockUpstreamProxy } from "./mock-upstream-proxy.mjs";
import { createSacsProfileFixture } from "./sacs-profile-fixture.mjs";
import { createSecondaryLlmFake } from "./secondary-llm-fake.mjs";

const host = "127.0.0.1";
const appRoot = fileURLToPath(new URL("../..", import.meta.url));
const distRoot = join(appRoot, "dist");
const port = Number(process.env.WEB_WORKBENCH_E2E_PORT ?? "4173");
const sacsJwtSecret = "e2e-sacs-jwt-secret-with-at-least-32-characters";
const sacsPrincipalId = "e2e-workbench-user";
const sacsServiceKey = "e2e-sacs-service-key-with-at-least-32-characters";
const mock = createAguiMockServer({ host, port: 0 });
await mock.start();
const mockProxy = await createMockUpstreamProxy({
  host,
  port: 0,
  upstreamUrl: mock.url,
});
const sacs = await createSacsProfileFixture({
  host,
  jwtSecret: sacsJwtSecret,
  port: 0,
  principalId: sacsPrincipalId,
  serviceKey: sacsServiceKey,
});
const secondaryLlm = createSecondaryLlmFake();
const runtimeHandler = createRuntimeHandler(
  {
    agUiMockUrl: mockProxy.url,
    sacsAgUiUrl: sacs.url,
    sacsJwtSecret,
    sacsPrincipalId,
    sacsPrincipalRole: "user",
    sacsServiceKey,
  },
  { invokeSubagent: secondaryLlm.invokeSubagent },
);
let runtimeAvailable = true;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(response, status, value) {
  response.writeHead(status, { "content-type": contentTypes[".json"] });
  response.end(JSON.stringify(value));
}

async function serveRuntime(request, response, url) {
  const webRequest = new Request(url, {
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : Readable.toWeb(request),
    duplex: "half",
    headers: request.headers,
    method: request.method,
  });
  const webResponse = await runtimeHandler(webRequest);
  response.writeHead(
    webResponse.status,
    Object.fromEntries(webResponse.headers),
  );
  if (webResponse.body) Readable.fromWeb(webResponse.body).pipe(response);
  else response.end();
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
  const relativePath =
    requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const candidate = resolve(distRoot, relativePath);
  const candidateRelativePath = relative(distRoot, candidate);
  if (
    candidateRelativePath.startsWith("..") ||
    isAbsolute(candidateRelativePath)
  ) {
    response.writeHead(404).end();
    return;
  }
  let filePath = candidate;
  try {
    if (!(await stat(filePath)).isFile())
      filePath = join(distRoot, "index.html");
  } catch {
    filePath = join(distRoot, "index.html");
  }
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type":
      contentTypes[extname(filePath)] ?? "application/octet-stream",
  });
  response.end(await readFile(filePath));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (request.method === "GET" && url.pathname === "/workbench-health") {
    response.writeHead(204).end();
    return;
  }
  if (request.method === "GET" && url.pathname === "/__control__/sacs") {
    json(response, 200, sacs.observations);
    return;
  }
  if (
    request.method === "GET" &&
    url.pathname === "/__control__/secondary-llm"
  ) {
    json(response, 200, secondaryLlm.observations);
    return;
  }
  if (
    request.method === "GET" &&
    url.pathname === "/__control__/frontend-tool-probe"
  ) {
    json(response, 200, mockProxy.probe);
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/restore") {
    runtimeAvailable = true;
    sacs.setAvailable(true);
    mockProxy.reset();
    sacs.observations.length = 0;
    secondaryLlm.reset();
    response.writeHead(204).end();
    return;
  }
  if (
    request.method === "POST" &&
    url.pathname === "/__control__/secondary-llm-mode"
  ) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const mode = JSON.parse(Buffer.concat(chunks).toString("utf8"))?.mode;
    secondaryLlm.setMode(mode);
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/sacs-down") {
    sacs.setAvailable(false);
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/agent-down") {
    runtimeAvailable = false;
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && url.pathname === "/__control__/agent-up") {
    runtimeAvailable = true;
    response.writeHead(204).end();
    return;
  }
  if (url.pathname.startsWith("/api/copilotkit")) {
    if (!runtimeAvailable) {
      json(response, 503, { error: "runtime_unavailable" });
      return;
    }
    await serveRuntime(request, response, url);
    return;
  }
  await serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`Workbench E2E server listening on ${port}`);
});

function shutdown() {
  server.close(() => {
    void Promise.all([mock.stop(), mockProxy.stop(), sacs.stop()]).finally(() =>
      process.exit(0),
    );
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
