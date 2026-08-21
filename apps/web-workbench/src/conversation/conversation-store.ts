import type { Interrupt, Message, UserMessage } from "@ag-ui/core";
import {
  reindexObservations,
  type TurnObservation,
} from "../inspect/turn-inspection.js";

export type WorkbenchUserMessage = UserMessage & { readonly content: string };

export interface ActiveConversationOperation {
  readonly requestId: string;
  readonly turnId: string;
}

export interface TurnFailure {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly stage?: string;
}

export interface InterruptResponse {
  readonly interruptId: string;
  readonly payload?: string;
  readonly status: "cancelled" | "resolved";
  readonly turnId: string;
}

export interface ConversationTurn {
  readonly agentState?: unknown;
  readonly eventTypes?: readonly string[];
  readonly failure?: TurnFailure;
  readonly observations?: readonly TurnObservation[];
  readonly pendingInterrupts?: readonly Interrupt[];
  readonly requestId: string;
  readonly runResult?: unknown;
  readonly responseMessages: readonly Message[];
  readonly runId?: string;
  readonly status:
    | "cancelled"
    | "completed"
    | "failed"
    | "interrupted"
    | "pending";
  readonly threadId?: string;
  readonly turnId: string;
  readonly userMessage: WorkbenchUserMessage;
}

export interface ConversationState {
  readonly activeOperation?: ActiveConversationOperation;
  readonly inputValue: string;
  readonly turns: readonly ConversationTurn[];
}

export interface StartRunInput {
  readonly message: WorkbenchUserMessage;
  readonly requestId: string;
  readonly turnId: string;
}

export interface ResolveRunInput {
  readonly agentState?: unknown;
  readonly eventTypes?: readonly string[];
  readonly interrupts?: readonly Interrupt[];
  readonly messages: readonly Message[];
  readonly observations?: readonly TurnObservation[];
  readonly runResult?: unknown;
  readonly runId: string;
  readonly threadId: string;
}

export function createConversationState(inputValue = ""): ConversationState {
  return { inputValue, turns: [] };
}

export function setConversationInput(
  state: ConversationState,
  inputValue: string,
): ConversationState {
  return { ...state, inputValue };
}

export function appendTurnObservation(
  state: ConversationState,
  turnId: string,
  observation: TurnObservation,
): ConversationState {
  if (state.activeOperation?.turnId !== turnId) return state;
  return updateTurn(state, turnId, (turn) => ({
    ...turn,
    observations: reindexObservations([
      ...(turn.observations ?? []),
      observation,
    ]),
  }));
}

export function startRun(
  state: ConversationState,
  input: StartRunInput,
): ConversationState {
  if (state.activeOperation !== undefined) return state;
  if (input.message.content.trim() === "") return state;
  const turn: ConversationTurn = {
    requestId: input.requestId,
    responseMessages: [],
    status: "pending",
    turnId: input.turnId,
    userMessage: input.message,
  };
  return {
    activeOperation: {
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

function withoutActiveOperation(state: ConversationState): ConversationState {
  const { activeOperation: _activeOperation, ...inactiveState } = state;
  return inactiveState;
}

function mergeObservations(
  turn: ConversationTurn,
  incoming: readonly TurnObservation[] | undefined,
): Pick<ConversationTurn, "observations"> | Record<string, never> {
  if (incoming === undefined) return {};
  const observationsByIdentity = new Map(
    (turn.observations ?? []).map((observation) => [
      `${observation.id}:${observation.type}`,
      observation,
    ]),
  );
  for (const observation of incoming)
    observationsByIdentity.set(
      `${observation.id}:${observation.type}`,
      observation,
    );
  return {
    observations: reindexObservations([...observationsByIdentity.values()]),
  };
}

export function resolveRun(
  state: ConversationState,
  turnId: string,
  result: ResolveRunInput,
): ConversationState {
  if (state.activeOperation?.turnId !== turnId) return state;
  const interrupted =
    result.interrupts !== undefined && result.interrupts.length > 0;
  return updateTurn(withoutActiveOperation(state), turnId, (turn) => ({
    ...turn,
    ...(result.agentState === undefined
      ? {}
      : { agentState: result.agentState }),
    ...(result.eventTypes === undefined
      ? {}
      : { eventTypes: [...(turn.eventTypes ?? []), ...result.eventTypes] }),
    ...mergeObservations(turn, result.observations),
    ...(interrupted ? { pendingInterrupts: result.interrupts } : {}),
    responseMessages: [...turn.responseMessages, ...result.messages],
    ...(result.runResult === undefined ? {} : { runResult: result.runResult }),
    runId: result.runId,
    status: interrupted ? "interrupted" : "completed",
    threadId: result.threadId,
  }));
}

export function failOperation(
  state: ConversationState,
  turnId: string,
  failure: TurnFailure,
  status: "cancelled" | "failed" = "failed",
  observations?: readonly TurnObservation[],
): ConversationState {
  if (state.activeOperation?.turnId !== turnId) return state;
  return updateTurn(withoutActiveOperation(state), turnId, (turn) => ({
    ...turn,
    failure,
    ...mergeObservations(turn, observations),
    status,
  }));
}

export function resumeInterrupt(
  state: ConversationState,
  turnId: string,
  input: { readonly requestId: string },
): ConversationState {
  const turn = state.turns.find((item) => item.turnId === turnId);
  if (
    turn === undefined ||
    turn.status !== "interrupted" ||
    state.activeOperation !== undefined
  )
    return state;
  return updateTurn(
    {
      ...state,
      activeOperation: { requestId: input.requestId, turnId },
    },
    turnId,
    (current) => {
      const { pendingInterrupts: _pendingInterrupts, ...rest } = current;
      return { ...rest, status: "pending" };
    },
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
  return startRun(state, { ...input, message: turn.userMessage });
}
