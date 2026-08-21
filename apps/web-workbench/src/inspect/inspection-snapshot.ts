import type { Message } from "@ag-ui/core";

export const INSPECTION_SNAPSHOT_KEY = "generative-ui.workbench.inspect.v2";

export interface InspectionSnapshot {
  readonly assistantMessageCount: number;
  readonly mapOperationCount: number;
  readonly messageCount: number;
  readonly outputKind: "ag-ui-messages";
  readonly requestId: string;
  readonly runId: string;
  readonly status: "completed";
  readonly threadId: string;
}

export interface InspectionSnapshotInput {
  readonly mapOperationCount?: number;
  readonly messages: readonly Message[];
  readonly requestId: string;
  readonly runId: string;
  readonly threadId: string;
}

export function createInspectionSnapshot(
  input: InspectionSnapshotInput,
): InspectionSnapshot {
  return Object.freeze({
    assistantMessageCount: input.messages.filter(
      (message) => message.role === "assistant",
    ).length,
    mapOperationCount: input.mapOperationCount ?? 0,
    messageCount: input.messages.length,
    outputKind: "ag-ui-messages",
    requestId: input.requestId,
    runId: input.runId,
    status: "completed",
    threadId: input.threadId,
  });
}

export function saveInspectionSnapshot(
  storage: Storage,
  input: InspectionSnapshotInput,
): void {
  storage.setItem(
    INSPECTION_SNAPSHOT_KEY,
    JSON.stringify(createInspectionSnapshot(input)),
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
      value.status === "completed" &&
      value.outputKind === "ag-ui-messages" &&
      typeof value.messageCount === "number" &&
      typeof value.assistantMessageCount === "number" &&
      (value.mapOperationCount === undefined ||
        typeof value.mapOperationCount === "number")
      ? ({
          ...value,
          mapOperationCount: value.mapOperationCount ?? 0,
        } as InspectionSnapshot)
      : undefined;
  } catch {
    return undefined;
  }
}
