import { createServer } from "node:http";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { createRuntimeHandler, loadRuntimeConfig } from "./index.js";

const host = process.env.COPILOT_RUNTIME_HOST ?? "127.0.0.1";
const port = Number(process.env.COPILOT_RUNTIME_PORT ?? "4801");
const handler = createRuntimeHandler(loadRuntimeConfig(process.env));

const server = createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? `${host}:${port}`}`,
    );
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const requestInit: RequestInit & { duplex: "half" } = {
      ...(hasBody ? { body: Readable.toWeb(request) } : {}),
      duplex: "half",
      headers: request.headers as HeadersInit,
      ...(request.method === undefined ? {} : { method: request.method }),
    };
    const webRequest = new Request(url, requestInit);
    const webResponse = await handler(webRequest);
    response.writeHead(
      webResponse.status,
      Object.fromEntries(webResponse.headers),
    );
    if (webResponse.body) {
      const stream = Readable.fromWeb(
        webResponse.body as unknown as WebReadableStream,
      );
      stream.on("error", () => response.destroy());
      stream.pipe(response);
    } else {
      response.end();
    }
  } catch {
    if (!response.headersSent) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "runtime_request_failed" }));
    } else {
      response.destroy();
    }
  }
});

server.listen(port, host, () => {
  console.log(`CopilotKit Runtime listening on http://${host}:${port}`);
});
