import type { PresentationResult } from "@generative-ui/presentation-contract";
import type {
  RuntimeActionEnvelope,
  RuntimeRunRequest,
} from "@generative-ui/runtime-contract";
import { describe, expect, it } from "vitest";
import { createSurfaceContextStore } from "../src/surface-context-store.js";

function request(id: string): RuntimeRunRequest {
  return {
    protocolVersion: "1.0",
    requestId: `request-${id}`,
    threadId: `thread-${id}`,
    runId: `run-${id}`,
    message: { role: "user", content: "confirm" },
  };
}

function presentation(id: string): Extract<
  PresentationResult,
  { mode: "generative-ui" }
> {
  return {
    requestId: `presentation-${id}`,
    status: "completed",
    mode: "generative-ui",
    surfaceId: `surface-${id}`,
    operations: [
      {
        updateComponents: {
          surfaceId: `surface-${id}`,
          components: [
            {
              id: "confirm",
              action: {
                event: {
                  name: "patrol.confirm",
                  context: {
                    actionId: "confirm-patrol",
                    destructive: false,
                    requiresApproval: true,
                  },
                },
              },
            },
          ],
        },
      },
    ],
  };
}

function lookup(id: string): RuntimeActionEnvelope & {
  readonly threadId: string;
  readonly runId: string;
} {
  return {
    threadId: `thread-${id}`,
    runId: `run-${id}`,
    surfaceId: `surface-${id}`,
    actionId: "confirm-patrol",
    actionType: "patrol.confirm",
  };
}

describe("SurfaceContextStore", () => {
  it("expires retained request context after the configured TTL", () => {
    let timestamp = 1_000;
    const store = createSurfaceContextStore({
      ttlMs: 10,
      now: () => timestamp,
    });

    store.remember(request("one"), "presentation-one", presentation("one"));
    expect(store.get(lookup("one"))).toBeDefined();

    timestamp += 10;
    expect(store.get(lookup("one"))).toBeUndefined();
  });

  it("evicts the oldest unconsumed Surface when capacity is reached", () => {
    const store = createSurfaceContextStore({ maxEntries: 1 });

    store.remember(request("one"), "presentation-one", presentation("one"));
    store.remember(request("two"), "presentation-two", presentation("two"));

    expect(store.get(lookup("one"))).toBeUndefined();
    expect(store.get(lookup("two"))).toBeDefined();
  });

  it("rejects unsafe storage bounds", () => {
    expect(() => createSurfaceContextStore({ maxEntries: 0 })).toThrow(
      RangeError,
    );
    expect(() => createSurfaceContextStore({ ttlMs: 0 })).toThrow(RangeError);
  });
});
