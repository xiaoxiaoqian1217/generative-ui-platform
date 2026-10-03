/** Local deterministic experiment. No real robot, Nav2 or LLM is invoked. */
export type InterventionType = "confirm" | "choice" | "supplement" | "control";
export type RoadCondition = "unknown" | "passable" | "blocked";
export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "deferred"
  | "cancelled";
export type RequestStatus = "pending" | "resolved" | "obsolete";
export type Point = { x: number; y: number };

export interface LabRoad {
  id: string;
  name: string;
  polyline: Point[];
  status: "unchecked" | "observed";
  condition: RoadCondition;
  version: number;
  evidence: { source: string; detail: string; logicalTime: number }[];
}
export interface LabStep {
  id: string;
  label: string;
  roadId: string;
  status: StepStatus;
  version: number;
  failureReason?: string;
}
export type ResponseEffect =
  | "continue-others"
  | "retry-step"
  | "end-task"
  | "accept-change"
  | "reject-change"
  | "add-constraint"
  | "pause";
export interface RequestOption {
  id: string;
  label: string;
  effect: ResponseEffect;
}
export type RequiredInput =
  | { kind: "approval" }
  | { kind: "option"; options: RequestOption[] }
  | {
      kind: "fields";
      fields: { key: string; label: string; required: boolean }[];
    }
  | { kind: "command"; commands: RequestOption[] };
export interface LabRequest {
  id: string;
  runId: string;
  version: number;
  type: InterventionType;
  status: RequestStatus;
  title: string;
  reason: string;
  basis: string;
  roadIds: string[];
  stepIds: string[];
  requiredInput: RequiredInput;
  options: RequestOption[];
  createdPlanVersion: number;
  roadVersions: Record<string, number>;
  stepVersions: Record<string, number>;
  createdAt: number;
  resolvedAt?: number;
  resolution?: string;
}
export interface LabCommand {
  id: string;
  kind: "pause";
  status: "queued" | "sent" | "acknowledged";
  createdAt: number;
  acknowledgedAt?: number;
}
export interface LabLog {
  runId: string;
  sequence: number;
  logicalTime: number;
  source: "operator" | "simulator" | "application";
  actionId: string;
  actionType: LabAction["type"];
  accepted: boolean;
  detail: string;
  requestId?: string;
  planVersion: number;
  inputProvenance: "interactive" | "fixture-event" | "fixture-script";
}
export interface LabState {
  schemaVersion: "intervention-lab/v1";
  simulation: true;
  /** Feature-local experiment instance; not a product Runtime/Thread model. */
  runId: string;
  goal: string;
  phase: "ready" | "running" | "waiting" | "ended";
  outcome: "in-progress" | "complete" | "partial";
  planVersion: number;
  logicalTime: number;
  roads: LabRoad[];
  steps: LabStep[];
  requests: LabRequest[];
  constraints: {
    id: string;
    text: string;
    roadIds: string[];
    createdAt: number;
  }[];
  device: {
    id: string;
    name: string;
    link: "online" | "offline";
    execution: "running" | "paused" | "unknown";
    position: Point;
    lastConfirmedAt: number;
  };
  commands: LabCommand[];
  logs: LabLog[];
  processedActionIds: string[];
}
type ActionBase = {
  actionId: string;
  provenance?: "interactive" | "fixture-event" | "fixture-script";
};
export type LabAction = ActionBase &
  (
    | { type: "start-task" }
    | { type: "start-step"; stepId: string }
    | { type: "local-detour"; stepId: string }
    | {
        type: "observe-road";
        roadId: string;
        condition: Exclude<RoadCondition, "unknown">;
        detail: string;
      }
    | { type: "complete-step"; stepId: string }
    | {
        type: "navigation-failed";
        stepId: string;
        reason: string;
        recoveryExhausted: boolean;
        alternativeAvailable: boolean;
      }
    | {
        type: "open-request";
        requestId: string;
        title: string;
        reason: string;
        basis: string;
        roadIds: string[];
        stepIds: string[];
        requiredInput: RequiredInput;
      }
    | {
        type: "respond";
        runId: string;
        requestId: string;
        requestVersion: number;
        optionId: string;
        values?: Record<string, string>;
      }
    | { type: "add-constraint"; text: string; roadIds: string[] }
    | { type: "link-lost" }
    | { type: "link-restored" }
    | { type: "pause-command"; commandId: string }
    | { type: "device-ack"; commandId: string }
    | { type: "finish-task" }
  );
export interface LabPresentation {
  runId: string;
  goal: string;
  phase: LabState["phase"];
  outcome: LabState["outcome"];
  planVersion: number;
  roads: LabRoad[];
  steps: LabStep[];
  pendingRequests: LabRequest[];
  requests: LabRequest[];
  focusRoadIds: string[];
  constraints: LabState["constraints"];
  device: LabState["device"];
  commands: LabCommand[];
  logs: LabLog[];
  uncheckedRoadIds: string[];
  rules: typeof LAB_RULES;
}

export const LAB_RULES = [
  {
    id: "R1",
    basis: "本实验应用处理约定",
    rule: "局部绕行仍完成原步骤时自主继续，不产生人工请求。",
  },
  {
    id: "R2",
    basis: "本实验应用处理约定",
    rule: "导航已用尽恢复且没有可执行替代办法时，生成继续其他路段、重试或结束的明确选择请求；导航失败不等于道路阻断。",
  },
  {
    id: "R3",
    basis: "显式请求的输入结构",
    rule: "审批值、选项、待填字段和控制命令分别映射确认、选择、补充和控制；不计算风险分数。",
  },
  {
    id: "R4",
    basis: "本实验状态一致性约定",
    rule: "请求绑定关联道路和步骤；改变相关任务约束会使请求失效，无关状态更新不使其失效。",
  },
  {
    id: "R5",
    basis: "本实验状态一致性约定",
    rule: "人工决策、已发指令和设备执行分别记录；未收到设备回执不能显示已暂停。",
  },
  {
    id: "R6",
    basis: "本实验状态一致性约定",
    rule: "重复动作和已处理、过期请求不得再次改变任务；未观察道路始终保留未查明事实。",
  },
  {
    id: "R7",
    basis: "本实验简化执行约定",
    rule: "后续步骤可直接按人工排除约束取消；进行中步骤须先取得模拟设备暂停回执再取消。已暂停或失联时不接收模拟实时查验反馈。",
  },
] as const;

// This feature state is deliberately JSON-only. JSON cloning also accepts Vue
// reactive proxies; structuredClone(proxy) would fail in the actual route.
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createInitialState(runId = "fixture-run"): LabState {
  return {
    schemaVersion: "intervention-lab/v1",
    simulation: true,
    runId,
    goal: "查清选定街区主要道路的通行情况，标出受阻和未查明路段。",
    phase: "ready",
    outcome: "in-progress",
    planVersion: 1,
    logicalTime: 0,
    roads: [
      {
        id: "r-a",
        name: "西侧主路 A",
        polyline: [
          { x: 18, y: 20 },
          { x: 18, y: 72 },
        ],
        status: "unchecked",
        condition: "unknown",
        version: 1,
        evidence: [],
      },
      {
        id: "r-b",
        name: "中央道路 B",
        polyline: [
          { x: 18, y: 47 },
          { x: 76, y: 47 },
        ],
        status: "unchecked",
        condition: "unknown",
        version: 1,
        evidence: [],
      },
      {
        id: "r-c",
        name: "东侧道路 C",
        polyline: [
          { x: 76, y: 20 },
          { x: 76, y: 78 },
        ],
        status: "unchecked",
        condition: "unknown",
        version: 1,
        evidence: [],
      },
    ],
    steps: [
      {
        id: "s-a",
        label: "查验西侧主路",
        roadId: "r-a",
        status: "pending",
        version: 1,
      },
      {
        id: "s-b",
        label: "查验中央道路",
        roadId: "r-b",
        status: "pending",
        version: 1,
      },
      {
        id: "s-c",
        label: "查验东侧道路",
        roadId: "r-c",
        status: "pending",
        version: 1,
      },
    ],
    requests: [],
    constraints: [],
    device: {
      id: "ugv-01",
      name: "模拟 UGV-01",
      link: "online",
      execution: "running",
      position: { x: 18, y: 20 },
      lastConfirmedAt: 0,
    },
    commands: [],
    logs: [],
    processedActionIds: [],
  };
}

export function interventionType(input: RequiredInput): InterventionType {
  return (
    {
      approval: "confirm",
      option: "choice",
      fields: "supplement",
      command: "control",
    } as const
  )[input.kind];
}

function requestOptions(input: RequiredInput): RequestOption[] {
  if (input.kind === "approval")
    return [
      { id: "approve", label: "批准待提出的调整", effect: "accept-change" },
      { id: "reject", label: "拒绝调整", effect: "reject-change" },
    ];
  if (input.kind === "fields")
    return [{ id: "submit", label: "提交补充要求", effect: "add-constraint" }];
  return input.kind === "option" ? input.options : input.commands;
}

function sourceOf(action: LabAction): LabLog["source"] {
  if (
    [
      "start-task",
      "respond",
      "add-constraint",
      "pause-command",
      "finish-task",
    ].includes(action.type)
  )
    return "operator";
  return action.type === "open-request" ? "application" : "simulator";
}

function invalidateRequests(
  state: LabState,
  roadIds: string[],
  stepIds: string[],
  reason: string,
  exceptId?: string,
): void {
  for (const request of state.requests) {
    if (request.status !== "pending" || request.id === exceptId) continue;
    if (
      request.roadIds.some((id) => roadIds.includes(id)) ||
      request.stepIds.some((id) => stepIds.includes(id))
    ) {
      request.status = "obsolete";
      request.resolution = reason;
      request.resolvedAt = state.logicalTime;
    }
  }
}

function newRequest(
  state: LabState,
  input: Omit<
    LabRequest,
    | "runId"
    | "version"
    | "type"
    | "status"
    | "options"
    | "createdPlanVersion"
    | "createdAt"
    | "roadVersions"
    | "stepVersions"
  >,
): void {
  state.requests.push({
    ...input,
    runId: state.runId,
    version: 1,
    type: interventionType(input.requiredInput),
    status: "pending",
    options: requestOptions(input.requiredInput),
    createdPlanVersion: state.planVersion,
    createdAt: state.logicalTime,
    roadVersions: Object.fromEntries(
      state.roads
        .filter((road) => input.roadIds.includes(road.id))
        .map((road) => [road.id, road.version]),
    ),
    stepVersions: Object.fromEntries(
      state.steps
        .filter((step) => input.stepIds.includes(step.id))
        .map((step) => [step.id, step.version]),
    ),
  });
}

function updatePhase(state: LabState): void {
  if (state.phase === "ready" || state.phase === "ended") return;
  state.phase = state.requests.some((request) => request.status === "pending")
    ? "waiting"
    : "running";
}

function applyConstraint(
  state: LabState,
  text: string,
  roadIds: string[],
  actionId: string,
  exceptId?: string,
): void {
  state.constraints.push({
    id: `constraint:${actionId}`,
    text,
    roadIds: [...roadIds],
    createdAt: state.logicalTime,
  });
  const affected = state.steps.filter(
    (step) => roadIds.includes(step.roadId) && step.status !== "completed",
  );
  for (const step of affected) {
    step.status = "cancelled";
    step.version += 1;
  }
  state.planVersion += 1;
  invalidateRequests(
    state,
    roadIds,
    affected.map((step) => step.id),
    "人工新增约束改变了本请求关联范围，请求已失效。",
    exceptId,
  );
}

function issuePause(state: LabState, commandId: string): void {
  state.commands.push({
    id: commandId,
    kind: "pause",
    status: state.device.link === "online" ? "sent" : "queued",
    createdAt: state.logicalTime,
  });
  // Issuing a command is not an observation that the device has executed it.
}

function applyAction(
  state: LabState,
  action: LabAction,
): { accepted: boolean; detail: string; requestId?: string } {
  const reject = (detail: string) => ({
    accepted: false,
    detail,
    ...("requestId" in action ? { requestId: action.requestId } : {}),
  });
  const accept = (detail: string, requestId?: string) => ({
    accepted: true,
    detail,
    ...(requestId ? { requestId } : {}),
  });
  const step =
    "stepId" in action
      ? state.steps.find((item) => item.id === action.stepId)
      : undefined;
  if (action.type === "start-task") {
    if (state.phase !== "ready")
      return reject("任务已经启动，不能重复启动。请重置实验。 ");
    state.phase = "running";
    return accept(
      "已接受任务目标，执行步骤属于本实验计划，不是用户输入的硬性必检要求。",
    );
  }
  if (state.phase === "ready") return reject("任务尚未开始。");
  if (state.phase === "ended")
    return reject("本次任务已结束，后续动作不再改变任务。");
  if ("stepId" in action && !step) return reject("找不到指定任务步骤。");
  switch (action.type) {
    case "start-step": {
      if (step!.status !== "pending") return reject("只有待执行步骤可以开始。");
      if (
        state.device.link !== "online" ||
        state.device.execution !== "running"
      )
        return reject("当前没有已确认的在线运行状态，不能开始模拟设备步骤。");
      if (
        state.steps.some(
          (item) => item.status === "running" && item.id !== step!.id,
        )
      )
        return reject("本实验只有一台UGV，不能同时开始另一条道路查验步骤。");
      if (
        state.requests.some(
          (request) =>
            request.status === "pending" && request.stepIds.includes(step!.id),
        )
      )
        return reject("本步骤仍有待处理请求。");
      step!.status = "running";
      step!.version += 1;
      state.device.position = {
        ...state.roads.find((road) => road.id === step!.roadId)!.polyline[0]!,
      };
      state.device.lastConfirmedAt = state.logicalTime;
      return accept(`模拟执行：${step!.label}。`);
    }
    case "local-detour": {
      if (step!.status !== "running")
        return reject("局部绕行事件只能作用于执行中的步骤。");
      if (
        state.device.link !== "online" ||
        state.device.execution !== "running"
      )
        return reject("缺少在线运行确认，不接收模拟实时绕行反馈。");
      return accept(
        "模拟局部绕行成功，目标和步骤不变，自主继续；不生成介入请求。",
      );
    }
    case "observe-road": {
      const road = state.roads.find((item) => item.id === action.roadId);
      if (!road || !action.detail.trim()) return reject("道路或观测依据无效。");
      const roadStep = state.steps.find((item) => item.roadId === road.id);
      if (roadStep?.status !== "running")
        return reject("只有正在查验的道路可以接收本实验观测。");
      if (
        state.device.link !== "online" ||
        state.device.execution !== "running"
      )
        return reject("缺少在线运行确认，不接收模拟实时道路观测。");
      road.status = "observed";
      road.condition = action.condition;
      road.version += 1;
      road.evidence.push({
        source: "模拟 UGV 观测事件",
        detail: action.detail,
        logicalTime: state.logicalTime,
      });
      invalidateRequests(
        state,
        [road.id],
        [],
        "关联道路出现新观测，原请求需要重新形成。",
      );
      return accept(
        `${road.name}获得模拟观测：${action.condition === "passable" ? "该模拟UGV可通过" : "已观察到阻断"}。`,
      );
    }
    case "complete-step": {
      if (step!.status !== "running")
        return reject("步骤未处于执行中，不能标记完成。");
      if (
        state.device.link !== "online" ||
        state.device.execution !== "running"
      )
        return reject("缺少在线运行确认，不接收模拟实时步骤完成反馈。");
      if (
        state.roads.find((road) => road.id === step!.roadId)!.status !==
        "observed"
      )
        return reject("尚未取得道路观测，不能把查验步骤标记完成。");
      step!.status = "completed";
      step!.version += 1;
      const completedRoad = state.roads.find(
        (road) => road.id === step!.roadId,
      )!;
      // A successful inspection may discover blockage without traversing the road.
      if (completedRoad.condition === "passable")
        state.device.position = { ...completedRoad.polyline.at(-1)! };
      state.device.lastConfirmedAt = state.logicalTime;
      invalidateRequests(
        state,
        [],
        [step!.id],
        "关联步骤已完成，原请求不再适用。",
      );
      return accept(`${step!.label}完成；已有道路观测保持可追溯。`);
    }
    case "navigation-failed": {
      if (step!.status !== "running")
        return reject("导航失败只能来自执行中的步骤。");
      if (
        state.device.link !== "online" ||
        state.device.execution !== "running"
      )
        return reject("缺少在线运行确认，不接收模拟实时导航反馈。");
      if (!action.reason.trim()) return reject("执行失败需要明确反馈原因。");
      if (!action.recoveryExhausted)
        return accept("模拟导航仍在恢复中；尚未最终失败，不请求人工。");
      step!.status = "failed";
      step!.failureReason = action.reason;
      step!.version += 1;
      if (action.alternativeAvailable)
        return accept(
          "导航失败，但存在应用已可执行的替代分支，本事件不请求人工。",
        );
      const requestId = `failure:${action.actionId}`;
      newRequest(state, {
        id: requestId,
        title: `${step!.label}待处理`,
        reason: action.reason,
        basis:
          "R2：模拟导航已用尽恢复，fixture声明没有可执行替代分支；本实验约定请操作员选择后续处理。",
        roadIds: [step!.roadId],
        stepIds: [step!.id],
        requiredInput: {
          kind: "option",
          options: [
            {
              id: "defer",
              label: "保留未查明，继续其他路段",
              effect: "continue-others",
            },
            { id: "retry", label: "重新尝试本步骤", effect: "retry-step" },
            { id: "end", label: "结束本次任务", effect: "end-task" },
          ],
        },
      });
      return accept(
        "执行失败并产生明确选择请求；道路仍为未查明，不能推定已经阻断。",
        requestId,
      );
    }
    case "open-request": {
      if (
        !action.requestId.trim() ||
        state.requests.some((request) => request.id === action.requestId)
      )
        return reject("请求标识为空或重复。");
      if (!action.title.trim() || !action.reason.trim() || !action.basis.trim())
        return reject("显式请求必须包含标题、原因和处理依据。");
      if (
        action.roadIds.some(
          (id) => !state.roads.some((road) => road.id === id),
        ) ||
        action.stepIds.some((id) => !state.steps.some((item) => item.id === id))
      )
        return reject("请求关联道路或步骤不存在。");
      if (!requestOptions(action.requiredInput).length)
        return reject("请求没有可处理的输入。");
      if (
        action.requiredInput.kind === "fields" &&
        (!action.requiredInput.fields.length ||
          action.requiredInput.fields.some((field) => !field.key.trim()))
      )
        return reject("补充请求必须定义待填字段。");
      const {
        requestId,
        title,
        reason,
        basis,
        roadIds,
        stepIds,
        requiredInput,
      } = action;
      newRequest(state, {
        id: requestId,
        title,
        reason,
        basis,
        roadIds: [...roadIds],
        stepIds: [...stepIds],
        requiredInput,
      });
      return accept(
        `依据显式所需输入形成${interventionType(requiredInput)}请求，不依赖LLM风险判断。`,
        requestId,
      );
    }
    case "respond": {
      if (action.runId !== state.runId)
        return reject("答复属于其他实验实例，不能修改当前任务。");
      const request = state.requests.find(
        (item) => item.id === action.requestId,
      );
      if (!request) return reject("请求不存在，答复已拒绝。");
      if (request.version !== action.requestVersion)
        return reject("答复绑定的请求版本不匹配，已拒绝。");
      if (request.status === "obsolete")
        return reject("原请求已过期，答复不会覆盖新计划。");
      if (request.status !== "pending")
        return reject("请求已经处理，答复不会重复生效。");
      if (
        Object.entries(request.roadVersions).some(
          ([id, version]) =>
            state.roads.find((road) => road.id === id)?.version !== version,
        ) ||
        Object.entries(request.stepVersions).some(
          ([id, version]) =>
            state.steps.find((step) => step.id === id)?.version !== version,
        )
      )
        return reject("请求关联的道路或步骤版本已改变，旧答复已拒绝。");
      const option = request.options.find(
        (item) => item.id === action.optionId,
      );
      if (!option) return reject("答复选项不属于该请求，已拒绝。");
      if (
        request.requiredInput.kind === "fields" &&
        request.requiredInput.fields.some(
          (field) => field.required && !action.values?.[field.key]?.trim(),
        )
      )
        return reject("必填的补充内容尚未提供。");
      if (option.effect === "add-constraint" && !request.roadIds.length)
        return reject("本实验补充约束需关联道路范围。");
      if (
        option.effect === "retry-step" &&
        (!request.stepIds.length ||
          state.steps.some(
            (item) =>
              request.stepIds.includes(item.id) &&
              item.status !== "failed" &&
              item.status !== "deferred",
          ))
      )
        return reject(
          "本实验只允许重新尝试执行失败或暂缓的步骤，不能重置执行中或已完成步骤。",
        );
      if (
        ["continue-others", "accept-change", "add-constraint"].includes(
          option.effect,
        ) &&
        state.device.execution !== "paused" &&
        state.steps.some(
          (item) =>
            item.status === "running" &&
            (request.stepIds.includes(item.id) ||
              request.roadIds.includes(item.roadId)),
        )
      )
        return reject(
          "关联道路正在执行；本实验需先收到设备暂停回执，才能取消该执行计划。答复尚未生效。",
        );
      if (
        option.effect === "pause" &&
        state.commands.some((command) => command.status !== "acknowledged")
      )
        return reject("已有待确认暂停指令，请勿重复发送。");
      request.status = "resolved";
      request.resolvedAt = state.logicalTime;
      request.resolution =
        request.requiredInput.kind === "fields"
          ? Object.entries(action.values ?? {})
              .map(([key, value]) => `${key}: ${value}`)
              .join("；")
          : option.label;
      if (
        option.effect === "continue-others" ||
        option.effect === "accept-change"
      ) {
        for (const item of state.steps.filter(
          (item) =>
            request.stepIds.includes(item.id) && item.status !== "completed",
        )) {
          item.status = "deferred";
          item.version += 1;
        }
        state.planVersion += 1;
        invalidateRequests(
          state,
          request.roadIds,
          request.stepIds,
          "相关步骤已被本次人工决定调整。",
          request.id,
        );
      } else if (option.effect === "retry-step") {
        for (const item of state.steps.filter((item) =>
          request.stepIds.includes(item.id),
        )) {
          item.status = "pending";
          item.version += 1;
          delete item.failureReason;
        }
        state.planVersion += 1;
        invalidateRequests(
          state,
          request.roadIds,
          request.stepIds,
          "相关步骤已安排重试。",
          request.id,
        );
      } else if (option.effect === "add-constraint") {
        applyConstraint(
          state,
          Object.values(action.values ?? {}).join("；"),
          request.roadIds,
          action.actionId,
          request.id,
        );
      } else if (option.effect === "pause") {
        issuePause(state, `pause:${action.actionId}`);
      } else if (option.effect === "end-task") {
        endTask(state);
      }
      // Rejecting the proposed change preserves the previous task requirement;
      // it does not turn a failed or unobserved step into a success.
      return accept(
        `已接收人工答复：${request.resolution}。${option.effect === "pause" ? "暂停指令待设备确认。" : "道路事实不由答复自动改写。"}`,
        request.id,
      );
    }
    case "add-constraint": {
      if (
        !action.text.trim() ||
        !action.roadIds.length ||
        action.roadIds.some((id) => !state.roads.some((road) => road.id === id))
      )
        return reject("主动修改需包含内容和有效道路范围。");
      if (
        state.device.execution !== "paused" &&
        state.steps.some(
          (item) =>
            item.status === "running" && action.roadIds.includes(item.roadId),
        )
      )
        return reject(
          "该道路正在执行；本实验仅直接修改后续步骤。请先请求暂停，收到设备暂停回执后再修改当前步骤。",
        );
      applyConstraint(state, action.text, action.roadIds, action.actionId);
      return accept(
        "已接收操作员主动修改，仅更新关联后续步骤；已有结果和未查明事实保留。",
      );
    }
    case "link-lost": {
      if (state.device.link === "offline") return reject("链路已经失联。");
      state.device.link = "offline";
      state.device.execution = "unknown";
      return accept(
        "模拟链路失联：位置和执行状态仅代表最后确认，不推定设备已经停止。",
      );
    }
    case "link-restored": {
      if (state.device.link === "online") return reject("链路已经在线。");
      state.device.link = "online";
      for (const command of state.commands.filter(
        (command) => command.status === "queued",
      ))
        command.status = "sent";
      return accept(
        "模拟链路恢复，已排队指令变为已发送；设备执行状态仍等待回执。",
      );
    }
    case "pause-command": {
      if (
        !action.commandId.trim() ||
        state.commands.some((command) => command.id === action.commandId)
      )
        return reject("命令标识为空或重复。");
      if (state.commands.some((command) => command.status !== "acknowledged"))
        return reject("已有待确认暂停指令，重复发送已拒绝。");
      issuePause(state, action.commandId);
      return accept(
        state.device.link === "online"
          ? "操作员暂停指令已发送，设备尚未确认暂停。"
          : "操作员暂停指令已排队，链路失联，设备尚未确认暂停。",
      );
    }
    case "device-ack": {
      const command = state.commands.find(
        (item) => item.id === action.commandId,
      );
      if (!command) return reject("回执引用的命令不存在。");
      if (command.status === "acknowledged")
        return reject("命令回执已经接收，重复回执不生效。");
      if (state.device.link !== "online" || command.status !== "sent")
        return reject("本实验需链路在线且指令已发送才接收模拟回执。");
      command.status = "acknowledged";
      command.acknowledgedAt = state.logicalTime;
      state.device.execution = "paused";
      state.device.lastConfirmedAt = state.logicalTime;
      return accept("已收到模拟设备暂停回执，当前才显示设备已暂停。");
    }
    case "finish-task": {
      if (state.requests.some((request) => request.status === "pending"))
        return reject("存在未处理请求，不能作为已处理任务结束。");
      if (
        state.steps.some(
          (item) => item.status === "pending" || item.status === "running",
        )
      )
        return reject("仍有待执行或执行中步骤；可通过明确结束请求终止。");
      endTask(state);
      return accept(
        state.outcome === "complete"
          ? "原始道路集合已全部观测，本次模拟执行结束。"
          : "本次模拟执行结束，原始道路集合仍有未查明路段，保留部分完成状态。",
      );
    }
  }
}

function endTask(state: LabState): void {
  state.phase = "ended";
  state.outcome =
    state.roads.every((road) => road.status === "observed") &&
    state.steps.every((step) => step.status === "completed")
      ? "complete"
      : "partial";
  for (const step of state.steps)
    if (step.status === "pending" || step.status === "running") {
      step.status = "cancelled";
      step.version += 1;
    }
  for (const request of state.requests)
    if (request.status === "pending") {
      request.status = "obsolete";
      request.resolution = "本次任务已结束。";
      request.resolvedAt = state.logicalTime;
    }
}

/** Every event and operator action uses a stable unique actionId. Rejections are auditable. */
export function dispatchLabAction(
  previous: LabState,
  action: LabAction,
): LabState {
  const state = cloneJson(previous);
  state.logicalTime += 1;
  let result: ReturnType<typeof applyAction>;
  if (!action.actionId.trim())
    result = { accepted: false, detail: "动作标识不能为空。" };
  else if (state.processedActionIds.includes(action.actionId))
    result = {
      accepted: false,
      detail: "重复动作已拒绝，不再次生效。",
      ...("requestId" in action ? { requestId: action.requestId } : {}),
    };
  else {
    state.processedActionIds.push(action.actionId);
    result = applyAction(state, action);
  }
  updatePhase(state);
  state.logs.push({
    runId: state.runId,
    sequence: state.logs.length + 1,
    logicalTime: state.logicalTime,
    source: sourceOf(action),
    inputProvenance:
      action.provenance ??
      (sourceOf(action) === "operator" ? "interactive" : "fixture-event"),
    actionId: action.actionId,
    actionType: action.type,
    planVersion: state.planVersion,
    ...result,
  });
  return state;
}

/** A single fact/action model drives both fixed and dynamically organized views. */
export function getPresentation(state: LabState): LabPresentation {
  const {
    runId,
    goal,
    phase,
    outcome,
    planVersion,
    roads,
    steps,
    requests,
    constraints,
    device,
    commands,
    logs,
  } = cloneJson(state);
  const pendingRequests = requests.filter(
    (request) => request.status === "pending",
  );
  return {
    runId,
    goal,
    phase,
    outcome,
    planVersion,
    roads,
    steps,
    requests,
    pendingRequests,
    focusRoadIds: [
      ...new Set(pendingRequests.flatMap((request) => request.roadIds)),
    ],
    constraints,
    device,
    commands,
    logs,
    uncheckedRoadIds: roads
      .filter((road) => road.status === "unchecked")
      .map((road) => road.id),
    rules: LAB_RULES,
  };
}
