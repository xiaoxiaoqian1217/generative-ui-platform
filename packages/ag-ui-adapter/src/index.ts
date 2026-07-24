import type { UICompileResult } from "@generative-ui/compiler-contract";

export interface AgUiEvent {
  type: string;
  runId: string;
  timestamp: string;
  payload?: unknown;
}

export function compileResultToAgUiEvents(
  runId: string,
  result: UICompileResult,
): AgUiEvent[] {
  const now = new Date().toISOString();
  const started = { type: "RUN_STARTED", runId, timestamp: now };

  if (!result.success) {
    return [
      started,
      {
        type: "RUN_ERROR",
        runId,
        timestamp: new Date().toISOString(),
        payload: result,
      },
    ];
  }

  return [
    started,
    {
      type: result.degraded ? "A2UI_FALLBACK" : "A2UI_RESULT",
      runId,
      timestamp: new Date().toISOString(),
      payload: result,
    },
    { type: "RUN_FINISHED", runId, timestamp: new Date().toISOString() },
  ];
}
