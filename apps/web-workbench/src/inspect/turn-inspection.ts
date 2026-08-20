/** 结构化事件形态：兼容 @ag-ui/core BaseEvent 与裸字符串字面量。 */
export type AgUiEventLike = { readonly type: string } & Record<string, unknown>;

/**
 * TurnInspection 事实模型（Issue #205）。
 *
 * observations 只表达 Workbench 真实观察到的事实：
 * - observedIndex / observedAt 仅表示 Workbench 观察顺序与时间，
 *   不代表服务端 authoritative sequence；
 * - payload 是公开协议事实的 Raw JSON 直通，不被 Workbench 改写；
 * - 没有独立契约 Artifact 的过程事件以 hasArtifact = false 显式表达。
 */

export const OBSERVATION_SOURCES = [
  "workbench",
  "copilotkit-runtime",
  "agent",
  "frontend-tool",
] as const;

export type ObservationSource = (typeof OBSERVATION_SOURCES)[number];

export const OBSERVATION_SOURCE_LABELS: Record<ObservationSource, string> = {
  agent: "Agent",
  "copilotkit-runtime": "CopilotKit Runtime",
  "frontend-tool": "Frontend Tool",
  workbench: "Workbench",
};

export type ObservationStatus =
  | "ok"
  | "failed"
  | "cancelled"
  | "interrupted"
  | "reconnecting";

export interface TurnObservationInput {
  readonly source: ObservationSource;
  readonly type: string;
  readonly status?: ObservationStatus;
  readonly durationMs?: number;
  readonly payload?: unknown;
  /**
   * 是否携带可直接检查的契约级 payload（Request / Result / Artifact）。
   * 纯过程事件（chunk / lifecycle 标记等）为 false，
   * Inspect Detail 据此显式表达“无独立契约 Artifact”而不伪造空 JSON。
   */
  readonly hasArtifact?: boolean;
  readonly runId?: string;
  readonly threadId?: string;
  readonly messageId?: string;
  readonly toolCallId?: string;
  readonly interruptId?: string;
}

export interface TurnObservation {
  readonly id: string;
  readonly observedIndex: number;
  readonly observedAt: string;
  readonly source: ObservationSource;
  readonly type: string;
  readonly status?: ObservationStatus;
  readonly durationMs?: number;
  readonly payload?: unknown;
  readonly hasArtifact: boolean;
  readonly runId?: string;
  readonly threadId?: string;
  readonly messageId?: string;
  readonly toolCallId?: string;
  readonly interruptId?: string;
}

export interface ObservationRecorder {
  record(input: TurnObservationInput): TurnObservation;
  observations(): readonly TurnObservation[];
}

let observationSequence = 0;

export function createObservationRecorder(
  now: () => Date = () => new Date(),
): ObservationRecorder {
  const recorded: TurnObservation[] = [];
  return {
    record(input) {
      observationSequence += 1;
      const observation: TurnObservation = {
        hasArtifact: input.hasArtifact ?? false,
        id: `observation-${observationSequence}`,
        observedAt: now().toISOString(),
        observedIndex: recorded.length,
        ...Object.fromEntries(
          Object.entries(input).filter(([, value]) => value !== undefined),
        ),
      } as TurnObservation;
      recorded.push(observation);
      return observation;
    },
    observations() {
      return [...recorded];
    },
  };
}

const CONTRACT_ARTIFACT_EVENT_TYPES: ReadonlySet<string> = new Set([
  "STATE_SNAPSHOT",
  "STATE_DELTA",
  "ACTIVITY_SNAPSHOT",
  "ACTIVITY_DELTA",
  "TOOL_CALL_RESULT",
  "MESSAGES_SNAPSHOT",
]);

interface RunFinishedLikeEvent {
  readonly outcome?: {
    readonly type?: string;
    readonly interrupts?: readonly { readonly id?: unknown }[];
  };
  readonly result?: unknown;
}

function runFinishedFacts(event: RunFinishedLikeEvent): {
  hasArtifact: boolean;
  interruptId?: string;
  status?: ObservationStatus;
} {
  const outcome = event.outcome;
  if (outcome?.type === "interrupt") {
    const firstInterrupt = outcome.interrupts?.[0];
    return {
      hasArtifact: true,
      status: "interrupted",
      ...(typeof firstInterrupt?.id === "string"
        ? { interruptId: firstInterrupt.id }
        : {}),
    };
  }
  return { hasArtifact: event.result !== undefined };
}

export function observationInputFromAgUiEvent(
  event: AgUiEventLike,
  context: { runId?: string; threadId?: string },
): TurnObservationInput {
  const candidate = event as AgUiEventLike & {
    messageId?: unknown;
    runId?: unknown;
    threadId?: unknown;
    toolCallId?: unknown;
  };
  // 事件自带的 runId / threadId 优先于 run 上下文：
  // Frontend Tool continuation 等后续 run 的事件携带自己的 runId。
  const runId =
    typeof candidate.runId === "string" ? candidate.runId : context.runId;
  const threadId =
    typeof candidate.threadId === "string"
      ? candidate.threadId
      : context.threadId;
  const base: TurnObservationInput = {
    hasArtifact: CONTRACT_ARTIFACT_EVENT_TYPES.has(event.type),
    payload: event,
    source: "agent",
    type: event.type,
    ...(runId === undefined ? {} : { runId }),
    ...(threadId === undefined ? {} : { threadId }),
    ...(typeof candidate.messageId === "string"
      ? { messageId: candidate.messageId }
      : {}),
    ...(typeof candidate.toolCallId === "string"
      ? { toolCallId: candidate.toolCallId }
      : {}),
  };

  if (event.type === "RUN_ERROR") {
    return { ...base, hasArtifact: true, status: "failed" };
  }
  if (event.type === "RUN_FINISHED") {
    const facts = runFinishedFacts(event as RunFinishedLikeEvent);
    return {
      ...base,
      hasArtifact: facts.hasArtifact,
      ...(facts.status === undefined ? {} : { status: facts.status }),
      ...(facts.interruptId === undefined
        ? {}
        : { interruptId: facts.interruptId }),
    };
  }
  return base;
}

export function lanesFromObservations(
  observations: readonly TurnObservation[],
): readonly ObservationSource[] {
  const present = new Set(
    observations.map((observation) => observation.source),
  );
  return OBSERVATION_SOURCES.filter((source) => present.has(source));
}

/**
 * 跨 run 片段合并观察（Interrupt → Resume → continuation）后，
 * observedIndex 重新对齐为整个 Turn 观察列表中的位置，
 * 保持 “observedIndex = Workbench 观察顺序” 的事实语义。
 */
export function reindexObservations(
  observations: readonly TurnObservation[],
): readonly TurnObservation[] {
  return observations.map((observation, index) => ({
    ...observation,
    observedIndex: index,
  }));
}

export function correlationKeyOf(
  observation: TurnObservation,
): string | undefined {
  if (observation.toolCallId !== undefined)
    return `tool:${observation.toolCallId}`;
  if (observation.interruptId !== undefined)
    return `interrupt:${observation.interruptId}`;
  return undefined;
}

/** ISO observedAt → HH:mm:ss.SSS 展示格式。 */
export function formatObservedTime(iso: string): string {
  return iso.length >= 23 ? iso.slice(11, 23) : iso;
}

/**
 * 请求 / 返回配对（Issue #179 Resolution：只在真正成对时出现）。
 *
 * 只承认三类真实对应关系：
 * 1. Frontend Tool invocation ↔ result（同一 toolCallId，Workbench 真实执行）；
 * 2. Interrupt outcome ↔ Resume input（同一 interruptId，AG-UI 协议关联）；
 * 3. Run input ↔ Run outcome（同一 runId；Agent 使用自有 runId 时
 *    只回退到 Workbench 真实记录的 settle 事实，不强行配对）。
 */
export interface ObservationExchange {
  readonly request?: TurnObservation;
  readonly response?: TurnObservation;
}

export function exchangeForObservation(
  observations: readonly TurnObservation[],
  selected: TurnObservation,
): ObservationExchange | undefined {
  if (
    selected.toolCallId !== undefined &&
    (selected.type === "FRONTEND_TOOL_INVOCATION" ||
      selected.type === "FRONTEND_TOOL_RESULT")
  ) {
    const request = observations.find(
      (item) =>
        item.type === "FRONTEND_TOOL_INVOCATION" &&
        item.toolCallId === selected.toolCallId,
    );
    const response = observations.find(
      (item) =>
        item.type === "FRONTEND_TOOL_RESULT" &&
        item.toolCallId === selected.toolCallId,
    );
    if (request !== undefined && response !== undefined)
      return { request, response };
  }

  if (selected.interruptId !== undefined) {
    const request = observations.find(
      (item) =>
        item.type === "RUN_FINISHED" &&
        item.interruptId === selected.interruptId,
    );
    const response = observations.find(
      (item) =>
        item.type === "RESUME_INPUT" &&
        item.interruptId === selected.interruptId,
    );
    if (request !== undefined && response !== undefined)
      return { request, response };
  }

  if (selected.runId !== undefined) {
    const request = observations.find(
      (item) =>
        (item.type === "RUN_INPUT" || item.type === "RESUME_INPUT") &&
        item.runId === selected.runId &&
        item.interruptId === undefined,
    );
    const protocolOutcome = observations.find(
      (item) =>
        (item.type === "RUN_FINISHED" || item.type === "RUN_ERROR") &&
        item.runId === selected.runId &&
        item.interruptId === undefined,
    );
    const settled = observations.find(
      (item) =>
        (item.type === "RUN_SETTLED" ||
          item.type === "RUN_CANCELLED" ||
          item.type === "RUN_TIMEOUT") &&
        item.runId === selected.runId,
    );
    const isRunMember =
      selected === request ||
      selected === protocolOutcome ||
      selected === settled;
    const response = protocolOutcome ?? settled;
    if (isRunMember && request !== undefined && response !== undefined)
      return { request, response };
  }

  return undefined;
}
