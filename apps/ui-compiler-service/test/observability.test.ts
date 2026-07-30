import { describe, expect, it, vi } from "vitest";
import {
  createJsonLineHttpObservability,
  createTrackedHttpRequestObservation,
  type SafeRequestObservationStart,
} from "../src/observability.js";

const start: SafeRequestObservationStart = {
  observationVersion: "1.0",
  transportRequestId: "transport-1",
  compilerVersion: "1.2.3",
  receivedAtUnixMs: 100,
};

describe("JSON line HTTP observability", () => {
  it("writes versioned start, stage, and terminal events with only approved fields", () => {
    const lines: string[] = [];
    const port = createJsonLineHttpObservability({
      now: () => 123,
      write: (line) => lines.push(line),
    });
    const tracker = createTrackedHttpRequestObservation(port, start, () => 10);

    tracker.stages.recordStageCompletion({
      stage: "catalog-resolution",
      result: "completed",
      durationMs: 3,
      requestId: "request-1",
      catalogId: "catalog-1",
      catalogVersion: "1.0.0",
      catalogContentHash: `sha256:${"a".repeat(64)}`,
    });
    tracker.stages.recordStageCompletion({
      stage: "model-analysis",
      result: "completed",
      durationMs: 7,
      requestId: "request-1",
      catalogId: "catalog-1",
      catalogVersion: "1.0.0",
      modelCalled: true,
      modelAttemptCount: 2,
      modelRetried: true,
    });
    tracker.finish({
      outcome: "completed",
      httpStatusCode: 200,
      requestId: "request-1",
      catalogId: "unverified-catalog",
      catalogVersion: "unverified-version",
      hasPresentationContext: true,
      hasUserMessage: false,
      finalMode: "generative-ui",
      degraded: false,
    });

    expect(lines.map((line) => JSON.parse(line))).toEqual([
      {
        observationVersion: "1.0",
        eventName: "ui_compiler.http.request_started",
        timestampUnixMs: 123,
        transportRequestId: "transport-1",
        compilerVersion: "1.2.3",
        receivedAtUnixMs: 100,
      },
      {
        observationVersion: "1.0",
        eventName: "ui_compiler.http.stage_completed",
        timestampUnixMs: 123,
        transportRequestId: "transport-1",
        requestId: "request-1",
        catalogId: "catalog-1",
        catalogVersion: "1.0.0",
        catalogContentHash: `sha256:${"a".repeat(64)}`,
        stage: "catalog-resolution",
        result: "completed",
        durationMs: 3,
      },
      {
        observationVersion: "1.0",
        eventName: "ui_compiler.http.stage_completed",
        timestampUnixMs: 123,
        transportRequestId: "transport-1",
        requestId: "request-1",
        catalogId: "catalog-1",
        catalogVersion: "1.0.0",
        catalogContentHash: `sha256:${"a".repeat(64)}`,
        stage: "model-analysis",
        result: "completed",
        durationMs: 7,
        modelCalled: true,
        modelAttemptCount: 2,
        modelRetried: true,
      },
      {
        observationVersion: "1.0",
        eventName: "ui_compiler.http.request_completed",
        timestampUnixMs: 123,
        transportRequestId: "transport-1",
        compilerVersion: "1.2.3",
        outcome: "completed",
        httpStatusCode: 200,
        requestId: "request-1",
        catalogId: "catalog-1",
        catalogVersion: "1.0.0",
        catalogContentHash: `sha256:${"a".repeat(64)}`,
        hasPresentationContext: true,
        hasUserMessage: false,
        finalMode: "generative-ui",
        degraded: false,
        totalDurationMs: 0,
        modelCalled: true,
        modelAttemptCount: 2,
        modelRetried: true,
        modelDurationMs: 7,
      },
    ]);
  });

  it("emits at most one terminal event and counts rejected duplicate writes", () => {
    const lines: string[] = [];
    const port = createJsonLineHttpObservability({
      now: () => 123,
      write: (line) => lines.push(line),
    });
    const tracker = createTrackedHttpRequestObservation(port, start, () => 10);

    tracker.finish({ outcome: "rejected", errorCode: "INTERNAL_ERROR" });
    tracker.finish({ outcome: "rejected", errorCode: "INTERNAL_ERROR" });
    tracker.stages.recordStageCompletion({
      stage: "input-validation",
      result: "completed",
      durationMs: 1,
    });

    expect(
      lines.filter((line) => line.includes("request_completed")),
    ).toHaveLength(1);
    expect(
      lines.filter((line) => line.includes("stage_completed")),
    ).toHaveLength(0);
    expect(port.sinkFailureCount()).toBe(1);
  });

  it("seals terminal fields and rejects late stage mutations before flush", () => {
    const lines: string[] = [];
    const port = createJsonLineHttpObservability({
      now: () => 123,
      write: (line) => lines.push(line),
    });
    const tracker = createTrackedHttpRequestObservation(port, start, () => 10);
    tracker.stages.setCurrentStage?.("model-analysis");
    tracker.stages.recordStageCompletion({
      stage: "model-analysis",
      result: "cancelled",
      durationMs: 4,
      errorCode: "MODEL_CANCELLED",
      modelCalled: true,
      modelAttemptCount: 1,
      modelRetried: false,
    });

    tracker.seal({
      outcome: "timed-out",
      httpStatusCode: 504,
      errorCode: "REQUEST_TIMEOUT",
    });
    tracker.stages.setCurrentStage?.("ui-compilation");
    tracker.stages.recordStageCompletion({
      stage: "ui-compilation",
      result: "failed",
      durationMs: 99,
      errorCode: "UI_COMPILE_REQUEST_INVALID",
    });
    tracker.flush();

    const events = lines.map((line) => JSON.parse(line));
    expect(
      events.filter(
        (event) => event.eventName === "ui_compiler.http.stage_completed",
      ),
    ).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({
      eventName: "ui_compiler.http.request_timed_out",
      errorStage: "model-analysis",
      modelCalled: true,
      modelAttemptCount: 1,
      modelDurationMs: 4,
    });
    expect(events.at(-1)).not.toHaveProperty("compileDurationMs");
  });

  it("isolates clock, projection, and sink failures from request behavior", () => {
    const port = createJsonLineHttpObservability({
      now: () => {
        throw new Error("clock failed");
      },
      write: () => {
        throw new Error("sink failed");
      },
    });

    expect(() => {
      const tracker = createTrackedHttpRequestObservation(port, start, () => {
        throw new Error("monotonic clock failed");
      });
      tracker.stages.recordStageCompletion({
        stage: "input-validation",
        result: "failed",
        durationMs: 0,
        errorCode: "PRESENTATION_REQUEST_INVALID",
      });
      tracker.finish({
        outcome: "rejected",
        httpStatusCode: 400,
        errorCode: "PRESENTATION_REQUEST_INVALID",
        errorStage: "input-validation",
      });
    }).not.toThrow();
    expect(port.sinkFailureCount()).toBeGreaterThan(0);
  });

  it("uses process stdout as the default sink", () => {
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    try {
      const port = createJsonLineHttpObservability({ now: () => 123 });
      createTrackedHttpRequestObservation(port, start, () => 10).finish({
        outcome: "rejected",
        errorCode: "INTERNAL_ERROR",
      });

      expect(write).toHaveBeenCalled();
      expect(write.mock.calls.every(([line]) => `${line}`.endsWith("\n"))).toBe(
        true,
      );
    } finally {
      write.mockRestore();
    }
  });

  it("captures the total-duration clock before the start event reaches the sink", () => {
    const order: string[] = [];
    const port = createJsonLineHttpObservability({
      write: () => order.push("sink"),
    });

    createTrackedHttpRequestObservation(port, start, () => {
      order.push("clock");
      return 10;
    });

    expect(order.slice(0, 2)).toEqual(["clock", "sink"]);
  });

  it("measures total duration at flush instead of seal", () => {
    const lines: string[] = [];
    const ticks = [10, 35];
    const port = createJsonLineHttpObservability({
      write: (line) => lines.push(line),
    });
    const tracker = createTrackedHttpRequestObservation(
      port,
      start,
      () => ticks.shift() ?? 35,
    );

    tracker.seal({
      outcome: "completed",
      httpStatusCode: 200,
      finalMode: "markdown",
      degraded: false,
    });
    tracker.flush(201);

    expect(JSON.parse(lines.at(-1) ?? "{}")).toMatchObject({
      totalDurationMs: 25,
      httpStatusCode: 201,
    });
  });

  it("never serializes arbitrary payload fields or unsafe values", () => {
    const lines: string[] = [];
    const port = createJsonLineHttpObservability({
      now: () => 123,
      write: (line) => lines.push(line),
    });
    const sentinels = Array.from(
      { length: 32 },
      (_, index) => `GENERATED_OBSERVABILITY_SECRET_${index}`,
    );
    for (const secret of sentinels) {
      const tracker = createTrackedHttpRequestObservation(
        port,
        start,
        () => 10,
      );
      tracker.stages.recordStageCompletion({
        stage: "input-validation",
        result: "failed",
        durationMs: 0,
        errorCode: "PRESENTATION_REQUEST_INVALID",
        payload: { nested: [secret] },
        authorization: `Bearer ${secret}`,
        markdown: secret,
        error: new Error(secret),
      } as never);
      tracker.finish({
        outcome: "rejected",
        errorCode: "PRESENTATION_REQUEST_INVALID",
        payload: { nested: [secret] },
      } as never);
    }

    for (const secret of sentinels) {
      expect(lines.join("\n")).not.toContain(secret);
    }
    for (const line of lines) {
      expect(JSON.parse(line)).not.toHaveProperty("payload");
      expect(JSON.parse(line)).not.toHaveProperty("authorization");
      expect(JSON.parse(line)).not.toHaveProperty("markdown");
      expect(JSON.parse(line)).not.toHaveProperty("error");
    }
  });
});
