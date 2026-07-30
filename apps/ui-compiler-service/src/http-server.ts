import type { PresentationResult } from "@generative-ui/presentation-contract";
import fastify, { type FastifyInstance } from "fastify";
import {
  createHttpServiceConfiguration,
  type HttpServiceConfiguration,
} from "./http-service-configuration.js";
import {
  type HttpObservability,
  noopHttpObservability,
} from "./observability.js";
import type { PresentationRouteOptions } from "./presentation-router.js";

export interface PresentUseCase {
  present(
    input: unknown,
    options: PresentationRouteOptions,
  ): Promise<PresentationResult>;
}

export interface HttpServerDependencies {
  presentUseCase: PresentUseCase;
  configuration?: Partial<HttpServiceConfiguration>;
  observability?: HttpObservability;
}

type ErrorBody = {
  requestId: string;
  status: "failed";
  errors: [
    {
      code: string;
      message: string;
      stage: "input-validation";
      retryable: false;
    },
  ];
};

class RequestDeadlineExceeded {
  readonly code = "REQUEST_TIMEOUT";
}

class RequestCancelled {
  readonly code = "REQUEST_CANCELLED";
}

function awaitWithRequestTermination<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(
      signal.reason === "request-timeout"
        ? new RequestDeadlineExceeded()
        : new RequestCancelled(),
    );
  }
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      signal.addEventListener(
        "abort",
        () =>
          reject(
            signal.reason === "request-timeout"
              ? new RequestDeadlineExceeded()
              : new RequestCancelled(),
          ),
        { once: true },
      );
    }),
  ]);
}

function errorBody(
  requestId: string,
  code: string,
  message: string,
): ErrorBody {
  return {
    requestId,
    status: "failed",
    errors: [{ code, message, stage: "input-validation", retryable: false }],
  };
}

function requestIdFrom(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null) return fallback;
  const descriptor = Object.getOwnPropertyDescriptor(body, "requestId");
  return descriptor !== undefined &&
    "value" in descriptor &&
    typeof descriptor.value === "string" &&
    descriptor.value.length > 0
    ? descriptor.value
    : fallback;
}

export function createHttpServer(
  dependencies: HttpServerDependencies,
): FastifyInstance {
  const configuration = createHttpServiceConfiguration(
    dependencies.configuration,
  );
  const observability = dependencies.observability ?? noopHttpObservability;
  const app = fastify({
    bodyLimit: configuration.maxRequestBytes,
    requestTimeout: configuration.httpRequestBodyTimeoutMs,
    return503OnClosing: false,
    logger: false,
    http: {
      connectionsCheckingInterval:
        configuration.httpConnectionsCheckingIntervalMs,
    },
    onProtoPoisoning: "error",
    onConstructorPoisoning: "error",
  });
  app.server.headersTimeout = configuration.httpHeadersTimeoutMs;
  app.server.requestTimeout = configuration.httpRequestBodyTimeoutMs;
  app.addHook("onRequest", (request, reply, done) => {
    const contentLength = Number(request.headers["content-length"]);
    if (
      Number.isSafeInteger(contentLength) &&
      contentLength > configuration.maxRequestBytes
    ) {
      reply
        .code(413)
        .header("x-request-id", request.id)
        .send(
          errorBody(
            request.id,
            "REQUEST_BODY_TOO_LARGE",
            "Request body is too large.",
          ),
        );
      return;
    }
    done();
  });

  // Omitting handlerTimeout keeps Fastify's route timer disabled. Fastify 5.10
  // rejects an explicit zero even though zero is its documented disabled state.
  app.post(
    "/api/ui-compiler/present",
    { bodyLimit: configuration.maxRequestBytes },
    async (request, reply) => {
      const transportRequestId = request.id;
      const requestId = requestIdFrom(request.body, transportRequestId);
      observability.record("ui_compiler.http.request_started", {
        transportRequestId,
      });
      if (
        request.headers["content-encoding"] !== undefined &&
        request.headers["content-encoding"] !== "identity"
      ) {
        const body = errorBody(
          requestId,
          "UNSUPPORTED_CONTENT_ENCODING",
          "Content encoding is not supported.",
        );
        observability.record("ui_compiler.http.request_completed", {
          transportRequestId,
          requestId,
          httpStatusCode: 415,
        });
        return reply.code(415).header("x-request-id", requestId).send(body);
      }
      const controller = new AbortController();
      const deadline = setTimeout(
        () => controller.abort("request-timeout"),
        configuration.requestDeadlineMs,
      );
      const onRequestClose = () => {
        if (!request.raw.complete) controller.abort("client-disconnected");
      };
      const onReplyClose = () => {
        if (!reply.raw.writableFinished)
          controller.abort("client-disconnected");
      };
      request.raw.once("close", onRequestClose);
      reply.raw.once("close", onReplyClose);
      try {
        const result = await awaitWithRequestTermination(
          dependencies.presentUseCase.present(request.body, {
            signal: controller.signal,
          }),
          controller.signal,
        );
        if (controller.signal.aborted || reply.raw.destroyed) {
          observability.record(
            controller.signal.reason === "request-timeout"
              ? "ui_compiler.http.request_timed_out"
              : "ui_compiler.http.request_cancelled",
            { transportRequestId, requestId },
          );
          return;
        }
        observability.record("ui_compiler.http.request_completed", {
          transportRequestId,
          requestId: result.requestId,
          httpStatusCode: 200,
          degraded: result.status === "degraded",
        });
        return reply
          .code(200)
          .header("x-request-id", result.requestId)
          .send(result);
      } catch {
        if (caught instanceof RequestDeadlineExceeded) {
          const body = errorBody(
            requestId,
            "REQUEST_TIMEOUT",
            "The request timed out.",
          );
          observability.record("ui_compiler.http.request_timed_out", {
            transportRequestId,
            requestId,
            httpStatusCode: 504,
          });
          return reply.code(504).header("x-request-id", requestId).send(body);
        }
        if (controller.signal.aborted || reply.raw.destroyed) {
          observability.record("ui_compiler.http.request_cancelled", {
            transportRequestId,
            requestId,
          });
          return;
        }
        const body = errorBody(
          requestId,
          "PRESENTATION_REQUEST_FAILED",
          "The presentation request could not be completed.",
        );
        observability.record("ui_compiler.http.request_completed", {
          transportRequestId,
          requestId,
          httpStatusCode: 500,
        });
        return reply.code(500).header("x-request-id", requestId).send(body);
      } finally {
        clearTimeout(deadline);
        request.raw.removeListener("close", onRequestClose);
        reply.raw.removeListener("close", onReplyClose);
      }
    },
  );

  app.setErrorHandler(
    (
      caught: { code?: string; statusCode?: number; message?: string },
      request,
      reply,
    ) => {
      const requestId = request.id;
      const tooLarge =
        caught.code === "FST_ERR_CTP_BODY_TOO_LARGE" ||
        caught.statusCode === 413;
      const invalidJson =
        caught.code === "FST_ERR_CTP_EMPTY_JSON_BODY" ||
        caught.code === "FST_ERR_CTP_INVALID_JSON_BODY";
      const status = tooLarge ? 413 : invalidJson ? 400 : 500;
      const code = tooLarge
        ? "REQUEST_BODY_TOO_LARGE"
        : invalidJson
          ? "PRESENTATION_REQUEST_INVALID"
          : "PRESENTATION_REQUEST_FAILED";
      return reply
        .code(status)
        .header("x-request-id", requestId)
        .send(
          errorBody(
            requestId,
            code,
            status === 413
              ? "Request body is too large."
              : "Presentation request is invalid.",
          ),
        );
    },
  );
  return app;
}
