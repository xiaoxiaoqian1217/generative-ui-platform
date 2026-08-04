import type {
  RuntimeActionResult,
  RuntimeRunResult,
} from "@generative-ui/runtime-contract";

export const INSPECTION_SNAPSHOT_KEY = "generative-ui.workbench.inspect.v1";

export interface InspectionSnapshot {
  readonly requestId: string;
  readonly threadId: string;
  readonly runId: string;
  readonly presentationRequestId?: string;
  readonly status: RuntimeRunResult["status"];
  readonly presentationMode?: "markdown" | "generative-ui";
  readonly degradationReasonCode?: string;
  readonly stages: readonly {
    readonly name: string;
    readonly status: string;
    readonly durationMs?: number;
    readonly errorCode?: string;
  }[];
}

export function createInspectionSnapshot(
  result: RuntimeRunResult | RuntimeActionResult,
): InspectionSnapshot {
  return Object.freeze({
    requestId: result.requestId,
    threadId: result.threadId,
    runId: result.runId,
    ...(result.presentationRequestId === undefined
      ? {}
      : { presentationRequestId: result.presentationRequestId }),
    status: result.status,
    ...(result.presentation !== undefined &&
    result.presentation.status !== "failed"
      ? { presentationMode: result.presentation.mode }
      : {}),
    ...(result.diagnostics?.degradationReasonCode === undefined
      ? {}
      : { degradationReasonCode: result.diagnostics.degradationReasonCode }),
    stages: Object.freeze(
      (result.diagnostics?.stages ?? []).map((stage) => ({
        name: stage.name,
        status: stage.status,
        ...(stage.durationMs === undefined
          ? {}
          : { durationMs: stage.durationMs }),
        ...(stage.errorCode === undefined
          ? {}
          : { errorCode: stage.errorCode }),
      })),
    ),
  });
}

export function saveInspectionSnapshot(
  storage: Storage,
  result: RuntimeRunResult | RuntimeActionResult,
): void {
  storage.setItem(
    INSPECTION_SNAPSHOT_KEY,
    JSON.stringify(createInspectionSnapshot(result)),
  );
}

export function loadInspectionSnapshot(
  storage: Storage,
): InspectionSnapshot | undefined {
  const raw = storage.getItem(INSPECTION_SNAPSHOT_KEY);
  if (raw === null) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<InspectionSnapshot>;
    return typeof value.requestId === "string" &&
      typeof value.threadId === "string" &&
      typeof value.runId === "string" &&
      typeof value.status === "string" &&
      Array.isArray(value.stages)
      ? (value as InspectionSnapshot)
      : undefined;
  } catch {
    return undefined;
  }
}
