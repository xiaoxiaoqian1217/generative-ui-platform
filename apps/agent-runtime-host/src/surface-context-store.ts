import type { PresentationResult } from "@generative-ui/presentation-contract";
import type {
  RuntimeActionEnvelope,
  RuntimeRunRequest,
} from "@generative-ui/runtime-contract";

export interface SurfaceActionContext {
  readonly actionId: string;
  readonly actionType: string;
  readonly destructive: boolean;
  readonly requiresApproval: boolean;
}

export interface SurfaceContext {
  readonly request: RuntimeRunRequest;
  readonly presentationRequestId: string;
  readonly surfaceId: string;
  readonly actions: ReadonlyMap<string, SurfaceActionContext>;
}

export interface SurfaceContextStoreOptions {
  readonly maxEntries?: number;
  readonly ttlMs?: number;
  readonly now?: () => number;
}

interface StoredSurfaceContext {
  readonly context: SurfaceContext;
  readonly expiresAt: number;
}

type RuntimeSurfaceActionRequest = RuntimeActionEnvelope & {
  readonly threadId: string;
  readonly runId: string;
};

const DEFAULT_MAX_ENTRIES = 1_024;
const DEFAULT_TTL_MS = 15 * 60 * 1_000;
const MAX_MAX_ENTRIES = 100_000;
const MAX_TTL_MS = 24 * 60 * 60 * 1_000;

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const resolved = value ?? fallback;
  if (
    !Number.isSafeInteger(resolved) ||
    resolved < minimum ||
    resolved > maximum
  ) {
    throw new RangeError(
      `Surface context option must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return resolved;
}

function actionFromComponent(input: unknown): SurfaceActionContext | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const action = (input as Record<string, unknown>).action;
  if (typeof action !== "object" || action === null) return undefined;
  const event = (action as Record<string, unknown>).event;
  if (typeof event !== "object" || event === null) return undefined;
  const name = (event as Record<string, unknown>).name;
  const context = (event as Record<string, unknown>).context;
  if (
    typeof name !== "string" ||
    typeof context !== "object" ||
    context === null
  )
    return undefined;
  const values = context as Record<string, unknown>;
  if (
    typeof values.actionId !== "string" ||
    typeof values.destructive !== "boolean" ||
    typeof values.requiresApproval !== "boolean"
  )
    return undefined;
  return {
    actionId: values.actionId,
    actionType: name,
    destructive: values.destructive,
    requiresApproval: values.requiresApproval,
  };
}

export interface SurfaceContextStore {
  remember(
    request: RuntimeRunRequest,
    presentationRequestId: string,
    presentation: Extract<PresentationResult, { mode: "generative-ui" }>,
  ): void;
  get(request: RuntimeSurfaceActionRequest): SurfaceContext | undefined;
  consume(request: RuntimeSurfaceActionRequest): SurfaceContext | undefined;
  findAction(input: {
    readonly threadId: string;
    readonly runId: string;
    readonly actionId: string;
    readonly actionType: string;
  }): SurfaceContext | undefined;
}

/**
 * In-memory by design for the development runtime, but bounded so unconsumed
 * generated surfaces cannot retain request content indefinitely.
 */
export function createSurfaceContextStore(
  options: SurfaceContextStoreOptions = {},
): SurfaceContextStore {
  const maxEntries = boundedInteger(
    options.maxEntries,
    DEFAULT_MAX_ENTRIES,
    1,
    MAX_MAX_ENTRIES,
  );
  const ttlMs = boundedInteger(options.ttlMs, DEFAULT_TTL_MS, 1, MAX_TTL_MS);
  const now = options.now ?? Date.now;
  const surfaces = new Map<string, StoredSurfaceContext>();
  const key = (threadId: string, runId: string, surfaceId: string) =>
    `${threadId}\u0000${runId}\u0000${surfaceId}`;

  const pruneExpired = (timestamp: number) => {
    for (const [contextKey, stored] of surfaces) {
      if (stored.expiresAt <= timestamp) surfaces.delete(contextKey);
    }
  };

  const read = (
    request: RuntimeSurfaceActionRequest,
    consume: boolean,
  ): SurfaceContext | undefined => {
    const timestamp = now();
    pruneExpired(timestamp);
    const contextKey = key(request.threadId, request.runId, request.surfaceId);
    const stored = surfaces.get(contextKey);
    if (stored === undefined) return undefined;
    if (consume) surfaces.delete(contextKey);
    return stored.context;
  };

  return Object.freeze({
    remember(
      request: RuntimeRunRequest,
      presentationRequestId: string,
      presentation: Extract<PresentationResult, { mode: "generative-ui" }>,
    ) {
      const actions = new Map<string, SurfaceActionContext>();
      for (const operation of presentation.operations) {
        if (typeof operation !== "object" || operation === null) continue;
        const updateComponents = (operation as Record<string, unknown>)
          .updateComponents;
        if (typeof updateComponents !== "object" || updateComponents === null)
          continue;
        const components = (updateComponents as Record<string, unknown>)
          .components;
        if (!Array.isArray(components)) continue;
        for (const component of components) {
          const action = actionFromComponent(component);
          if (!action || actions.has(action.actionId)) continue;
          actions.set(action.actionId, action);
        }
      }
      const threadId = request.threadId ?? request.requestId;
      const runId = request.runId ?? request.requestId;
      const contextKey = key(threadId, runId, presentation.surfaceId);
      const timestamp = now();
      pruneExpired(timestamp);
      surfaces.delete(contextKey);
      while (surfaces.size >= maxEntries) {
        const oldestKey = surfaces.keys().next().value as string | undefined;
        if (oldestKey === undefined) break;
        surfaces.delete(oldestKey);
      }
      surfaces.set(contextKey, {
        context: {
          request: { ...request, threadId, runId },
          presentationRequestId,
          surfaceId: presentation.surfaceId,
          actions,
        },
        expiresAt: timestamp + ttlMs,
      });
    },
    get(request: RuntimeSurfaceActionRequest) {
      return read(request, false);
    },
    consume(request: RuntimeSurfaceActionRequest) {
      return read(request, true);
    },
    findAction(input: {
      readonly threadId: string;
      readonly runId: string;
      readonly actionId: string;
      readonly actionType: string;
    }) {
      const timestamp = now();
      pruneExpired(timestamp);
      for (const stored of surfaces.values()) {
        const context = stored.context;
        if (
          context.request.threadId !== input.threadId ||
          context.request.runId !== input.runId
        )
          continue;
        const action = context.actions.get(input.actionId);
        if (action?.actionType === input.actionType) return context;
      }
      return undefined;
    },
  });
}
