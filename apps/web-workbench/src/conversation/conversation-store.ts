import type { UserMessage } from "@ag-ui/core";
import type { PresentationResult } from "@generative-ui/presentation-contract";
import type {
  RuntimeActionResult,
  RuntimeRunResult,
  RuntimeThreadDetail,
} from "@generative-ui/runtime-contract";

export type ConversationOperationKind = "action" | "run";

export interface ActiveConversationOperation {
  readonly kind: ConversationOperationKind;
  readonly requestId: string;
  readonly turnId: string;
}

export interface TurnFailure {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly stage?: string;
}

export interface ConversationUserMessage {
  readonly content: string;
  readonly id: string;
}

export interface BusinessSurface {
  readonly presentation: Extract<PresentationResult, { mode: "generative-ui" }>;
  readonly status: "active" | "historical";
  readonly surfaceId: string;
}

export interface ConversationTurn {
  readonly businessSurfaces: readonly BusinessSurface[];
  readonly failure?: TurnFailure;
  /** An incompatible persisted snapshot may only be inspected as bounded raw data. */
  readonly historicalSnapshotRaw?: unknown;
  readonly presentation?: PresentationResult;
  readonly presentationRequestId?: string;
  readonly requestId: string;
  readonly runId?: string;
  readonly runtimeResult?: RuntimeRunResult;
  readonly status:
    | "cancelled"
    | "completed"
    | "degraded"
    | "failed"
    | "pending";
  readonly threadId?: string;
  readonly turnId: string;
  readonly userMessage: ConversationUserMessage;
}

export interface ConversationState {
  readonly activeOperation?: ActiveConversationOperation;
  readonly inputValue: string;
  readonly turns: readonly ConversationTurn[];
}

export interface StartRunInput {
  readonly message: string;
  readonly requestId: string;
  readonly turnId: string;
}

export interface StartActionInput {
  readonly requestId: string;
  readonly surfaceId: string;
  readonly turnId: string;
}

export function createConversationState(inputValue = ""): ConversationState {
  return { inputValue, turns: [] };
}

/** Historical snapshots are read-only: no restored business surface is active. */
export function restoreConversationHistory(
  detail: RuntimeThreadDetail,
): ConversationState {
  return {
    inputValue: "",
    turns: detail.turns.map((turn) => {
      const compatible =
        turn.snapshot?.contractVersion === "1.0" &&
        turn.snapshot.catalogId === "fixture" &&
        turn.snapshot.catalogVersion === "1.0.0" &&
        turn.snapshot.compilerVersion === "1.0.0";
      const presentation = compatible ? turn.snapshot?.presentation : undefined;
      return {
        businessSurfaces:
          presentation !== undefined &&
          presentation.status !== "failed" &&
          presentation.mode === "generative-ui"
            ? [
                {
                  presentation,
                  status: "historical" as const,
                  surfaceId: presentation.surfaceId,
                },
              ]
            : [],
        requestId: turn.requestId,
        runId: turn.runId,
        status: turn.status === "history-write-failed" ? "failed" : turn.status,
        threadId: turn.threadId,
        turnId: turn.turnId,
        userMessage: { content: turn.userMessage, id: `${turn.turnId}:user` },
        ...(presentation === undefined ? {} : { presentation }),
        ...(!compatible && turn.snapshot !== undefined
          ? {
              failure: {
                code: "HISTORY_SNAPSHOT_INCOMPATIBLE",
                message:
                  "The stored snapshot is incompatible with this Workbench.",
                retryable: false,
                stage: "history",
              },
              historicalSnapshotRaw: turn.snapshot,
            }
          : {}),
      };
    }),
  };
}

export function setConversationInput(
  state: ConversationState,
  inputValue: string,
): ConversationState {
  return { ...state, inputValue };
}

/**
 * Projects the caller-owned conversation into the minimal AG-UI messages that
 * the controlled chat view needs. Presentation content deliberately stays out
 * of this projection: Markdown and A2UI are rendered by their dedicated,
 * validated Workbench paths.
 */
export function conversationMessages(
  state: ConversationState,
): readonly UserMessage[] {
  return state.turns.map((turn) => ({
    content: turn.userMessage.content,
    id: turn.userMessage.id,
    role: "user",
  }));
}

export function startRun(
  state: ConversationState,
  input: StartRunInput,
): ConversationState {
  if (state.activeOperation !== undefined) return state;
  const message = input.message.trim();
  if (message === "") return state;

  const turn: ConversationTurn = {
    businessSurfaces: [],
    requestId: input.requestId,
    status: "pending",
    turnId: input.turnId,
    userMessage: { content: message, id: `${input.turnId}:user` },
  };
  return {
    activeOperation: {
      kind: "run",
      requestId: input.requestId,
      turnId: input.turnId,
    },
    inputValue: "",
    turns: [...state.turns, turn],
  };
}

function updateTurn(
  state: ConversationState,
  turnId: string,
  update: (turn: ConversationTurn) => ConversationTurn,
): ConversationState {
  return {
    ...state,
    turns: state.turns.map((turn) =>
      turn.turnId === turnId ? update(turn) : turn,
    ),
  };
}

function historicalSurfaces(
  turns: readonly ConversationTurn[],
): readonly ConversationTurn[] {
  return turns.map((turn) => ({
    ...turn,
    businessSurfaces: turn.businessSurfaces.map((surface) =>
      surface.status === "active"
        ? { ...surface, status: "historical" }
        : surface,
    ),
  }));
}

function surfacesForPresentation(
  turn: ConversationTurn,
  presentation: PresentationResult,
): readonly BusinessSurface[] {
  const historical = turn.businessSurfaces.map((surface) => ({
    ...surface,
    status: "historical" as const,
  }));
  if (presentation.status === "failed" || presentation.mode !== "generative-ui")
    return historical;
  return [
    ...historical,
    {
      presentation,
      status: "active",
      surfaceId: presentation.surfaceId,
    },
  ];
}

function withoutActiveOperation(state: ConversationState): ConversationState {
  const { activeOperation: _activeOperation, ...inactiveState } = state;
  return inactiveState;
}

function resultStatus(result: RuntimeRunResult): ConversationTurn["status"] {
  return result.status === "degraded" ? "degraded" : "completed";
}

export function resolveRun(
  state: ConversationState,
  turnId: string,
  result: RuntimeRunResult,
): ConversationState {
  if (
    state.activeOperation?.kind !== "run" ||
    state.activeOperation.turnId !== turnId ||
    result.status === "failed"
  )
    return state;

  const turns = historicalSurfaces(state.turns);
  return updateTurn(
    { ...withoutActiveOperation(state), turns },
    turnId,
    (turn) => ({
      ...turn,
      businessSurfaces: surfacesForPresentation(turn, result.presentation),
      presentation: result.presentation,
      presentationRequestId: result.presentationRequestId,
      runId: result.runId,
      runtimeResult: result,
      status: resultStatus(result),
      threadId: result.threadId,
    }),
  );
}

export function failOperation(
  state: ConversationState,
  turnId: string,
  failure: TurnFailure,
  status: "cancelled" | "failed" = "failed",
): ConversationState {
  if (state.activeOperation?.turnId !== turnId) return state;
  return updateTurn(withoutActiveOperation(state), turnId, (turn) => ({
    ...turn,
    failure,
    status,
  }));
}

export function startAction(
  state: ConversationState,
  input: StartActionInput,
): ConversationState {
  if (state.activeOperation !== undefined) return state;
  const turn = state.turns.find((item) => item.turnId === input.turnId);
  const surface = turn?.businessSurfaces.find(
    (item) => item.surfaceId === input.surfaceId,
  );
  if (surface?.status !== "active") return state;
  return {
    ...state,
    activeOperation: {
      kind: "action",
      requestId: input.requestId,
      turnId: input.turnId,
    },
  };
}

export function resolveAction(
  state: ConversationState,
  turnId: string,
  result: RuntimeActionResult,
): ConversationState {
  if (
    state.activeOperation?.kind !== "action" ||
    state.activeOperation.turnId !== turnId ||
    state.activeOperation.requestId !== result.requestId ||
    result.status === "failed"
  )
    return state;

  const targetTurn = state.turns.find((turn) => turn.turnId === turnId);
  if (
    targetTurn === undefined ||
    targetTurn.presentationRequestId !== result.sourcePresentationRequestId
  )
    return state;

  const turns = historicalSurfaces(state.turns);
  return updateTurn(
    { ...withoutActiveOperation(state), turns },
    turnId,
    (turn) => ({
      ...turn,
      businessSurfaces: surfacesForPresentation(turn, result.presentation),
      presentation: result.presentation,
      presentationRequestId: result.presentationRequestId,
      runId: result.runId,
      runtimeResult: result,
      status: resultStatus(result),
      threadId: result.threadId,
    }),
  );
}

export function retryTurn(
  state: ConversationState,
  turnId: string,
  input: StartRunInput,
): ConversationState {
  const turn = state.turns.find((item) => item.turnId === turnId);
  if (
    turn === undefined ||
    turn.failure?.retryable !== true ||
    state.activeOperation !== undefined
  )
    return state;
  return startRun(state, { ...input, message: turn.userMessage.content });
}
