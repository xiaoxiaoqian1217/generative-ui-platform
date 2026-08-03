import type { PresentationResult } from "@generative-ui/presentation-contract";
import type { RuntimeActionEnvelope, RuntimeRunRequest } from "@generative-ui/runtime-contract";

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

function actionFromComponent(input: unknown): SurfaceActionContext | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const action = (input as Record<string, unknown>).action;
  if (typeof action !== "object" || action === null) return undefined;
  const event = (action as Record<string, unknown>).event;
  if (typeof event !== "object" || event === null) return undefined;
  const name = (event as Record<string, unknown>).name;
  const context = (event as Record<string, unknown>).context;
  if (typeof name !== "string" || typeof context !== "object" || context === null) return undefined;
  const values = context as Record<string, unknown>;
  if (typeof values.actionId !== "string" || typeof values.destructive !== "boolean" || typeof values.requiresApproval !== "boolean") return undefined;
  return { actionId: values.actionId, actionType: name, destructive: values.destructive, requiresApproval: values.requiresApproval };
}

export interface SurfaceContextStore {
  remember(request: RuntimeRunRequest, presentationRequestId: string, presentation: Extract<PresentationResult, { mode: "generative-ui" }>): void;
  get(request: RuntimeActionEnvelope & { readonly threadId: string; readonly runId: string }): SurfaceContext | undefined;
  consume(request: RuntimeActionEnvelope & { readonly threadId: string; readonly runId: string }): SurfaceContext | undefined;
}

/** In-memory by design: persistent action resumption is owned by TASK-008. */
export function createSurfaceContextStore(): SurfaceContextStore {
  const surfaces = new Map<string, SurfaceContext>();
  const key = (threadId: string, runId: string, surfaceId: string) =>
    `${threadId}\u0000${runId}\u0000${surfaceId}`;

  return Object.freeze({
    remember(
      request: RuntimeRunRequest,
      presentationRequestId: string,
      presentation: Extract<PresentationResult, { mode: "generative-ui" }>,
    ) {
      const actions = new Map<string, SurfaceActionContext>();
      for (const operation of presentation.operations) {
        if (typeof operation !== "object" || operation === null) continue;
        const updateComponents = (operation as Record<string, unknown>).updateComponents;
        if (typeof updateComponents !== "object" || updateComponents === null) continue;
        const components = (updateComponents as Record<string, unknown>).components;
        if (!Array.isArray(components)) continue;
        for (const component of components) {
          const action = actionFromComponent(component);
          if (!action || actions.has(action.actionId)) continue;
          actions.set(action.actionId, action);
        }
      }
      const threadId = request.threadId ?? request.requestId;
      const runId = request.runId ?? request.requestId;
      surfaces.set(key(threadId, runId, presentation.surfaceId), { request: { ...request, threadId, runId }, presentationRequestId, surfaceId: presentation.surfaceId, actions });
    },
    get(request: RuntimeActionEnvelope & { readonly threadId: string; readonly runId: string }) {
      return surfaces.get(key(request.threadId, request.runId, request.surfaceId));
    },
    consume(request: RuntimeActionEnvelope & { readonly threadId: string; readonly runId: string }) {
      const contextKey = key(request.threadId, request.runId, request.surfaceId);
      const context = surfaces.get(contextKey);
      if (context === undefined) return undefined;
      surfaces.delete(contextKey);
      return context;
    },
  });
}
