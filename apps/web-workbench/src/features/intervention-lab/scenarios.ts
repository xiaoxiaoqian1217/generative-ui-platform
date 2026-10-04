import {
  type CollaborationMode,
  createInitialState,
  dispatchLabAction,
  type LabAction,
  type LabState,
} from "./model.js";

export interface ScenarioStep {
  label: string;
  action: LabAction;
  /** Only deterministic replay/tests apply these. Interactive UI waits for an actual click. */
  scriptedOperator?: boolean;
}
export interface LabScenario {
  id: string;
  title: string;
  description: string;
  steps: ScenarioStep[];
  collaboration?: CollaborationMode;
}

const start = (prefix: string): ScenarioStep => ({
  label: "操作员启动模拟任务",
  action: { type: "start-task", actionId: `${prefix}:start` },
});
const inspect = (prefix: string, road: "a" | "b" | "c"): ScenarioStep[] => [
  {
    label: `模拟开始道路 ${road.toUpperCase()} 查验`,
    action: {
      type: "start-step",
      actionId: `${prefix}:${road}:start`,
      stepId: `s-${road}`,
    },
  },
  {
    label: `注入道路 ${road.toUpperCase()} 观测`,
    action: {
      type: "observe-road",
      actionId: `${prefix}:${road}:observe`,
      roadId: `r-${road}`,
      condition: "passable",
      detail:
        "fixture观测：该模拟UGV所需通道已观察为可通过；不代表其他车型可通行。",
    },
  },
  {
    label: `模拟道路 ${road.toUpperCase()} 查验完成`,
    action: {
      type: "complete-step",
      actionId: `${prefix}:${road}:done`,
      stepId: `s-${road}`,
    },
  },
];
const finish = (prefix: string): ScenarioStep => ({
  label: "操作员核查并结束本次模拟任务",
  action: { type: "finish-task", actionId: `${prefix}:finish` },
});

/** Reads the actual scheduler/current step at dispatch time, never a fixed road sequence. */
const inspectNext = (prefix: string, index: number): ScenarioStep[] => [
  {
    label: "模拟调度开始当前优先的待执行步骤",
    action: { type: "start-next-step", actionId: `${prefix}:${index}:start` },
  },
  {
    label: "注入当前执行道路的模拟观测反馈",
    action: {
      type: "observe-current-road",
      actionId: `${prefix}:${index}:observe`,
      condition: "passable",
      detail:
        "协作fixture反馈：该模拟UGV所需通道在本步骤中被观察为可通过；不代表真实现场或其他车型。",
    },
  },
  {
    label: "注入当前查验步骤的模拟完成反馈",
    action: {
      type: "complete-current-step",
      actionId: `${prefix}:${index}:done`,
    },
  },
];

export const LAB_SCENARIOS: LabScenario[] = [
  {
    id: "normal-detour",
    title: "正常查验与自主绕行",
    description:
      "局部绕行不改变任务目标，不请求人工；三条道路取得模拟观测后完成。",
    steps: [
      start("normal"),
      inspect("normal", "a")[0]!,
      {
        label: "注入局部绕行成功（不请求人工）",
        action: {
          type: "local-detour",
          actionId: "normal:a:detour",
          stepId: "s-a",
        },
      },
      ...inspect("normal", "a").slice(1),
      ...inspect("normal", "b"),
      ...inspect("normal", "c"),
      finish("normal"),
    ],
  },
  {
    id: "navigation-failure",
    title: "导航最终失败与选择介入",
    description:
      "fixture声明恢复耗尽且没有可执行替代分支，按实验应用约定请求明确选择；继续其他路段后B仍未查明。",
    steps: [
      start("failure"),
      {
        label: "模拟开始中央道路查验",
        action: {
          type: "start-step",
          actionId: "failure:b:start",
          stepId: "s-b",
        },
      },
      {
        label: "注入导航最终失败（不等于道路阻断）",
        action: {
          type: "navigation-failed",
          actionId: "failure:b:failed",
          stepId: "s-b",
          reason:
            "模拟反馈：局部规划与恢复已耗尽，未能到达观测位置。原因不等同于已观察道路阻断。",
          recoveryExhausted: true,
          alternativeAvailable: false,
        },
      },
      {
        label: "脚本人工答复：保留B未查明并继续（交互模式由您选择）",
        scriptedOperator: true,
        action: {
          type: "respond",
          runId: "fixture-run",
          actionId: "failure:reply",
          requestId: "failure:failure:b:failed",
          requestVersion: 1,
          optionId: "defer",
        },
      },
      ...inspect("failure", "a"),
      ...inspect("failure", "c"),
      finish("failure"),
    ],
  },
  {
    id: "constraint-stale",
    title: "主动修改与过期答复",
    description:
      "先形成B的调整审批请求；操作员主动排除B后旧请求失效，旧答复被拒绝。A、C的结果仍保留。",
    steps: [
      start("stale"),
      ...inspect("stale", "a"),
      {
        label: "注入明确审批请求：本次暂不查验B",
        action: {
          type: "open-request",
          actionId: "stale:open",
          requestId: "request:stale-b",
          title: "是否批准本次暂不查验B",
          reason: "模拟调度提出暂缓B的计划变更，尚未执行。",
          basis:
            "fixture应用约定：这个明确提出的计划变更先由操作员批准或拒绝；不声称自动推断风险。",
          roadIds: ["r-b"],
          stepIds: ["s-b"],
          requiredInput: { kind: "approval" },
        },
      },
      {
        label: "脚本操作员主动修改：本次不查验B（可手动执行）",
        scriptedOperator: true,
        action: {
          type: "add-constraint",
          actionId: "stale:constraint",
          text: "本次不查验中央道路B，将未查明部分单独记录。",
          roadIds: ["r-b"],
        },
      },
      {
        label: "注入旧客户端答复，验证过期请求被拒绝",
        action: {
          type: "respond",
          runId: "fixture-run",
          actionId: "stale:late-reply",
          requestId: "request:stale-b",
          requestVersion: 1,
          optionId: "approve",
        },
      },
      ...inspect("stale", "c"),
      finish("stale"),
    ],
  },
  {
    id: "confirmation-reject",
    title: "确认介入与拒绝变更",
    description:
      "明确审批请求被拒绝后保留原任务，继续全部道路；拒绝不会生成虚假道路观测。",
    steps: [
      start("reject"),
      {
        label: "注入明确审批请求",
        action: {
          type: "open-request",
          actionId: "reject:open",
          requestId: "request:reject-b",
          title: "是否批准暂缓B查验",
          reason: "模拟应用提出暂缓B，尚未更改计划。",
          basis: "fixture应用处理约定：此提出的调整需要一个审批答复。",
          roadIds: ["r-b"],
          stepIds: ["s-b"],
          requiredInput: { kind: "approval" },
        },
      },
      {
        label: "脚本人工答复：拒绝（交互模式由您选择）",
        scriptedOperator: true,
        action: {
          type: "respond",
          runId: "fixture-run",
          actionId: "reject:reply",
          requestId: "request:reject-b",
          requestVersion: 1,
          optionId: "reject",
        },
      },
      ...inspect("reject", "a"),
      ...inspect("reject", "b"),
      ...inspect("reject", "c"),
      finish("reject"),
    ],
  },
  {
    id: "supplement-exclusion",
    title: "补充介入与范围调整",
    description:
      "此fixture明确请求C的排除要求，补充文本成为关联C的人工约束；未观察的C保持未查明。",
    steps: [
      start("supplement"),
      {
        label: "注入补充要求请求：明确本次排除C",
        action: {
          type: "open-request",
          actionId: "supplement:open",
          requestId: "request:supplement-c",
          title: "补充本次不查验C的要求",
          reason:
            "本fixture明确请求一条关联C的排除要求；提交前不改变任务。这是案例输入设定，不是系统推测用户曾经提出过该要求。",
          basis:
            "fixture明确所需输入是排除要求文本；提交后仅取消关联C的后续步骤。",
          roadIds: ["r-c"],
          stepIds: ["s-c"],
          requiredInput: {
            kind: "fields",
            fields: [
              {
                key: "exclusion",
                label: "本次不查验该道路的具体要求",
                required: true,
              },
            ],
          },
        },
      },
      {
        label: "脚本人工补充：本次仅查验A、B（交互模式由您填写）",
        scriptedOperator: true,
        action: {
          type: "respond",
          runId: "fixture-run",
          actionId: "supplement:reply",
          requestId: "request:supplement-c",
          requestVersion: 1,
          optionId: "submit",
          values: { exclusion: "本次不查验东侧道路C；A、B完成后列出C未查明。" },
        },
      },
      ...inspect("supplement", "a"),
      ...inspect("supplement", "b"),
      finish("supplement"),
    ],
  },
  {
    id: "link-command-ack",
    title: "失联、控制指令与设备回执",
    description:
      "失联后操作员请求暂停，指令只能标未确认；链路恢复且注入模拟设备回执后才显示已暂停。",
    steps: [
      start("link"),
      {
        label: "模拟开始西侧道路查验",
        action: { type: "start-step", actionId: "link:a:start", stepId: "s-a" },
      },
      {
        label: "注入链路失联",
        action: { type: "link-lost", actionId: "link:lost" },
      },
      {
        label: "注入显式任务控制请求",
        action: {
          type: "open-request",
          actionId: "link:open",
          requestId: "request:link-control",
          title: "链路失联：操作员任务控制",
          reason: "设备当前执行状态未知，最后位置只代表最后确认状态。",
          basis:
            "fixture应用约定：失联时展示显式暂停或结束控制，由人决定；设备失联自主策略不在本原型实现范围。",
          roadIds: ["r-a"],
          stepIds: ["s-a"],
          requiredInput: {
            kind: "command",
            commands: [
              {
                id: "pause",
                label: "请求暂停（等待设备回执）",
                effect: "pause",
              },
              { id: "end", label: "结束本次任务", effect: "end-task" },
            ],
          },
        },
      },
      {
        label: "脚本人工请求暂停（交互模式由您操作）",
        scriptedOperator: true,
        action: {
          type: "respond",
          runId: "fixture-run",
          actionId: "link:reply",
          requestId: "request:link-control",
          requestVersion: 1,
          optionId: "pause",
        },
      },
      {
        label: "注入链路恢复（仍未确认暂停）",
        action: { type: "link-restored", actionId: "link:restored" },
      },
      {
        label: "注入模拟设备暂停回执（不是真实设备回执）",
        action: {
          type: "device-ack",
          actionId: "link:ack",
          commandId: "pause:link:reply",
        },
      },
      {
        label: "注入结束核查请求",
        action: {
          type: "open-request",
          actionId: "link:end-open",
          requestId: "request:link-end",
          title: "结束本次模拟任务",
          reason: "模拟设备暂停已确认，本fixture随后请求结束。",
          basis: "fixture明确操作输入为结束命令。",
          roadIds: ["r-a"],
          stepIds: ["s-a"],
          requiredInput: {
            kind: "command",
            commands: [
              { id: "end", label: "结束并保留未查明事实", effect: "end-task" },
            ],
          },
        },
      },
      {
        label: "脚本人工答复：结束（交互模式由您操作）",
        scriptedOperator: true,
        action: {
          type: "respond",
          runId: "fixture-run",
          actionId: "link:end-reply",
          requestId: "request:link-end",
          requestVersion: 1,
          optionId: "end",
        },
      },
    ],
  },
  {
    id: "observation-cooperation",
    title: "协作：Agent请求人补充观测点",
    description:
      "A路步骤缺少观测点参数时，模拟Agent主动请求人选择预设位置。答复写入执行参数后仍需模拟观测反馈，才记录道路结果并继续任务。",
    collaboration: "observation-input",
    steps: [
      start("observation"),
      inspectNext("observation", 1)[0]!,
      {
        label: "模拟Agent发现缺少观测点，主动请求人补充",
        action: {
          type: "request-observation-point",
          actionId: "observation:request",
          stepId: "s-a",
          requestId: "request:observation-a",
        },
      },
      {
        label: "脚本人工选择北侧观测点（交互模式等待您选择）",
        scriptedOperator: true,
        action: {
          type: "respond",
          runId: "fixture-run",
          actionId: "observation:reply",
          requestId: "request:observation-a",
          requestVersion: 1,
          optionId: "point-a-north",
        },
      },
      ...inspectNext("observation", 1).slice(1),
      ...inspectNext("observation", 2),
      ...inspectNext("observation", 3),
      finish("observation"),
    ],
  },
  {
    id: "priority-cooperation",
    title: "协作：人主动调整后续查验优先级",
    description:
      "A路执行时，人可以把尚未开始的C路安排到B路之前。后续模拟调度读取新顺序，实际按A、C、B执行；不调整时仍按A、B、C执行。",
    collaboration: "priority-order",
    steps: [
      start("priority"),
      inspectNext("priority", 1)[0]!,
      {
        label: "脚本人工优先安排C（交互模式可主动修改或保留原顺序）",
        scriptedOperator: true,
        action: {
          type: "prioritize-step",
          actionId: "priority:promote-c",
          runId: "fixture-run",
          planVersion: 1,
          stepId: "s-c",
        },
      },
      ...inspectNext("priority", 1).slice(1),
      ...inspectNext("priority", 2),
      ...inspectNext("priority", 3),
      finish("priority"),
    ],
  },
];

/** Deterministic scripted replay. A script reply is NOT human-performance evidence. */
export function replayScenario(
  scenario: LabScenario,
  stepCount = scenario.steps.length,
): LabState {
  return scenario.steps.slice(0, Math.max(0, stepCount)).reduce(
    (state, step) =>
      dispatchLabAction(state, {
        ...step.action,
        provenance: "fixture-script",
      }),
    createInitialState("fixture-run", scenario.collaboration),
  );
}
export function runScenario(scenario: LabScenario): LabState {
  return replayScenario(scenario);
}
