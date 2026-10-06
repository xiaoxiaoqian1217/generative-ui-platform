import {
  type AgentSubscriber,
  HttpAgent,
  type RunAgentParameters,
} from "@ag-ui/client";
import {
  type BaseEvent,
  EventSchemas,
  type Interrupt,
  InterruptSchema,
} from "@ag-ui/core";
import type { LabAction, LabState } from "./model.js";

export type LabTransport = "agent" | "local";
export type AgentConnection =
  | "idle"
  | "connecting"
  | "connected"
  | "interrupted"
  | "finished"
  | "disconnected";

export interface InterventionAgentEnvelope {
  schemaVersion: "intervention-agent/v1";
  revision: number;
  scenarioId: string;
  task: LabState;
  inputActions: LabAction[];
  cursor: number;
  openInterrupts: Interrupt[];
}

export interface AgentClientStatus {
  connection: AgentConnection;
  busy: boolean;
  streamActive: boolean;
  threadId: string;
  runId: string;
  interruptId?: string | undefined;
}

export interface AgentProtocolRecord {
  sequence: number;
  at: string;
  event: BaseEvent;
}

type ClientOptions = {
  onEnvelope(envelope: InterventionAgentEnvelope): void;
  onStatus(status: AgentClientStatus): void;
  onEvent(record: AgentProtocolRecord): void;
  onNotice(detail: string): void;
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Reject malformed wire state before it reaches the task panel. */
export function isInterventionAgentEnvelope(
  value: unknown,
): value is InterventionAgentEnvelope {
  if (
    !object(value) ||
    value.schemaVersion !== "intervention-agent/v1" ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !Number.isSafeInteger(value.cursor) ||
    (value.cursor as number) < 0 ||
    typeof value.scenarioId !== "string" ||
    !Array.isArray(value.inputActions) ||
    !Array.isArray(value.openInterrupts) ||
    !value.openInterrupts.every(
      (interrupt) => InterruptSchema.safeParse(interrupt).success,
    ) ||
    !object(value.task)
  )
    return false;
  const task = value.task;
  return (
    task.schemaVersion === "intervention-lab/v1" &&
    task.simulation === true &&
    typeof task.runId === "string" &&
    typeof task.goal === "string" &&
    ["ready", "running", "waiting", "ended"].includes(String(task.phase)) &&
    ["in-progress", "complete", "partial"].includes(String(task.outcome)) &&
    Number.isSafeInteger(task.planVersion) &&
    Number.isSafeInteger(task.logicalTime) &&
    Array.isArray(task.roads) &&
    task.roads.length > 0 &&
    task.roads.every(
      (road) =>
        object(road) &&
        typeof road.id === "string" &&
        typeof road.name === "string" &&
        Array.isArray(road.polyline) &&
        road.polyline.every(
          (point) =>
            object(point) &&
            typeof point.x === "number" &&
            typeof point.y === "number",
        ) &&
        Array.isArray(road.evidence) &&
        ["unchecked", "observed"].includes(String(road.status)),
    ) &&
    Array.isArray(task.steps) &&
    task.steps.every(
      (step) =>
        object(step) &&
        typeof step.id === "string" &&
        typeof step.label === "string" &&
        typeof step.roadId === "string",
    ) &&
    Array.isArray(task.requests) &&
    task.requests.every(
      (request) =>
        object(request) &&
        typeof request.id === "string" &&
        Array.isArray(request.roadIds) &&
        Array.isArray(request.stepIds) &&
        Array.isArray(request.options) &&
        object(request.requiredInput),
    ) &&
    Array.isArray(task.constraints) &&
    Array.isArray(task.commands) &&
    Array.isArray(task.logs) &&
    object(task.device) &&
    object(task.device.position) &&
    typeof task.device.position.x === "number" &&
    typeof task.device.position.y === "number" &&
    (task.collaboration === undefined ||
      (object(task.collaboration) &&
        Array.isArray(task.collaboration.stepOrder) &&
        Array.isArray(task.collaboration.executionOrder) &&
        Array.isArray(task.collaboration.contributions) &&
        (task.collaboration.observationInput === undefined ||
          (object(task.collaboration.observationInput) &&
            Array.isArray(task.collaboration.observationInput.points)))))
  );
}

export function createInterventionAgentClient(options: ClientOptions) {
  const baseUrl = "/api/intervention-agent";
  let agent: HttpAgent | undefined;
  let envelope: InterventionAgentEnvelope | undefined;
  let generation = 0;
  let eventSequence = 0;
  let finalizingEpoch: number | undefined;
  let commandEpoch: number | undefined;
  let status: AgentClientStatus = {
    connection: "idle",
    busy: false,
    streamActive: false,
    threadId: "",
    runId: "",
  };

  function update(change: Partial<AgentClientStatus>): void {
    status = { ...status, ...change };
    options.onStatus({ ...status });
  }

  function stopStream(): void {
    generation += 1;
    finalizingEpoch = undefined;
    commandEpoch = undefined;
    agent?.abortRun();
    update({ busy: false, streamActive: false });
  }

  function confirmState(value: unknown): void {
    if (!isInterventionAgentEnvelope(value))
      throw new Error("Agent 返回了无法识别的任务状态，已保留最后确认状态。");
    if (
      envelope &&
      (value.task.runId !== envelope.task.runId ||
        value.scenarioId !== envelope.scenarioId)
    )
      throw new Error("Agent 状态与当前业务任务不一致，已保留最后确认状态。");
    if (
      envelope &&
      value.task.runId === envelope.task.runId &&
      value.revision < envelope.revision
    )
      return;
    envelope = structuredClone(value);
    if (agent)
      agent.pendingInterrupts = structuredClone(envelope.openInterrupts);
    options.onEnvelope(envelope);
    if (!envelope.task.requests.some((request) => request.status === "pending"))
      update({ interruptId: undefined });
  }

  function rejectWireState(error: unknown): void {
    stopStream();
    update({ connection: "disconnected" });
    options.onNotice(
      error instanceof Error
        ? error.message
        : "Agent 状态无法识别，已保留最后确认状态。",
    );
  }

  function beginRun(parameters: RunAgentParameters): void {
    const current = agent;
    if (!current) throw new Error("尚未建立 Agent 会话。");
    const epoch = ++generation;
    let terminalSeen = false;
    let runErrorSeen = false;
    const runId = `agui-run:${crypto.randomUUID()}`;
    update({ connection: "connecting", busy: true, streamActive: true, runId });
    const subscriber: AgentSubscriber = {
      onEvent: ({ event }) => {
        if (epoch !== generation) return;
        const validated = EventSchemas.safeParse(event);
        if (!validated.success) {
          rejectWireState(
            new Error("Agent 事件不符合 AG-UI 协议，已停止应用。"),
          );
          return { stopPropagation: true };
        }
        options.onEvent({
          sequence: ++eventSequence,
          at: new Date().toISOString(),
          event: structuredClone(validated.data),
        });
      },
      onRunStartedEvent: () => {
        if (epoch === generation)
          update({ connection: "connected", busy: false });
      },
      onStateChanged: ({ state }) => {
        if (epoch !== generation) return;
        try {
          confirmState(state);
        } catch (error) {
          rejectWireState(error);
        }
      },
      onRunFinishedEvent: (params) => {
        if (epoch !== generation) return;
        terminalSeen = true;
        finalizingEpoch = epoch;
        if (params.outcome === "interrupt") {
          if (params.interrupts.length !== 1) {
            rejectWireState(
              new Error(
                "当前薄 Agent 协作案例只支持同时处理一个请求。收到的中断清单超出本案例范围，已停止提交。",
              ),
            );
            return;
          }
          update({
            connection: "interrupted",
            busy: true,
            streamActive: false,
            interruptId: params.interrupts[0]?.id,
          });
          options.onNotice(
            "Agent 已请求你参与。提交后将由服务端核对，再继续同一任务。",
          );
        } else {
          update({
            connection:
              envelope?.task.phase === "ended" ? "finished" : "disconnected",
            busy: true,
            streamActive: false,
            interruptId: undefined,
          });
        }
      },
      onRunErrorEvent: ({ event }) => {
        if (epoch !== generation) return;
        terminalSeen = true;
        finalizingEpoch = epoch;
        runErrorSeen = true;
        update({
          connection:
            status.interruptId &&
            envelope?.task.requests.some(
              (request) => request.status === "pending",
            )
              ? "interrupted"
              : "disconnected",
          busy: true,
          streamActive: false,
        });
        options.onNotice(
          `服务端拒绝本次操作：${event.message}。已保留最后确认的任务状态。`,
        );
      },
    };
    void current
      .runAgent({ ...parameters, runId }, subscriber)
      .catch((error: unknown) => {
        if (epoch !== generation || runErrorSeen) return;
        update({
          connection: "disconnected",
          busy: false,
          streamActive: false,
        });
        options.onNotice(
          `连接中断：${error instanceof Error ? error.message : String(error)}。保留最后确认状态，请恢复连接后继续。`,
        );
      })
      .finally(() => {
        if (epoch !== generation) return;
        finalizingEpoch = undefined;
        if (terminalSeen) update({ busy: commandEpoch === epoch });
        if (!terminalSeen) {
          update({
            connection: "disconnected",
            busy: false,
            streamActive: false,
          });
          options.onNotice(
            "事件连接在收到结束或协作中断事件前关闭。已保留最后确认状态，请恢复连接核对。",
          );
        }
      });
  }

  async function snapshot(taskId: string): Promise<InterventionAgentEnvelope> {
    const response = await fetch(
      `${baseUrl}/tasks/${encodeURIComponent(taskId)}`,
      { credentials: "same-origin", signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok)
      throw new Error(`恢复任务失败（HTTP ${response.status}）。`);
    const value: unknown = await response.json();
    if (!isInterventionAgentEnvelope(value) || value.task.runId !== taskId)
      throw new Error("恢复响应与当前任务不一致，已保留最后确认状态。");
    return value;
  }

  return {
    async start(scenarioId: string, manual: boolean): Promise<void> {
      stopStream();
      const epoch = generation;
      envelope = undefined;
      eventSequence = 0;
      const threadId = `agui-thread:${crypto.randomUUID()}`;
      update({
        connection: "connecting",
        busy: true,
        threadId,
        runId: "",
        interruptId: undefined,
      });
      try {
        const health = await fetch(`${baseUrl}/health`, {
          credentials: "same-origin",
          signal: AbortSignal.timeout(10000),
        });
        if (epoch !== generation) return;
        if (!health.ok)
          throw new Error(`Agent 服务不可用（HTTP ${health.status}）。`);
        agent = new HttpAgent({
          url: `${baseUrl}/run`,
          threadId,
          initialState: {},
        });
        beginRun({
          forwardedProps: { operation: "start", scenarioId, manual },
        });
      } catch (error) {
        if (epoch !== generation) return;
        update({
          connection: "disconnected",
          busy: false,
          streamActive: false,
        });
        options.onNotice(
          `${error instanceof Error ? error.message : String(error)} 页面没有改用本地回放，请检查 Agent 服务后重试。`,
        );
      }
    },
    respond(action: Extract<LabAction, { type: "respond" }>): void {
      if (
        status.busy ||
        status.streamActive ||
        !status.interruptId ||
        !envelope
      )
        return;
      beginRun({
        forwardedProps: { operation: "continue", taskId: envelope.task.runId },
        resume: [
          {
            interruptId: status.interruptId,
            status: "resolved",
            payload: action,
          },
        ],
      });
    },
    async command(
      action: LabAction | { type: "advance"; actionId: string },
    ): Promise<void> {
      if (status.busy || !envelope || status.connection !== "connected") return;
      const epoch = generation;
      const taskId = envelope.task.runId;
      const expectedRevision = envelope.revision;
      commandEpoch = epoch;
      update({ busy: true });
      try {
        const response = await fetch(
          `${baseUrl}/tasks/${encodeURIComponent(taskId)}/commands`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({ action, expectedRevision }),
          },
        );
        if (epoch !== generation) return;
        const result: unknown = await response.json();
        if (epoch !== generation) return;
        if (
          !object(result) ||
          typeof result.accepted !== "boolean" ||
          typeof result.detail !== "string" ||
          !Number.isSafeInteger(result.revision)
        )
          throw new Error("服务端返回了无法识别的命令结果。");
        options.onNotice(
          `${result.accepted ? "服务端已接受" : "服务端已拒绝"}：${result.detail}`,
        );
      } catch (error) {
        if (epoch !== generation) return;
        update({ connection: "disconnected", streamActive: false });
        stopStream();
        options.onNotice(
          `命令结果尚未确认：${error instanceof Error ? error.message : String(error)}。请恢复连接核对，页面未预先修改任务。`,
        );
      } finally {
        if (epoch === generation) {
          commandEpoch = undefined;
          update({ busy: finalizingEpoch === epoch });
        }
      }
    },
    async reconnect(): Promise<void> {
      if (status.busy || !envelope || !agent) return;
      const taskId = envelope.task.runId;
      const currentAgent = agent;
      stopStream();
      const epoch = generation;
      update({ busy: true, connection: "connecting" });
      try {
        await currentAgent.detachActiveRun();
        if (epoch !== generation || currentAgent !== agent) return;
        const restored = await snapshot(taskId);
        if (epoch !== generation || currentAgent !== agent) return;
        confirmState(restored);
        currentAgent.state = structuredClone(restored);
        if (restored.openInterrupts.length > 1)
          throw new Error(
            "当前薄 Agent 页面只支持同时处理一个协作中断，不能替你生成其余答复。",
          );
        const interrupt = restored.openInterrupts[0];
        if (interrupt) {
          currentAgent.pendingInterrupts = structuredClone(
            restored.openInterrupts,
          );
          update({
            connection: "interrupted",
            busy: false,
            interruptId: interrupt.id,
          });
          options.onNotice(
            "已恢复服务端最后状态。协作请求仍待处理，请提交答复后继续。",
          );
        } else if (restored.task.phase === "ended") {
          update({
            connection: "finished",
            busy: false,
            interruptId: undefined,
          });
          options.onNotice("已恢复服务端结束状态。");
        } else {
          beginRun({
            forwardedProps: {
              operation: "continue",
              taskId: restored.task.runId,
            },
          });
        }
      } catch (error) {
        if (epoch !== generation) return;
        update({
          connection: "disconnected",
          busy: false,
          streamActive: false,
        });
        options.onNotice(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    close(): void {
      stopStream();
      agent = undefined;
      envelope = undefined;
      update({ connection: "idle", interruptId: undefined });
    },
  };
}
