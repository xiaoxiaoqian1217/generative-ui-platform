import { createServer } from "node:http";
import { Readable } from "node:stream";

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function createMockUpstreamProxy({ host, port, upstreamUrl }) {
  const probe = {
    advertised: false,
    advertisedToolNames: [],
    continuations: 0,
    result: "",
    runs: 0,
  };
  let timeoutAttempts = 0;

  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/") {
      response.writeHead(404).end();
      return;
    }

    probe.runs += 1;
    const body = await readJson(request);
    const messages = body.messages ?? [];
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user")?.content;
    const lastMessage = messages.at(-1);
    probe.advertised ||= (body.tools ?? []).some(
      (tool) => tool.name === "show_workbench_status",
    );
    probe.advertisedToolNames = [
      ...new Set((body.tools ?? []).map((tool) => tool.name)),
    ];
    if (
      lastMessage?.role === "tool" &&
      String(lastMessage.content).includes('"capability":"frontend-tool"')
    ) {
      probe.continuations += 1;
      probe.result = String(lastMessage.content);
    }

    if (
      String(lastUserMessage).includes("timeout then retry") &&
      timeoutAttempts++ === 0
    ) {
      await wait(2_000);
    }

    const upstream = await fetch(upstreamUrl, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    response.writeHead(upstream.status, Object.fromEntries(upstream.headers));
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(response);
    else response.end();
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  if (typeof address !== "object" || address === null)
    throw new Error("MOCK_PROXY_ADDRESS_UNAVAILABLE");
  return {
    probe,
    reset() {
      probe.advertised = false;
      probe.advertisedToolNames = [];
      probe.continuations = 0;
      probe.result = "";
      probe.runs = 0;
      timeoutAttempts = 0;
    },
    stop: () => new Promise((resolve) => server.close(resolve)),
    url: `http://${host}:${address.port}`,
  };
}
