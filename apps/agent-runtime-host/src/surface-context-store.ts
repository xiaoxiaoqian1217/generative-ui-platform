import type { RuntimeRunRequest } from "@generative-ui/runtime-contract";

export interface SurfaceContextStore {
  remember(request: RuntimeRunRequest, surfaceId: string): void;
  has(threadId: string, runId: string, surfaceId: string): boolean;
}

/** In-memory by design: persistent action resumption is owned by TASK-008. */
export function createSurfaceContextStore(): SurfaceContextStore {
  const surfaces = new Set<string>();
  const key = (threadId: string, runId: string, surfaceId: string) =>
    `${threadId}\u0000${runId}\u0000${surfaceId}`;

  return Object.freeze({
    remember(request: RuntimeRunRequest, surfaceId: string) {
      surfaces.add(key(request.threadId ?? request.requestId, request.runId ?? request.requestId, surfaceId));
    },
    has(threadId: string, runId: string, surfaceId: string) {
      return surfaces.has(key(threadId, runId, surfaceId));
    },
  });
}
