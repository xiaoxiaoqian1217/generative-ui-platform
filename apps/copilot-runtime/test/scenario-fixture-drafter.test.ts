import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createScenarioFixtureDrafter } from "../src/index.js";

const servers: Server[] = [];

async function modelEndpoint(
  response: unknown,
  options: { readonly status?: number } = {},
): Promise<{ readonly requests: unknown[]; readonly url: string }> {
  const requests: unknown[] = [];
  const server = createServer(async (request, serverResponse) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    requests.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    serverResponse.writeHead(options.status ?? 200, {
      "content-type": "application/json",
    });
    serverResponse.end(JSON.stringify(response));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { requests, url: `http://127.0.0.1:${address.port}` };
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

describe("Scenario fixture authoring adapter", () => {
  it("uses a separate system role and schema-constrained JSON response", async () => {
    const upstream = await modelEndpoint({
      choices: [
        {
          message: {
            content: JSON.stringify({
              failed: 1,
              ok: 2,
              status: "partial_success",
              total: 3,
            }),
          },
        },
      ],
    });
    const draft = createScenarioFixtureDrafter({
      apiKey: "test-key",
      baseUrl: upstream.url,
      model: "test-authoring-model",
    });

    await expect(draft("三台设备一台异常的巡检结果")).resolves.toEqual({
      failed: 1,
      ok: 2,
      status: "partial_success",
      total: 3,
    });
    expect(upstream.requests).toHaveLength(1);
    expect(upstream.requests[0]).toMatchObject({
      max_tokens: 1_200,
      messages: [
        { role: "system" },
        {
          content: "三台设备一台异常的巡检结果",
          role: "user",
        },
      ],
      model: "test-authoring-model",
      response_format: {
        json_schema: { name: "scenario_fixture_content" },
        type: "json_schema",
      },
    });
  });

  it.each([
    [
      "non-JSON output",
      "```json\n{}\n```",
      "SCENARIO_DRAFT_LLM_OUTPUT_NOT_JSON",
    ],
    [
      "too few fields",
      JSON.stringify({ failed: 1, total: 3 }),
      "SCENARIO_DRAFT_CONTENT_FIELD_COUNT_INVALID",
    ],
    [
      "multiple nested collections",
      JSON.stringify({
        first: { value: 1 },
        second: [1, 2],
        status: "partial",
      }),
      "SCENARIO_DRAFT_CONTENT_TOO_NESTED",
    ],
    [
      "reserved action fields",
      JSON.stringify({ actions: ["delete"], status: "ready", total: 3 }),
      "SCENARIO_DRAFT_CONTENT_ACTION_FORBIDDEN",
    ],
    [
      "oversized strings inside arrays",
      JSON.stringify({ items: ["x".repeat(501)], status: "ready", total: 3 }),
      "SCENARIO_DRAFT_CONTENT_ARRAY_INVALID",
    ],
  ])("rejects %s", async (_name, content, expectedError) => {
    const upstream = await modelEndpoint({
      choices: [{ message: { content } }],
    });
    const draft = createScenarioFixtureDrafter({
      apiKey: "test-key",
      baseUrl: upstream.url,
      model: "test-authoring-model",
    });

    await expect(draft("fixture description")).rejects.toThrow(expectedError);
  });

  it("reports provider failures with Scenario authoring semantics", async () => {
    const upstream = await modelEndpoint(
      { error: { message: "provider unavailable" } },
      { status: 503 },
    );
    const draft = createScenarioFixtureDrafter({
      apiKey: "test-key",
      baseUrl: upstream.url,
      model: "test-authoring-model",
    });

    await expect(draft("fixture description")).rejects.toThrow(
      "SCENARIO_DRAFT_LLM_HTTP_503",
    );
  });
});
