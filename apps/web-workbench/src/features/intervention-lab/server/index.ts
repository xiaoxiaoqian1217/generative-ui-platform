import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  EventSchemas,
  type Interrupt,
  type RunAgentInput,
  RunAgentInputSchema,
} from "@ag-ui/core";
import {
  INTERVENTION_AGENT_PATH,
  type InterventionAgentState,
  type InterventionCommandResult,
  interventionCommandSchema,
  interventionResponseSchema,
  interventionRunPropsSchema,
} from "./contract.js";
import {
  applyTaskAction,
  createInterventionTask,
  nextTaskAction,
  pendingTaskRequests,
} from "./task.js";

export type {
  InterventionAgentState,
  InterventionCommandResult,
  InterventionScenarioId,
} from "./contract.js";

export interface InterventionAgentServerOptions {
  host?: string;
  port?: number;
  tickMs?: number;
}

export interface InterventionAgentServer {
  readonly url: string;
  start(): Promise<string>;
  stop(): Promise<void>;
}

interface ProtocolStream {
  input: RunAgentInput;
  response: ServerResponse;
}

interface TaskRecord {
  envelope: InterventionAgentState;
  threadId: string;
  manual: boolean;
  commandIds: Set<string>;
  timer?: ReturnType<typeof setInterval> | undefined;
  stream?: ProtocolStream | undefined;
}

const BODY_LIMIT = 64 * 1024;
const TASK_LIMIT = 32;
const RUN_LIMIT = 10_000;

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const part of request) {
    const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
    size += chunk.length;
    if (size > BODY_LIMIT) throw new RequestError(413, "请求正文过大。");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "请求正文必须是JSON。");
  }
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function openStream(response: ServerResponse): void {
  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  response.flushHeaders();
}

function event(response: ServerResponse, payload: unknown): void {
  if (response.destroyed || response.writableEnded) return;
  const nativeEvent = EventSchemas.parse(payload);
  response.write(`data: ${JSON.stringify(nativeEvent)}\n\n`);
}

function runError(
  response: ServerResponse,
  input: RunAgentInput,
  code: string,
  message: string,
): void {
  openStream(response);
  event(response, {
    type: "RUN_STARTED",
    threadId: input.threadId,
    runId: input.runId,
  });
  event(response, { type: "RUN_ERROR", code, message });
  response.end();
}

function interruptsFor(record: TaskRecord): Interrupt[] {
  const envelope = record.envelope;
  return pendingTaskRequests(envelope).map((request) => ({
    id: request.id,
    reason: "input_required",
    message: request.title,
    metadata: {
      taskId: envelope.task.runId,
      requestVersion: request.version,
      simulation: true,
    },
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: [
        "type",
        "actionId",
        "runId",
        "requestId",
        "requestVersion",
        "optionId",
      ],
      properties: {
        type: { const: "respond" },
        actionId: { type: "string", minLength: 1, maxLength: 200 },
        runId: { const: envelope.task.runId },
        requestId: { const: request.id },
        requestVersion: { const: request.version },
        optionId: { enum: request.options.map((option) => option.id) },
        provenance: {
          enum: ["interactive", "fixture-event", "fixture-script"],
        },
        values: { type: "object", additionalProperties: { type: "string" } },
      },
    },
  }));
}

function snapshot(record: TaskRecord): void {
  record.envelope.openInterrupts = interruptsFor(record);
  if (!record.stream) return;
  event(record.stream.response, {
    type: "STATE_SNAPSHOT",
    snapshot: record.envelope,
  });
}

function changed(record: TaskRecord): void {
  record.envelope.openInterrupts = interruptsFor(record);
  if (!record.stream) return;
  const envelope = record.envelope;
  event(record.stream.response, {
    type: "STATE_DELTA",
    delta: [
      { op: "replace", path: "/revision", value: envelope.revision },
      { op: "replace", path: "/task", value: envelope.task },
      { op: "replace", path: "/inputActions", value: envelope.inputActions },
      { op: "replace", path: "/cursor", value: envelope.cursor },
      {
        op: "replace",
        path: "/openInterrupts",
        value: envelope.openInterrupts,
      },
    ],
  });
}

function finishIfNeeded(record: TaskRecord): void {
  const stream = record.stream;
  if (!stream) return;
  const interrupts = record.envelope.openInterrupts;
  if (interrupts.length === 0 && record.envelope.task.phase !== "ended") return;
  // Resume inputs need both state and message baselines before the terminal event.
  snapshot(record);
  if (interrupts.length > 0) {
    event(stream.response, { type: "MESSAGES_SNAPSHOT", messages: [] });
  }
  event(stream.response, {
    type: "RUN_FINISHED",
    threadId: stream.input.threadId,
    runId: stream.input.runId,
    outcome:
      interrupts.length > 0
        ? { type: "interrupt", interrupts }
        : { type: "success" },
    ...(interrupts.length > 0
      ? {}
      : {
          result: {
            taskId: record.envelope.task.runId,
            outcome: record.envelope.task.outcome,
          },
        }),
  });
  record.stream = undefined;
  stream.response.end();
}

function advance(
  record: TaskRecord,
  actionId?: string,
): InterventionCommandResult {
  const action = nextTaskAction(record.envelope, actionId);
  if (!action) {
    return {
      accepted: false,
      revision: record.envelope.revision,
      detail:
        pendingTaskRequests(record.envelope).length > 0
          ? "当前等待人工答复，不注入执行事实。"
          : "本次任务已结束，没有后续模拟执行动作。",
    };
  }
  record.envelope = applyTaskAction(record.envelope, action, true);
  changed(record);
  finishIfNeeded(record);
  if (record.envelope.task.phase === "ended" && record.timer) {
    clearInterval(record.timer);
    record.timer = undefined;
  }
  return {
    accepted: true,
    revision: record.envelope.revision,
    detail: record.envelope.task.logs.at(-1)?.detail ?? "服务端状态已更新。",
  };
}

function resumeCandidate(
  record: TaskRecord,
  input: RunAgentInput,
): InterventionAgentState {
  const pending = pendingTaskRequests(record.envelope);
  const responses = input.resume ?? [];
  if (pending.length === 0 && responses.length > 0) {
    throw new Error("当前没有未处理的协议中断，旧答复不能重复执行。");
  }
  if (pending.length !== responses.length) {
    throw new Error("恢复输入必须覆盖全部未处理的协议中断。");
  }
  const responseIds = new Set(
    responses.map((response) => response.interruptId),
  );
  if (
    responseIds.size !== responses.length ||
    pending.some((request) => !responseIds.has(request.id))
  ) {
    throw new Error("恢复输入含未知、重复或失效的中断标识。");
  }
  let candidate = record.envelope;
  for (const response of responses) {
    if (response.status !== "resolved") {
      throw new Error(
        "本验证场景需要有效观测点；取消不解除缺参，请重新提交有效答复。",
      );
    }
    const parsed = interventionResponseSchema.safeParse(response.payload);
    if (!parsed.success || parsed.data.requestId !== response.interruptId) {
      throw new Error("答复结构或请求关联不正确。");
    }
    const { values, ...answer } = parsed.data;
    candidate = applyTaskAction(candidate, {
      ...answer,
      provenance: "interactive",
      ...(values === undefined ? {} : { values }),
    });
  }
  return candidate;
}

/** Independent, dev-only, rule-driven task executor using native AG-UI events. */
export function createInterventionAgentServer(
  options: InterventionAgentServerOptions = {},
): InterventionAgentServer {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4802;
  const tickMs = options.tickMs ?? 1_500;
  if (!Number.isFinite(tickMs) || tickMs < 1)
    throw new Error("tickMs必须为正数。");
  const tasks = new Map<string, TaskRecord>();
  const threadTasks = new Map<string, string>();
  const runIds = new Set<string>();
  let baseUrl = "";

  const handleRun = async (
    request: IncomingMessage,
    response: ServerResponse,
  ) => {
    const parsed = RunAgentInputSchema.safeParse(await readBody(request));
    if (!parsed.success)
      throw new RequestError(400, "运行输入不符合原生AG-UI结构。");
    const input = parsed.data;
    if (
      !input.threadId.trim() ||
      !input.runId.trim() ||
      input.threadId.length > 200 ||
      input.runId.length > 200
    ) {
      return runError(
        response,
        input,
        "INVALID_RUN_ID",
        "会话和运行标识不能为空或过长。",
      );
    }
    const runKey = JSON.stringify([input.threadId, input.runId]);
    if (runIds.has(runKey))
      return runError(
        response,
        input,
        "DUPLICATE_RUN",
        "协议运行标识已经使用，请创建新的runId。",
      );
    if (runIds.size >= RUN_LIMIT)
      return runError(
        response,
        input,
        "RUN_LIMIT",
        "验证服务运行数量达到上限，请重启验证服务。",
      );
    runIds.add(runKey);
    const props = interventionRunPropsSchema.safeParse(input.forwardedProps);
    if (!props.success)
      return runError(
        response,
        input,
        "INVALID_OPERATION",
        "运行操作或场景不符合验证服务契约。",
      );
    let record: TaskRecord;
    if (props.data.operation === "start") {
      if (input.resume?.length)
        return runError(
          response,
          input,
          "INVALID_RESUME",
          "新任务不能携带恢复答复。",
        );
      if (threadTasks.has(input.threadId))
        return runError(
          response,
          input,
          "THREAD_IN_USE",
          "该会话已有任务，请恢复原任务或使用新会话。",
        );
      if (tasks.size >= TASK_LIMIT)
        return runError(
          response,
          input,
          "TASK_LIMIT",
          "验证任务数量达到上限，请重启验证服务。",
        );
      record = {
        envelope: createInterventionTask(props.data.scenarioId),
        threadId: input.threadId,
        manual: props.data.manual === true,
        commandIds: new Set(),
      };
      tasks.set(record.envelope.task.runId, record);
      threadTasks.set(input.threadId, record.envelope.task.runId);
    } else {
      const existing = tasks.get(props.data.taskId);
      if (!existing || existing.threadId !== input.threadId) {
        return runError(
          response,
          input,
          "TASK_THREAD_MISMATCH",
          "任务不存在或不属于当前会话。",
        );
      }
      if (existing.stream)
        return runError(
          response,
          input,
          "RUN_ACTIVE",
          "当前会话已有活动运行，请等待结束或断开原连接。",
        );
      record = existing;
      try {
        // Client-provided input.state is deliberately never used as task truth.
        record.envelope = resumeCandidate(record, input);
      } catch (error) {
        return runError(
          response,
          input,
          "INVALID_RESUME",
          error instanceof Error ? error.message : "恢复输入无效。",
        );
      }
    }
    openStream(response);
    const stream = { input, response };
    record.stream = stream;
    response.on("close", () => {
      if (record.stream === stream) record.stream = undefined;
    });
    event(response, {
      type: "RUN_STARTED",
      threadId: input.threadId,
      runId: input.runId,
    });
    snapshot(record);
    finishIfNeeded(record);
    if (
      !record.manual &&
      record.envelope.task.phase !== "ended" &&
      !record.timer
    ) {
      record.timer = setInterval(() => {
        try {
          advance(record);
        } catch (error) {
          if (record.timer) clearInterval(record.timer);
          record.timer = undefined;
          const active = record.stream;
          if (active) {
            event(active.response, {
              type: "RUN_ERROR",
              code: "SIMULATION_ADVANCE_FAILED",
              message:
                error instanceof Error ? error.message : "模拟执行失败。",
            });
            record.stream = undefined;
            active.response.end();
          }
        }
      }, tickMs);
      record.timer.unref();
    }
  };

  const handleCommand = async (
    request: IncomingMessage,
    response: ServerResponse,
    taskId: string,
  ) => {
    const record = tasks.get(taskId);
    if (!record) return json(response, 404, { error: "任务不存在。" });
    const parsed = interventionCommandSchema.safeParse(await readBody(request));
    if (!parsed.success)
      throw new RequestError(400, "命令格式无效；客户端不得注入执行事实。");
    const command = parsed.data;
    const reject = (detail: string) =>
      json(response, 200, {
        accepted: false,
        revision: record.envelope.revision,
        detail,
      } satisfies InterventionCommandResult);
    // No awaits inside this admission/commit section: timer and command mutations serialize.
    if (command.expectedRevision !== record.envelope.revision)
      return reject("任务状态版本已变化，请读取最新状态后重新提交。");
    if (
      record.commandIds.has(command.action.actionId) ||
      record.envelope.task.processedActionIds.includes(command.action.actionId)
    ) {
      return reject("重复动作已拒绝，不再次生效。");
    }
    if (record.envelope.task.phase === "ended")
      return reject("任务已结束，不再接收命令。");
    try {
      let result: InterventionCommandResult;
      if (command.action.type === "advance") {
        if (!record.manual)
          return reject("自动任务由服务端定时推进，不接受手动执行事实。");
        result = advance(record, command.action.actionId);
      } else {
        record.envelope = applyTaskAction(record.envelope, {
          ...command.action,
          provenance: "interactive",
        });
        changed(record);
        finishIfNeeded(record);
        result = {
          accepted: true,
          revision: record.envelope.revision,
          detail:
            record.envelope.task.logs.at(-1)?.detail ?? "优先顺序已更新。",
        };
      }
      if (result.accepted) record.commandIds.add(command.action.actionId);
      return json(response, 200, result);
    } catch (error) {
      return reject(error instanceof Error ? error.message : "命令未被接受。");
    }
  };

  const server = createServer((request, response) => {
    response.setHeader("access-control-allow-origin", "*");
    response.setHeader("access-control-allow-headers", "content-type");
    response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    void (async () => {
      if (request.method === "OPTIONS") return response.writeHead(204).end();
      const url = new URL(request.url ?? "/", `http://${host}`);
      if (
        request.method === "GET" &&
        url.pathname === `${INTERVENTION_AGENT_PATH}/health`
      ) {
        return json(response, 200, {
          schemaVersion: "intervention-agent/v1",
          execution: "deterministic-simulation",
          protocol: "ag-ui/http-post-sse",
          simulation: true,
          tasks: tasks.size,
        });
      }
      if (
        request.method === "POST" &&
        url.pathname === `${INTERVENTION_AGENT_PATH}/run`
      ) {
        return handleRun(request, response);
      }
      const taskRoute = url.pathname.match(
        /^\/api\/intervention-agent\/tasks\/([^/]+)(\/commands)?$/,
      );
      if (taskRoute?.[1]) {
        const taskId = decodeURIComponent(taskRoute[1]);
        if (request.method === "POST" && taskRoute[2])
          return handleCommand(request, response, taskId);
        if (request.method === "GET" && !taskRoute[2]) {
          const record = tasks.get(taskId);
          return record
            ? json(response, 200, record.envelope)
            : json(response, 404, { error: "任务不存在。" });
        }
      }
      return json(response, 404, { error: "接口不存在。" });
    })().catch((error) => {
      if (response.headersSent) {
        if (!response.destroyed && !response.writableEnded) {
          event(response, {
            type: "RUN_ERROR",
            code: "SERVER_ERROR",
            message: "验证服务处理失败。",
          });
          response.end();
        }
      } else {
        json(response, error instanceof RequestError ? error.status : 500, {
          error:
            error instanceof RequestError
              ? error.message
              : "验证服务处理失败。",
        });
      }
    });
  });

  return {
    get url() {
      return baseUrl;
    },
    start() {
      return new Promise<string>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          const address = server.address();
          if (!address || typeof address === "string")
            return reject(new Error("服务地址不可用。"));
          baseUrl = `http://${host}:${address.port}`;
          resolve(baseUrl);
        });
      });
    },
    async stop() {
      for (const record of tasks.values()) {
        if (record.timer) clearInterval(record.timer);
        record.timer = undefined;
        record.stream?.response.end();
        record.stream = undefined;
      }
      tasks.clear();
      threadTasks.clear();
      runIds.clear();
      if (!server.listening) return;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    },
  };
}
