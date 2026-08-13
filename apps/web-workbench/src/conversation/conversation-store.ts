import type { Message, UserMessage } from "@ag-ui/core";

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

export interface ConversationTurn {
  readonly agentState?: unknown;
  readonly eventTypes?: readonly string[];
  readonly failure?: TurnFailure;
  readonly requestId: string;
  readonly runResult?: unknown;
  readonly responseMessages: readonly Message[];
  readonly runId?: string;
  readonly status: "cancelled" | "completed" | "failed" | "pending";
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
  readonly messages: readonly Message[];
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

export function resolveRun(
  state: ConversationState,
  turnId: string,
  result: ResolveRunInput,
): ConversationState {
  if (state.activeOperation?.turnId !== turnId) return state;
  return updateTurn(withoutActiveOperation(state), turnId, (turn) => ({
    ...turn,
    ...(result.agentState === undefined
      ? {}
      : { agentState: result.agentState }),
    ...(result.eventTypes === undefined
      ? {}
      : { eventTypes: result.eventTypes }),
    responseMessages: result.messages,
    ...(result.runResult === undefined ? {} : { runResult: result.runResult }),
    runId: result.runId,
    status: "completed",
    threadId: result.threadId,
  }));
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
