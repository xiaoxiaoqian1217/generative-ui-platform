import type {
  PresentationError,
  PresentationResult,
} from "@generative-ui/presentation-contract";
import { validatePresentationRequest } from "@generative-ui/presentation-contract";
import fastify, { type FastifyInstance } from "fastify";
import {
  createHttpServiceConfiguration,
  type HttpServiceConfiguration,
} from "./http-service-configuration.js";
import {
  createTrackedHttpRequestObservation,
  type HttpObservability,
  isStableObservationErrorCode,
  noopHttpObservability,
  type ObservationStage,
  type TrackedHttpRequestObservation,
  type TrackedRequestTerminal,
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
  monotonicNow?: () => number;
  version?: string;
}

export interface ManagedHttpServer extends FastifyInstance {
  closeGracefully(): Promise<void>;
}

type ErrorBody = {
  requestId: string;
  status: "failed";
  errors: [
    {
      code: string;
      message: string;
      stage: PresentationError["stage"];
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
  stage: PresentationError["stage"] = "input-validation",
): ErrorBody {
  return {
    requestId,
    status: "failed",
    errors: [{ code, message, stage, retryable: false }],
  };
}

function presentationErrorStage(
  stage: ObservationStage | undefined,
): PresentationError["stage"] {
  switch (stage) {
    case "content-serialization":
    case "presentation-routing":
    case "model-analysis":
    case "ui-plan-validation":
    case "ui-compilation":
      return stage;
    default:
      return "input-validation";
  }
}

type ValidatedObservationFields = Pick<
  TrackedRequestTerminal,
  | "requestId"
  | "catalogId"
  | "catalogVersion"
  | "hasPresentationContext"
  | "hasUserMessage"
>;

function validatedObservationFields(
  body: unknown,
): ValidatedObservationFields | undefined {
  try {
    const validated = validatePresentationRequest(body);
    if (!validated.success) return undefined;
    return {
      requestId: validated.value.requestId,
      catalogId: validated.value.catalog.catalogId,
      catalogVersion: validated.value.catalog.catalogVersion,
      hasPresentationContext: validated.value.context !== undefined,
      hasUserMessage:
        validated.value.context?.userMessage !== undefined &&
        validated.value.context.userMessage.length > 0,
    };
  } catch {
    return undefined;
  }
}

function errorStageFrom(
  result: PresentationResult,
): ObservationStage | undefined {
  if (result.status !== "failed" && result.status !== "degraded") {
    return undefined;
  }
  const stage = result.errors[0]?.stage;
  return stage === "input-validation" ||
    stage === "content-serialization" ||
    stage === "presentation-routing" ||
    stage === "model-analysis" ||
    stage === "ui-plan-validation" ||
    stage === "ui-compilation"
    ? stage
    : undefined;
}

function terminalForResult(
  result: PresentationResult,
  validated: ValidatedObservationFields | undefined,
): TrackedRequestTerminal {
  const firstError =
    result.status === "failed" || result.status === "degraded"
      ? result.errors[0]
      : undefined;
  const stableErrorCode = isStableObservationErrorCode(firstError?.code)
    ? firstError.code
    : undefined;
  const errorStage = errorStageFrom(result);
  return {
    outcome: "completed",
    httpStatusCode: 200,
    ...(validated === undefined ? {} : validated),
    ...("mode" in result ? { finalMode: result.mode } : {}),
    degraded: result.status === "degraded",
    ...(result.status === "degraded" && stableErrorCode !== undefined
      ? { degradationReasonCode: stableErrorCode }
      : {}),
    ...(result.status === "failed" && stableErrorCode !== undefined
      ? { errorCode: stableErrorCode }
      : {}),
    ...(result.status === "failed" && errorStage !== undefined
      ? { errorStage }
      : {}),
  };
}

export function createHttpServer(
  dependencies: HttpServerDependencies,
): ManagedHttpServer {
  const configuration = createHttpServiceConfiguration(
    dependencies.configuration,
  );
  const observability = dependencies.observability ?? noopHttpObservability;
  const compilerVersion = dependencies.version ?? "0.1.0";
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
  let closing = false;
  const activeRequests = new Set<AbortController>();
  const requestObservations = new WeakMap<
    object,
    TrackedHttpRequestObservation
  >();
  const pendingResponseTerminals = new WeakSet<object>();
  const terminalRequests = new WeakSet<object>();
  const lifecycleCleanups = new WeakMap<object, () => void>();
  const observationFor = (request: object) => requestObservations.get(request);
  const finishRequest = (
    request: object,
    terminal: TrackedRequestTerminal,
  ): void => {
    if (terminalRequests.has(request)) return;
    terminalRequests.add(request);
    observationFor(request)?.finish(terminal);
  };
  const scheduleResponseTerminal = (
    request: object,
    terminal: TrackedRequestTerminal,
  ): void => {
    const observation = observationFor(request);
    if (observation !== undefined) {
      observation.seal(terminal);
      pendingResponseTerminals.add(request);
    }
  };
  const flushResponseTerminal = (
    request: object,
    httpStatusCode: number,
  ): void => {
    if (terminalRequests.has(request)) return;
    terminalRequests.add(request);
    observationFor(request)?.flush(httpStatusCode);
  };
  app.addHook("onRequest", (request, reply, done) => {
    if (
      request.method === "POST" &&
      request.url.split("?")[0] === "/api/ui-compiler/present"
    ) {
      const observation = createTrackedHttpRequestObservation(
        observability,
        {
          observationVersion: "1.0",
          transportRequestId: request.id,
          compilerVersion,
          receivedAtUnixMs: Date.now(),
        },
        dependencies.monotonicNow,
      );
      observation.stages.setCurrentStage?.("http-receive");
      requestObservations.set(request, observation);
      const cleanup = (): void => {
        request.raw.removeListener("close", onRequestClose);
        reply.raw.removeListener("close", onReplyClose);
        lifecycleCleanups.delete(request);
      };
      const finishDisconnected = (): void => {
        pendingResponseTerminals.delete(request);
        const errorStage = observation.currentStage();
        finishRequest(request, {
          outcome: "client-disconnected",
          ...(errorStage === undefined ? {} : { errorStage }),
        });
        cleanup();
      };
      const onRequestClose = (): void => {
        if (!request.raw.complete) finishDisconnected();
      };
      const onReplyClose = (): void => {
        if (!reply.raw.writableFinished) finishDisconnected();
      };
      request.raw.once("close", onRequestClose);
      reply.raw.once("close", onReplyClose);
      lifecycleCleanups.set(request, cleanup);
    }
    done();
  });
  app.addHook("onResponse", (request, reply, done) => {
    const hasPendingTerminal = pendingResponseTerminals.has(request);
    lifecycleCleanups.get(request)?.();
    if (hasPendingTerminal) {
      flushResponseTerminal(request, reply.statusCode);
      pendingResponseTerminals.delete(request);
    }
    done();
  });
  app.addHook("onRequest", (request, reply, done) => {
    if (closing && request.url !== "/health") {
      const observation = observationFor(request);
      observation?.stages.recordStageCompletion({
        stage: "http-receive",
        result: "failed",
        durationMs: observation?.elapsedMs() ?? 0,
        errorCode: "SERVICE_SHUTTING_DOWN",
      });
      scheduleResponseTerminal(request, {
        outcome: "rejected",
        httpStatusCode: 503,
        errorCode: "SERVICE_SHUTTING_DOWN",
        errorStage: "http-receive",
      });
      reply
        .header("connection", "close")
        .code(503)
        .send(
          errorBody(
            request.id,
            "SERVICE_SHUTTING_DOWN",
            "Service is shutting down.",
          ),
        );
      return;
    }
    done();
  });
  app.get("/health", async () => ({ status: closing ? "closing" : "ok" }));
  app.get("/version", async () => ({
    service: "ui-compiler-service",
    version: compilerVersion,
  }));
  app.server.headersTimeout = configuration.httpHeadersTimeoutMs;
  app.server.requestTimeout = configuration.httpRequestBodyTimeoutMs;
  app.addHook("onRequest", (request, reply, done) => {
    const contentLength = Number(request.headers["content-length"]);
    if (
      Number.isSafeInteger(contentLength) &&
      contentLength > configuration.maxRequestBytes
    ) {
      const observation = observationFor(request);
      observation?.stages.recordStageCompletion({
        stage: "http-receive",
        result: "failed",
        durationMs: observation?.elapsedMs() ?? 0,
        errorCode: "REQUEST_BODY_TOO_LARGE",
      });
      scheduleResponseTerminal(request, {
        outcome: "rejected",
        httpStatusCode: 413,
        errorCode: "REQUEST_BODY_TOO_LARGE",
        errorStage: "http-receive",
      });
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
      const observation = observationFor(request);
      const validated = validatedObservationFields(request.body);
      const responseRequestId = validated?.requestId ?? transportRequestId;
      if (
        request.headers["content-encoding"] !== undefined &&
        request.headers["content-encoding"] !== "identity"
      ) {
        const body = errorBody(
          responseRequestId,
          "UNSUPPORTED_CONTENT_ENCODING",
          "Content encoding is not supported.",
        );
        observation?.stages.recordStageCompletion({
          stage: "http-receive",
          result: "failed",
          durationMs: observation?.elapsedMs() ?? 0,
          errorCode: "UNSUPPORTED_CONTENT_ENCODING",
          ...(validated === undefined
            ? {}
            : {
                requestId: validated.requestId,
                catalogId: validated.catalogId,
                catalogVersion: validated.catalogVersion,
              }),
        });
        scheduleResponseTerminal(request, {
          outcome: "rejected",
          httpStatusCode: 415,
          errorCode: "UNSUPPORTED_CONTENT_ENCODING",
          errorStage: "http-receive",
          ...(validated === undefined ? {} : validated),
        });
        return reply
          .code(415)
          .header("x-request-id", responseRequestId)
          .send(body);
      }
      observation?.stages.recordStageCompletion({
        stage: "http-receive",
        result: "completed",
        durationMs: observation?.elapsedMs() ?? 0,
        ...(validated === undefined
          ? {}
          : {
              requestId: validated.requestId,
              catalogId: validated.catalogId,
              catalogVersion: validated.catalogVersion,
            }),
      });
      const controller = new AbortController();
      activeRequests.add(controller);
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
            ...(observation === undefined
              ? {}
              : { observation: observation.stages }),
          }),
          controller.signal,
        );
        if (controller.signal.aborted || reply.raw.destroyed) {
          if (controller.signal.reason === "client-disconnected") {
            finishRequest(request, {
              outcome: "client-disconnected",
              ...(validated === undefined ? {} : validated),
            });
          } else if (controller.signal.reason === "request-timeout") {
            finishRequest(request, {
              outcome: "timed-out",
              errorCode: "REQUEST_TIMEOUT",
              ...(validated === undefined ? {} : validated),
            });
          } else {
            finishRequest(request, {
              outcome: "cancelled",
              errorCode: "REQUEST_CANCELLED",
              ...(validated === undefined ? {} : validated),
            });
          }
          return;
        }
        scheduleResponseTerminal(request, terminalForResult(result, validated));
        return reply
          .code(200)
          .header("x-request-id", result.requestId)
          .send(result);
      } catch (caught) {
        if (caught instanceof RequestDeadlineExceeded) {
          const timeoutStage = observation?.currentStage();
          const body = errorBody(
            responseRequestId,
            "REQUEST_TIMEOUT",
            "The request timed out.",
            presentationErrorStage(timeoutStage),
          );
          scheduleResponseTerminal(request, {
            outcome: "timed-out",
            httpStatusCode: 504,
            errorCode: "REQUEST_TIMEOUT",
            ...(timeoutStage === undefined ? {} : { errorStage: timeoutStage }),
            ...(validated === undefined ? {} : validated),
          });
          return reply
            .code(504)
            .header("x-request-id", responseRequestId)
            .send(body);
        }
        if (controller.signal.aborted || reply.raw.destroyed) {
          if (controller.signal.reason === "client-disconnected") {
            finishRequest(request, {
              outcome: "client-disconnected",
              ...(validated === undefined ? {} : validated),
            });
          } else {
            finishRequest(request, {
              outcome: "cancelled",
              errorCode: "REQUEST_CANCELLED",
              ...(validated === undefined ? {} : validated),
            });
          }
          return;
        }
        const failureStage = observation?.currentStage();
        const body = errorBody(
          responseRequestId,
          "PRESENTATION_REQUEST_FAILED",
          "The presentation request could not be completed.",
          presentationErrorStage(failureStage),
        );
        scheduleResponseTerminal(request, {
          outcome: "rejected",
          httpStatusCode: 500,
          errorCode: "INTERNAL_ERROR",
          ...(failureStage === undefined ? {} : { errorStage: failureStage }),
          ...(validated === undefined ? {} : validated),
        });
        return reply
          .code(500)
          .header("x-request-id", responseRequestId)
          .send(body);
      } finally {
        clearTimeout(deadline);
        request.raw.removeListener("close", onRequestClose);
        reply.raw.removeListener("close", onReplyClose);
        activeRequests.delete(controller);
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
      const observation = observationFor(request);
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
      const observationCode = tooLarge
        ? "REQUEST_BODY_TOO_LARGE"
        : invalidJson
          ? "PRESENTATION_REQUEST_INVALID"
          : "INTERNAL_ERROR";
      const knownApplicationStage = observation?.currentStage();
      const observationStage =
        tooLarge || invalidJson ? "http-receive" : knownApplicationStage;
      if (tooLarge || invalidJson) {
        observation?.stages.recordStageCompletion({
          stage: "http-receive",
          result: "failed",
          durationMs: observation?.elapsedMs() ?? 0,
          errorCode: observationCode,
        });
      }
      scheduleResponseTerminal(request, {
        outcome: "rejected",
        httpStatusCode: status,
        errorCode: observationCode,
        ...(observationStage === undefined ||
        (!tooLarge && !invalidJson && observationStage === "http-receive")
          ? { deriveErrorStage: false }
          : { errorStage: observationStage }),
      });
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
            presentationErrorStage(observationStage),
          ),
        );
    },
  );
  const managed = app as unknown as ManagedHttpServer;
  managed.closeGracefully = async () => {
    if (closing) return;
    closing = true;
    app.server.closeIdleConnections();
    const closePromise = app.close();
    const cancellationTimer = setTimeout(() => {
      for (const controller of activeRequests)
        controller.abort("service-shutdown");
    }, configuration.shutdownGraceMs);
    const forceCloseTimer = setTimeout(
      () => app.server.closeAllConnections(),
      configuration.shutdownGraceMs + 1_000,
    );
    try {
      await closePromise;
    } finally {
      clearTimeout(cancellationTimer);
      clearTimeout(forceCloseTimer);
    }
  };
  return managed;
}
