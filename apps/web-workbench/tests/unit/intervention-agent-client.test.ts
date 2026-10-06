import { randomUUID } from "node:crypto";
import { EventType } from "@ag-ui/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AgentClientStatus,
  type AgentProtocolRecord,
  createInterventionAgentClient,
  type InterventionAgentEnvelope,
} from "../../src/features/intervention-lab/client.js";
import type { LabAction } from "../../src/features/intervention-lab/model.js";
import { createInterventionAgentServer } from "../../src/features/intervention-lab/server/index.js";

interface RecordedRequest {
  path: string;
  method: string;
  body?: Record<string, unknown>;
}
interface ResponseGate {
  path: string;
  used: boolean;
  entered: Promise<void>;
  markEntered(): void;
  pause: Promise<void>;
  release(): void;
}

let server: ReturnType<typeof createInterventionAgentServer>;
const nativeFetch = globalThis.fetch;
const clients = new Set<ReturnType<typeof createInterventionAgentClient>>();
const requests: RecordedRequest[] = [];
const gates: ResponseGate[] = [];

function holdResponse(path: string): ResponseGate {
  let markEntered: () => void = () => {};
  let release: () => void = () => {};
  const entered = new Promise<void>((resolve) => {
    markEntered = resolve;
  });
  const pause = new Promise<void>((resolve) => {
    release = resolve;
  });
  const gate = { path, used: false, entered, markEntered, pause, release };
  gates.push(gate);
  return gate;
}

function harness(
  onStatus?: (
    status: AgentClientStatus,
    envelopes: InterventionAgentEnvelope[],
  ) => void,
) {
  const envelopes: InterventionAgentEnvelope[] = [];
  const statuses: AgentClientStatus[] = [];
  const events: AgentProtocolRecord[] = [];
  const notices: string[] = [];
  const client = createInterventionAgentClient({
    onEnvelope(envelope) {
      envelopes.push(structuredClone(envelope));
    },
    onStatus(status) {
      statuses.push(structuredClone(status));
      onStatus?.(status, envelopes);
    },
    onEvent(record) {
      events.push(structuredClone(record));
    },
    onNotice(detail) {
      notices.push(detail);
    },
  });
  clients.add(client);
  return { client, envelopes, statuses, events, notices };
}

function runRequests(): RecordedRequest[] {
  return requests.filter(
    (request) =>
      request.method === "POST" &&
      request.path === "/api/intervention-agent/run",
  );
}

async function flushScheduledWork(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

beforeEach(async () => {
  server = createInterventionAgentServer({
    host: "127.0.0.1",
    port: 0,
    tickMs: 20,
  });
  await server.start();
  // The feature uses same-origin relative URLs. This wrapper only supplies an
  // origin and optionally delays delivery of an actual completed HTTP response.
  // SSE bytes, response JSON and server state remain entirely unmodified.
  vi.stubGlobal(
    "fetch",
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const url = new URL(rawUrl, server.url);
      const method =
        init?.method ?? (input instanceof Request ? input.method : "GET");
      const body =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : undefined;
      requests.push({ path: url.pathname, method, ...(body ? { body } : {}) });
      const gate = gates.find(
        (candidate) =>
          candidate.path === url.pathname &&
          !candidate.used &&
          method === "GET",
      );
      if (gate) gate.used = true;
      const response = await nativeFetch(url.href, init);
      if (gate) {
        gate.markEntered();
        await gate.pause;
      }
      return response;
    },
  );
});

afterEach(async () => {
  for (const client of clients) client.close();
  for (const gate of gates) gate.release();
  await server.stop();
  await flushScheduledWork();
  vi.unstubAllGlobals();
  clients.clear();
  requests.length = 0;
  gates.length = 0;
});

describe("intervention client transport lifecycle against the real Agent service", () => {
  it("does not create a run or revive state after close while the real health response is delayed", async () => {
    const gate = holdResponse("/api/intervention-agent/health");
    const observed = harness();
    const starting = observed.client.start("priority-cooperation", true);
    await gate.entered;
    expect(observed.statuses.at(-1)?.connection).toBe("connecting");
    observed.client.close();
    gate.release();
    await starting;
    await flushScheduledWork();
    expect(runRequests()).toEqual([]);
    expect(observed.envelopes).toEqual([]);
    expect(observed.events).toEqual([]);
    expect(observed.statuses.at(-1)).toMatchObject({
      connection: "idle",
      busy: false,
      streamActive: false,
    });
    const health = await nativeFetch(
      new URL("/api/intervention-agent/health", server.url),
    );
    expect(((await health.json()) as { tasks: number }).tasks).toBe(0);
  });

  it("does not apply a delayed old reconnect snapshot after starting a new task", async () => {
    const observed = harness();
    await observed.client.start("priority-cooperation", true);
    await vi.waitFor(() => {
      expect(observed.envelopes.length).toBeGreaterThan(0);
      expect(observed.statuses.at(-1)).toMatchObject({
        connection: "connected",
        busy: false,
      });
    });
    const oldTaskId = observed.envelopes.at(-1)!.task.runId;
    const gate = holdResponse(
      `/api/intervention-agent/tasks/${encodeURIComponent(oldTaskId)}`,
    );
    const reconnecting = observed.client.reconnect();
    await gate.entered;
    await observed.client.start("observation-cooperation", true);
    await vi.waitFor(() => {
      const latest = observed.envelopes.at(-1)!;
      expect(latest.scenarioId).toBe("observation-cooperation");
      expect(latest.task.runId).not.toBe(oldTaskId);
      expect(observed.statuses.at(-1)).toMatchObject({
        connection: "connected",
        busy: false,
      });
    });
    const newEnvelope = structuredClone(observed.envelopes.at(-1)!);
    const newEnvelopeIndex = observed.envelopes.length - 1;
    const noticeCount = observed.notices.length;
    gate.release();
    await reconnecting;
    await flushScheduledWork();
    expect(observed.envelopes.at(-1)).toEqual(newEnvelope);
    expect(
      observed.envelopes
        .slice(newEnvelopeIndex)
        .every((envelope) => envelope.task.runId === newEnvelope.task.runId),
    ).toBe(true);
    expect(observed.statuses.at(-1)).toMatchObject({
      connection: "connected",
      busy: false,
      streamActive: true,
    });
    expect(observed.notices.slice(noticeCount)).toEqual([]);
    expect(runRequests()).toHaveLength(2);
    expect(
      runRequests().every(
        (request) =>
          (request.body?.forwardedProps as { operation?: string })
            ?.operation === "start",
      ),
    ).toBe(true);
    const authoritative = await nativeFetch(
      new URL(
        `/api/intervention-agent/tasks/${encodeURIComponent(newEnvelope.task.runId)}`,
        server.url,
      ),
    );
    expect(await authoritative.json()).toEqual(newEnvelope);
  });

  it("blocks response inside the terminal callback and resumes immediately after SDK finalization using the same native Agent", async () => {
    let controller: ReturnType<typeof createInterventionAgentClient>;
    let attemptedWhileBusy = false;
    let runCountAtBusyAttempt: number | undefined;
    let resumedAfterFinalizing = false;
    const observed = harness((status, envelopes) => {
      if (status.connection !== "interrupted") return;
      const envelope = envelopes.at(-1);
      const request = envelope?.task.requests.find(
        (item) => item.status === "pending",
      );
      if (!envelope || !request) return;
      const response: Extract<LabAction, { type: "respond" }> = {
        type: "respond",
        actionId: `client-test:${randomUUID()}`,
        runId: envelope.task.runId,
        requestId: request.id,
        requestVersion: request.version,
        optionId: "point-a-north",
        provenance: "interactive",
      };
      if (status.busy && !attemptedWhileBusy) {
        attemptedWhileBusy = true;
        controller.respond(response);
        runCountAtBusyAttempt = runRequests().length;
      } else if (!status.busy && !resumedAfterFinalizing) {
        resumedAfterFinalizing = true;
        // Re-enter immediately, rather than letting a timer hide SDK overlap.
        controller.respond(response);
      }
    });
    controller = observed.client;
    await controller.start("observation-cooperation", false);
    await vi.waitFor(
      () => {
        expect(observed.envelopes.at(-1)?.task.phase).toBe("ended");
        expect(observed.statuses.at(-1)).toMatchObject({
          connection: "finished",
          busy: false,
        });
      },
      { timeout: 3_000, interval: 10 },
    );
    expect(attemptedWhileBusy).toBe(true);
    expect(runCountAtBusyAttempt).toBe(1);
    expect(resumedAfterFinalizing).toBe(true);
    expect(runRequests()).toHaveLength(2);
    const resume = runRequests()[1]!.body?.resume as {
      interruptId: string;
      status: string;
    }[];
    expect(resume).toHaveLength(1);
    expect(resume[0]?.status).toBe("resolved");
    expect(
      observed.events.filter(
        (record) => record.event.type === EventType.RUN_FINISHED,
      ),
    ).toHaveLength(2);
    expect(
      observed.events.some(
        (record) => record.event.type === EventType.RUN_ERROR,
      ),
    ).toBe(false);
    const final = observed.envelopes.at(-1)!;
    expect(final.task.outcome).toBe("complete");
    expect(final.openInterrupts).toEqual([]);
    expect(
      final.inputActions.filter((action) => action.type === "respond"),
    ).toHaveLength(1);
    expect(final.task.collaboration?.contributions).toHaveLength(1);
    expect(
      observed.statuses.some(
        (status) => status.connection === "interrupted" && status.busy,
      ),
    ).toBe(true);
    expect(
      observed.statuses.some(
        (status) => status.connection === "interrupted" && !status.busy,
      ),
    ).toBe(true);
  });
});
