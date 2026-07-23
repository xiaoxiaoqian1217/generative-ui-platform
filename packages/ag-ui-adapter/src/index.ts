import type { UICompileResult } from "@generative-ui/compiler-contract";

export interface AgUiEvent {
  type: string;
  runId: string;
  timestamp: string;
  payload?: unknown;
}

export function compileResultToAgUiEvents(runId: string, result: UICompileResult): AgUiEvent[] {
  const now = new Date().toISOString();
  return [
    { type: "RUN_STARTED", runId, timestamp: now },
    {
      type: result.success ? "A2UI_RESULT" : "A2UI_FALLBACK",
      runId,
      timestamp: new Date().toISOString(),
      payload: result,
    },
    { type: "RUN_FINISHED", runId, timestamp: new Date().toISOString() },
  ];
}
