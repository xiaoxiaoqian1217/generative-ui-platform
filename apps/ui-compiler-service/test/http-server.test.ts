import { describe, expect, it } from "vitest";
import { createHttpServer } from "../src/http-server.js";

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
});
