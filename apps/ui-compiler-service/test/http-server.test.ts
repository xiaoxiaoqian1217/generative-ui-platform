import { describe, expect, it } from "vitest";
import { createHttpServer } from "../src/http-server.js";
import { createJsonLineHttpObservability } from "../src/observability.js";

const request = {
  requestId: "request-1",
  content: { contentType: "markdown", markdown: "# hello" },
  catalog: { catalogId: "test", catalogVersion: "1" },
};

describe("HTTP presentation endpoint", () => {
  it("returns the PresentationResult from the application use case", async () => {
    const app = createHttpServer({
      presentUseCase: {
        present: async () => ({
          requestId: "request-1",
          status: "completed",
          mode: "markdown",
          markdown: "# hello",
        }),
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: request,
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe("request-1");
    expect(response.json()).toEqual({
      requestId: "request-1",
      status: "completed",
      mode: "markdown",
      markdown: "# hello",
    });
    await app.close();
  }, 20_000);

  it("rejects an oversized body before the use case runs", async () => {
    let called = false;
    const app = createHttpServer({
      configuration: { maxRequestBytes: 1_024 },
      presentUseCase: {
        present: async () => {
          called = true;
          return {
            requestId: "request-1",
            status: "completed",
            mode: "markdown",
            markdown: "# hello",
          };
        },
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: JSON.stringify({
        ...request,
        content: { contentType: "markdown", markdown: "x".repeat(2_000) },
      }),
    });
    expect(response.statusCode).toBe(413);
    expect(response.json().errors[0].code).toBe("REQUEST_BODY_TOO_LARGE");
    expect(called).toBe(false);
    await app.close();
  });

  it("never logs an unvalidated caller requestId on a transport rejection", async () => {
    const secret = "UNVALIDATED_REQUEST_ID_MUST_NOT_ESCAPE";
    const lines: string[] = [];
    const app = createHttpServer({
      observability: createJsonLineHttpObservability({
        now: () => 123,
        write: (line) => lines.push(line),
      }),
      presentUseCase: {
        present: async () => ({
          requestId: "unknown",
          status: "failed",
          errors: [
            {
              code: "PRESENTATION_REQUEST_INVALID",
              message: "Presentation request is invalid.",
              stage: "input-validation",
              retryable: false,
            },
          ],
        }),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      headers: { "content-encoding": "br" },
      payload: { requestId: secret },
    });

    expect(response.statusCode).toBe(415);
    expect(response.headers["x-request-id"]).not.toBe(secret);
    expect(response.json().requestId).not.toBe(secret);
    expect(lines.join("\n")).not.toContain(secret);
    const events = lines.map((line) => JSON.parse(line));
    expect(events).toHaveLength(3);
    expect(events[0].eventName).toBe("ui_compiler.http.request_started");
    expect(events.at(-1)).toMatchObject({
      eventName: "ui_compiler.http.request_completed",
      outcome: "rejected",
      httpStatusCode: 415,
      errorCode: "UNSUPPORTED_CONTENT_ENCODING",
    });
    expect(events.at(-1)).not.toHaveProperty("requestId");
    await app.close();
  });

  it("records the terminal event after Fastify serializes the response", async () => {
    const lifecycle: string[] = [];
    const app = createHttpServer({
      observability: createJsonLineHttpObservability({
        write: (line) => {
          const event = JSON.parse(line);
          if (event.eventName === "ui_compiler.http.request_completed") {
            lifecycle.push("terminal");
          }
        },
      }),
      presentUseCase: {
        present: async () => ({
          requestId: "request-1",
          status: "completed",
          mode: "markdown",
          markdown: "# hello",
        }),
      },
    });
    app.addHook("onSend", async (_request, _reply, payload) => {
      lifecycle.push("serialized");
      return payload;
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: request,
    });

    expect(response.statusCode).toBe(200);
    expect(lifecycle).toEqual(["serialized", "terminal"]);
    await app.close();
  });

  it("replaces a sealed success when response serialization fails", async () => {
    const lines: string[] = [];
    let failSerialization = true;
    const app = createHttpServer({
      observability: createJsonLineHttpObservability({
        write: (line) => lines.push(line),
      }),
      presentUseCase: {
        present: async () => ({
          requestId: "serialization-failure",
          status: "completed",
          mode: "markdown",
          markdown: "# hello",
        }),
      },
    });
    app.addHook("onSend", async (_request, _reply, payload) => {
      if (failSerialization) {
        failSerialization = false;
        throw new Error("serialization failed");
      }
      return payload;
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: { ...request, requestId: "serialization-failure" },
    });

    expect(response.statusCode).toBe(500);
    const terminalEvents = lines
      .map((line) => JSON.parse(line))
      .filter(
        (event) => event.eventName === "ui_compiler.http.request_completed",
      );
    expect(terminalEvents).toHaveLength(1);
    expect(terminalEvents[0]).toMatchObject({
      outcome: "rejected",
      httpStatusCode: 500,
      errorCode: "INTERNAL_ERROR",
    });
    expect(terminalEvents[0]).not.toHaveProperty("errorStage");
    await app.close();
  });
});
