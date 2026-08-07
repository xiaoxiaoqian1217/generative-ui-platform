// PROTOTYPE(issue-179)：逐 Turn 六节点 Execution Map 与 Node Detail 的探索性数据模型。
// 数据为合成 TurnDetailsResponse 形态，覆盖六类诊断场景，不代表最终契约。

export type ProtoNodeId =
  | "workbench"
  | "runtime-host"
  | "agent-adapter"
  | "business-agent"
  | "presentation"
  | "compiler";

export type ProtoStatus =
  | "ok"
  | "running"
  | "degraded"
  | "failed"
  | "skipped"
  | "unavailable";

export type ArtifactState =
  | "inline"
  | "stored-ref"
  | "skipped-by-protection-limit"
  | "not-disclosable";

export interface ProtoSubstage {
  id: string;
  label: string;
  status: ProtoStatus;
  durationMs?: number | undefined;
  detail?: string;
  errorCode?: string;
  fieldPath?: string;
}

export interface ProtoExchangeSide {
  summary: string;
  payload?: unknown;
  artifact?: {
    label: string;
    state: ArtifactState;
    sizeLabel?: string;
  };
}

export interface ProtoExchange {
  id: string;
  label: string;
  status: ProtoStatus;
  request?: ProtoExchangeSide;
  response?: ProtoExchangeSide;
  note?: string;
}

export interface ProtoNode {
  id: ProtoNodeId;
  label: string;
  status: ProtoStatus;
  durationMs?: number | undefined;
  summary: string;
  substages: ProtoSubstage[];
  exchanges: ProtoExchange[];
}

export interface ProtoOperation {
  id: string;
  kind: "run" | "action-resume";
  label: string;
  status: ProtoStatus;
  nodes: ProtoNode[];
}

export interface ProtoTimelineEvent {
  sequence: number;
  node: ProtoNodeId;
  kind: string;
  label: string;
  status?: ProtoStatus;
  atOffsetMs: number;
  ref?: { node: ProtoNodeId; exchange: string };
}

export interface ProtoTurn {
  turnId: string;
  title: string;
  status: ProtoStatus;
  startedAt: string;
  durationMs: number;
  operations: ProtoOperation[];
  timeline: ProtoTimelineEvent[];
  gap?: { afterSequence: number; missingCount: number };
  persistence: { eventsSaved: number; eventsTotal: number; note?: string };
}

export interface ProtoScenario {
  id: string;
  label: string;
  description: string;
  turn: ProtoTurn;
}

export const NODE_ORDER: readonly ProtoNodeId[] = [
  "workbench",
  "runtime-host",
  "agent-adapter",
  "business-agent",
  "presentation",
  "compiler",
];

export const NODE_LABELS: Record<ProtoNodeId, string> = {
  workbench: "Workbench",
  "runtime-host": "Runtime Host",
  "agent-adapter": "Agent Adapter",
  "business-agent": "Business Agent",
  presentation: "Presentation",
  compiler: "UI Compiler",
};

export const STATUS_LABELS: Record<ProtoStatus, string> = {
  ok: "正常",
  running: "进行中",
  degraded: "已降级",
  failed: "失败",
  skipped: "已跳过",
  unavailable: "不可见",
};

export const ARTIFACT_STATE_LABELS: Record<ArtifactState, string> = {
  inline: "内联可查",
  "stored-ref": "对象存储引用",
  "skipped-by-protection-limit": "超出保护上限未保存",
  "not-disclosable": "披露边界不可见",
};

function cloneNodes(nodes: ProtoNode[]): ProtoNode[] {
  return nodes.map((node) => ({
    ...node,
    substages: node.substages.map((stage) => ({ ...stage })),
    exchanges: node.exchanges.map((exchange) => ({ ...exchange })),
  }));
}

function baseNodes(): ProtoNode[] {
  return [
    {
      id: "workbench",
      label: NODE_LABELS.workbench,
      status: "ok",
      durationMs: 640,
      summary:
        "发送用户消息；渲染最终 PresentationResult；回传 Renderer 诊断。",
      substages: [
        {
          id: "compose",
          label: "组装 RuntimeRunRequest",
          status: "ok",
          durationMs: 4,
        },
        {
          id: "render",
          label: "渲染 A2UI Surface",
          status: "ok",
          durationMs: 610,
        },
        {
          id: "report",
          label: "Renderer 诊断追加回传",
          status: "ok",
          durationMs: 26,
        },
      ],
      exchanges: [
        {
          id: "run-request",
          label: "RuntimeRunRequest / RuntimeRunResult",
          status: "ok",
          request: {
            summary:
              "message: “显示 3 号园区摄像头状态”；presentation.context: zh-CN / 1440×1000",
            payload: {
              protocolVersion: "1.0",
              requestId: "request-4d21",
              runId: "run-71c",
              threadId: "thread-9f2",
              message: { role: "user", content: "显示 3 号园区摄像头状态" },
              presentation: {
                context: {
                  locale: "zh-CN",
                  theme: "workbench",
                  viewport: { width: 1440, height: 1000 },
                },
              },
            },
            artifact: {
              label: "RuntimeRunRequest",
              state: "inline",
              sizeLabel: "2.1 KB",
            },
          },
          response: {
            summary:
              "status: completed；presentation.mode: generative-ui；2 个 Surface",
            payload: {
              status: "completed",
              threadId: "thread-9f2",
              runId: "run-71c",
              presentation: {
                mode: "generative-ui",
                surfaceIds: ["surface-a01-main", "surface-a01-alert"],
                operations: 3,
              },
              diagnostics: { stages: 6, totalDurationMs: 4970 },
            },
            artifact: {
              label: "RuntimeRunResult",
              state: "inline",
              sizeLabel: "18.4 KB",
            },
          },
        },
      ],
    },
    {
      id: "runtime-host",
      label: NODE_LABELS["runtime-host"],
      status: "ok",
      durationMs: 2980,
      summary:
        "PlatformRunService 编排 Run；事件同时投影 AG-UI 流与 Diagnostic Recorder。",
      substages: [
        { id: "accept", label: "AG-UI 入口接收", status: "ok", durationMs: 6 },
        {
          id: "orchestrate",
          label: "PlatformRunService 编排",
          status: "ok",
          durationMs: 2940,
        },
        {
          id: "record",
          label: "Diagnostic Recorder 幂等写入",
          status: "ok",
          durationMs: 34,
        },
      ],
      exchanges: [
        {
          id: "event-projection",
          label: "PlatformRuntimeEvent 双投影",
          status: "ok",
          note: "实时流不等待诊断持久化；事件按 eventId 幂等去重。",
          request: { summary: "14 个规范化事件，sequence 1–14" },
          response: { summary: "AG-UI 投影即时发出；Recorder 异步保存 14/14" },
        },
      ],
    },
    {
      id: "agent-adapter",
      label: NODE_LABELS["agent-adapter"],
      status: "ok",
      durationMs: 2910,
      summary: "校验公开事件契约并补齐关联标识；不改写业务内容。",
      substages: [
        {
          id: "validate",
          label: "公开事件契约校验",
          status: "ok",
          durationMs: 12,
        },
        {
          id: "correlate",
          label: "补齐 threadId / runId / sequence",
          status: "ok",
          durationMs: 3,
        },
        {
          id: "map",
          label: "私有协议事件映射",
          status: "ok",
          durationMs: 2895,
        },
      ],
      exchanges: [
        {
          id: "agent-invoke",
          label: "BusinessAgentRun 请求 / AgentContent",
          status: "ok",
          request: {
            summary: "message + threadId=thread-9f2；不含任何 UI 规划指令",
            payload: {
              threadId: "thread-9f2",
              runId: "run-71c",
              input: { role: "user", content: "显示 3 号园区摄像头状态" },
            },
            artifact: {
              label: "BusinessAgentRunRequest",
              state: "inline",
              sizeLabel: "1.8 KB",
            },
          },
          response: {
            summary: "AgentContent: structured device-status payload",
            payload: {
              kind: "structured",
              schema: "device-status/v1",
              data: {
                campus: "park-3",
                devices: [
                  { id: "cam-03", status: "warning" },
                  { id: "cam-07", status: "offline" },
                  { id: "cam-11", status: "offline" },
                ],
              },
            },
            artifact: {
              label: "AgentContent",
              state: "inline",
              sizeLabel: "3.3 KB",
            },
          },
        },
      ],
    },
    {
      id: "business-agent",
      label: NODE_LABELS["business-agent"],
      status: "ok",
      durationMs: 2780,
      summary: "完成 1 次公开工具调用；发布进度与最终 AgentContent。",
      substages: [
        { id: "reason", label: "业务推理", status: "ok", durationMs: 1120 },
        { id: "tool", label: "公开工具调用", status: "ok", durationMs: 1480 },
        {
          id: "finalize",
          label: "生成 AgentContent",
          status: "ok",
          durationMs: 180,
        },
      ],
      exchanges: [
        {
          id: "tool-call",
          label: "Tool Call：query_device_status",
          status: "ok",
          request: {
            summary: "{ campus: “park-3”, deviceTypes: [“camera”] }",
            payload: {
              campus: "park-3",
              deviceTypes: ["camera"],
              includeOffline: true,
            },
            artifact: {
              label: "Tool Call 参数",
              state: "inline",
              sizeLabel: "0.4 KB",
            },
          },
          response: {
            summary: "12 台设备，2 台离线，1 台告警",
            payload: {
              total: 12,
              online: 10,
              offline: ["cam-07", "cam-11"],
              alerts: [
                { deviceId: "cam-03", level: "warning", reason: "信号抖动" },
              ],
            },
            artifact: {
              label: "Tool Result",
              state: "inline",
              sizeLabel: "2.6 KB",
            },
          },
        },
      ],
    },
    {
      id: "presentation",
      label: NODE_LABELS.presentation,
      status: "ok",
      durationMs: 1420,
      summary: "路由判定 generative-ui；Model Adapter 产出 UI Plan Candidate。",
      substages: [
        {
          id: "route",
          label: "Presentation Router 判定",
          status: "ok",
          durationMs: 8,
          detail: "structured → generative-ui",
        },
        {
          id: "model",
          label: "Model Adapter 规划",
          status: "ok",
          durationMs: 1390,
        },
        { id: "candidate", label: "候选校验", status: "ok", durationMs: 22 },
      ],
      exchanges: [
        {
          id: "presentation-exchange",
          label: "Presentation Request / Decision + UI Plan Candidate",
          status: "ok",
          request: {
            summary: "mode: auto；catalog: security-base@1.4.0；locale: zh-CN",
            payload: {
              mode: "auto",
              catalog: { catalogId: "security-base", version: "1.4.0" },
              locale: "zh-CN",
              contentRef: "artifact://agent-content/turn-a01",
            },
            artifact: {
              label: "Presentation Request",
              state: "inline",
              sizeLabel: "1.2 KB",
            },
          },
          response: {
            summary:
              "decision: generative-ui；Plan 选择 Alert + Table（均为 Catalog 受控组件）",
            payload: {
              decision: "generative-ui",
              plan: {
                componentPreferences: [
                  { componentType: "Alert", reason: "存在 warning 级别告警" },
                  { componentType: "Table", reason: "12 条设备记录对比展示" },
                ],
                actions: [
                  {
                    actionType: "shutdown_devices",
                    requiresConfirmation: true,
                  },
                ],
              },
            },
            artifact: {
              label: "Presentation Decision / UI Plan Candidate",
              state: "inline",
              sizeLabel: "6.8 KB",
            },
          },
        },
      ],
    },
    {
      id: "compiler",
      label: NODE_LABELS.compiler,
      status: "ok",
      durationMs: 96,
      summary: "校验通过，构建 UI IR 并编译 A2UI 0.9.1。",
      substages: [
        {
          id: "validate-plan",
          label: "UI Plan Candidate 校验",
          status: "ok",
          durationMs: 18,
        },
        {
          id: "build-ir",
          label: "构建可信 UI IR",
          status: "ok",
          durationMs: 30,
        },
        {
          id: "compile-a2ui",
          label: "编译 A2UI + Schema 校验",
          status: "ok",
          durationMs: 48,
        },
      ],
      exchanges: [
        {
          id: "compile-exchange",
          label: "UICompileRequest / UICompileResult",
          status: "ok",
          request: {
            summary: "plan + catalog + data（12 台设备）",
            payload: {
              catalogVersion: "1.4.0",
              componentCount: 2,
              dataItems: 12,
              limits: { maxDataItems: 500, compileTimeoutMs: 4000 },
            },
            artifact: {
              label: "UICompileRequest",
              state: "inline",
              sizeLabel: "9.7 KB",
            },
          },
          response: {
            summary:
              "UI IR 9 节点；A2UI v0.9 三操作序列（createSurface / updateComponents / updateDataModel）",
            payload: {
              ir: { nodes: 9, bindings: 14 },
              a2uiOperations: [
                {
                  version: "v0.9",
                  createSurface: { surfaceId: "surface-a01-main" },
                },
                {
                  version: "v0.9",
                  updateComponents: {
                    surfaceId: "surface-a01-main",
                    components: [
                      { componentId: "root", componentType: "Card" },
                      { componentId: "alert-1", componentType: "Alert" },
                      { componentId: "table-1", componentType: "Table" },
                    ],
                  },
                },
                {
                  version: "v0.9",
                  updateDataModel: {
                    surfaceId: "surface-a01-main",
                    pointers: { "/table-1/rows": 12 },
                  },
                },
              ],
              diagnostics: [],
            },
            artifact: {
              label: "UI IR / A2UI",
              state: "inline",
              sizeLabel: "14.2 KB",
            },
          },
        },
      ],
    },
  ];
}

function baseTimeline(): ProtoTimelineEvent[] {
  return [
    {
      sequence: 1,
      node: "workbench",
      kind: "message",
      label: "用户消息提交",
      atOffsetMs: 0,
      ref: { node: "workbench", exchange: "run-request" },
    },
    {
      sequence: 2,
      node: "runtime-host",
      kind: "run",
      label: "Run 开始（run-71c）",
      atOffsetMs: 12,
      ref: { node: "runtime-host", exchange: "event-projection" },
    },
    {
      sequence: 3,
      node: "agent-adapter",
      kind: "diagnostic",
      label: "事件契约校验通过",
      atOffsetMs: 20,
    },
    {
      sequence: 4,
      node: "business-agent",
      kind: "activity",
      label: "推理中：解析园区设备意图",
      atOffsetMs: 260,
    },
    {
      sequence: 5,
      node: "business-agent",
      kind: "tool-call",
      label: "Tool Call：query_device_status",
      atOffsetMs: 1180,
      ref: { node: "business-agent", exchange: "tool-call" },
    },
    {
      sequence: 6,
      node: "business-agent",
      kind: "tool-result",
      label: "Tool Result：12 台设备",
      atOffsetMs: 2660,
      ref: { node: "business-agent", exchange: "tool-call" },
    },
    {
      sequence: 7,
      node: "business-agent",
      kind: "message",
      label: "最终 AgentContent（structured）",
      atOffsetMs: 2790,
      ref: { node: "agent-adapter", exchange: "agent-invoke" },
    },
    {
      sequence: 8,
      node: "presentation",
      kind: "diagnostic",
      label: "Router 判定 generative-ui",
      atOffsetMs: 2810,
      ref: { node: "presentation", exchange: "presentation-exchange" },
    },
    {
      sequence: 9,
      node: "presentation",
      kind: "diagnostic",
      label: "Model Adapter 产出 UI Plan Candidate",
      atOffsetMs: 4200,
      ref: { node: "presentation", exchange: "presentation-exchange" },
    },
    {
      sequence: 10,
      node: "compiler",
      kind: "diagnostic",
      label: "UI IR 构建完成",
      atOffsetMs: 4260,
      ref: { node: "compiler", exchange: "compile-exchange" },
    },
    {
      sequence: 11,
      node: "compiler",
      kind: "diagnostic",
      label: "A2UI 编译与 Schema 校验通过",
      atOffsetMs: 4310,
      ref: { node: "compiler", exchange: "compile-exchange" },
    },
    {
      sequence: 12,
      node: "runtime-host",
      kind: "run",
      label: "Run 完成，PresentationResult 就绪",
      atOffsetMs: 4330,
      ref: { node: "workbench", exchange: "run-request" },
    },
    {
      sequence: 13,
      node: "workbench",
      kind: "renderer",
      label: "A2UI Surface 渲染成功",
      atOffsetMs: 4940,
      ref: { node: "workbench", exchange: "run-request" },
    },
    {
      sequence: 14,
      node: "workbench",
      kind: "diagnostic",
      label: "Renderer 诊断追加回传",
      atOffsetMs: 4970,
    },
  ];
}

function cloneTimeline(events: ProtoTimelineEvent[]): ProtoTimelineEvent[] {
  return events.map((event) => ({ ...event }));
}

function findNode(nodes: ProtoNode[], id: ProtoNodeId): ProtoNode {
  const node = nodes.find((item) => item.id === id);
  if (node === undefined) throw new Error(`missing node ${id}`);
  return node;
}

function generativeOk(): ProtoScenario {
  return {
    id: "gen-ok",
    label: "正常生成式",
    description: "全链路六节点正常：工具调用、生成式路由、编译、渲染均成功。",
    turn: {
      turnId: "turn-a01",
      title: "显示 3 号园区摄像头状态",
      status: "ok",
      startedAt: "2026-08-06 10:21:34.012",
      durationMs: 4970,
      operations: [
        {
          id: "op-run",
          kind: "run",
          label: "Run · 用户消息",
          status: "ok",
          nodes: baseNodes(),
        },
      ],
      timeline: baseTimeline(),
      persistence: { eventsSaved: 14, eventsTotal: 14 },
    },
  };
}

function markdownDirect(): ProtoScenario {
  const nodes = baseNodes();
  const presentation = findNode(nodes, "presentation");
  presentation.summary = "Router 判定 markdown；模型规划与编译不进入本 Turn。";
  presentation.durationMs = 12;
  presentation.substages = [
    {
      id: "route",
      label: "Presentation Router 判定",
      status: "ok",
      durationMs: 8,
      detail: "markdown AgentContent → 直通",
    },
    { id: "model", label: "Model Adapter 规划", status: "skipped" },
    { id: "candidate", label: "候选校验", status: "skipped" },
  ];
  presentation.exchanges = [
    {
      id: "presentation-exchange",
      label: "Presentation Request / Decision",
      status: "ok",
      request: {
        summary: "mode: auto；content: Markdown 周报",
        artifact: {
          label: "Presentation Request",
          state: "inline",
          sizeLabel: "1.0 KB",
        },
      },
      response: {
        summary: "decision: markdown（直通，不改写业务内容）",
        artifact: {
          label: "Presentation Decision",
          state: "inline",
          sizeLabel: "0.6 KB",
        },
      },
    },
  ];
  const compiler = findNode(nodes, "compiler");
  compiler.status = "skipped";
  compiler.durationMs = undefined;
  compiler.summary = "Markdown 分支不调用 UI Compiler Core。";
  compiler.substages = [
    { id: "validate-plan", label: "UI Plan Candidate 校验", status: "skipped" },
    { id: "build-ir", label: "构建可信 UI IR", status: "skipped" },
    { id: "compile-a2ui", label: "编译 A2UI + Schema 校验", status: "skipped" },
  ];
  compiler.exchanges = [];
  const workbench = findNode(nodes, "workbench");
  workbench.summary = "渲染 Markdown PresentationResult；无 A2UI Surface。";
  const timeline = baseTimeline()
    .filter((event) => ![9, 10, 11].includes(event.sequence))
    .map((event) => {
      if (event.sequence === 8)
        return { ...event, label: "Router 判定 markdown（直通）" };
      if (event.sequence === 12)
        return {
          ...event,
          atOffsetMs: 2830,
          label: "Run 完成，Markdown PresentationResult 就绪",
        };
      if (event.sequence === 13)
        return { ...event, label: "Markdown 渲染成功", atOffsetMs: 2980 };
      if (event.sequence === 14) return { ...event, atOffsetMs: 3010 };
      return event;
    });
  return {
    id: "markdown-direct",
    label: "Markdown 直通（跳过）",
    description: "Markdown 分支：Compiler 整节点跳过，模型规划子阶段跳过。",
    turn: {
      turnId: "turn-b02",
      title: "生成本周设备巡检周报",
      status: "ok",
      startedAt: "2026-08-06 10:26:02.441",
      durationMs: 3010,
      operations: [
        {
          id: "op-run",
          kind: "run",
          label: "Run · 用户消息",
          status: "ok",
          nodes,
        },
      ],
      timeline,
      persistence: { eventsSaved: 11, eventsTotal: 11 },
    },
  };
}

function compileFallback(): ProtoScenario {
  const nodes = baseNodes();
  const compiler = findNode(nodes, "compiler");
  compiler.status = "failed";
  compiler.summary = "UI Plan Candidate 校验失败：组件属性缺失绑定。";
  compiler.substages = [
    {
      id: "validate-plan",
      label: "UI Plan Candidate 校验",
      status: "failed",
      durationMs: 16,
      errorCode: "UI_PLAN_VALIDATION_FAILED",
      fieldPath: "components[2].props.deviceId",
      detail: "Table 缺少必需 props.deviceId 绑定",
    },
    { id: "build-ir", label: "构建可信 UI IR", status: "skipped" },
    { id: "compile-a2ui", label: "编译 A2UI + Schema 校验", status: "skipped" },
  ];
  compiler.exchanges = [
    {
      id: "compile-exchange",
      label: "UICompileRequest / Validation Result",
      status: "failed",
      request: {
        summary: "plan + catalog + data",
        artifact: {
          label: "UICompileRequest",
          state: "inline",
          sizeLabel: "9.4 KB",
        },
      },
      response: {
        summary:
          "Validation Result：1 个错误，字段路径 components[2].props.deviceId",
        payload: {
          valid: false,
          errors: [
            {
              code: "UI_PLAN_VALIDATION_FAILED",
              stage: "schema-validation",
              path: "components[2].props.deviceId",
              message: "Table 缺少必需 props.deviceId 绑定",
              retryable: false,
            },
          ],
        },
        artifact: {
          label: "Validation Result",
          state: "inline",
          sizeLabel: "1.1 KB",
        },
      },
    },
  ];
  const presentation = findNode(nodes, "presentation");
  presentation.status = "degraded";
  presentation.summary =
    "生成式阶段失败，按契约降级为安全 Markdown；业务结果保留。";
  presentation.substages = [
    ...presentation.substages,
    {
      id: "fallback",
      label: "Fallback 生成",
      status: "degraded",
      durationMs: 6,
      detail: "降级原因：UI_PLAN_VALIDATION_FAILED；输出 fallbackMarkdown",
    },
  ];
  presentation.exchanges = [
    ...presentation.exchanges,
    {
      id: "fallback-exchange",
      label: "PresentationResult（degraded）",
      status: "degraded",
      response: {
        summary:
          "mode: markdown；携带 degradationReasonCode=UI_PLAN_VALIDATION_FAILED",
        artifact: {
          label: "PresentationResult",
          state: "inline",
          sizeLabel: "4.2 KB",
        },
      },
    },
  ];
  const workbench = findNode(nodes, "workbench");
  workbench.status = "degraded";
  workbench.summary = "渲染降级后的安全 Markdown；保留错误阶段与字段路径入口。";
  const timeline = cloneTimeline(baseTimeline()).map((event) => {
    if (event.sequence === 10)
      return {
        ...event,
        status: "failed" as const,
        label: "UI Plan 校验失败：components[2].props.deviceId",
        atOffsetMs: 4230,
      };
    if (event.sequence === 11)
      return {
        ...event,
        node: "presentation" as const,
        status: "degraded" as const,
        label: "Fallback：生成安全 Markdown",
        atOffsetMs: 4240,
        ref: { node: "presentation" as const, exchange: "fallback-exchange" },
      };
    if (event.sequence === 13)
      return { ...event, label: "降级 Markdown 渲染成功" };
    return event;
  });
  return {
    id: "compile-fallback",
    label: "编译失败降级（Fallback）",
    description:
      "UI Plan 校验失败：Compiler 失败、Presentation 降级、Workbench 渲染安全 Markdown。",
    turn: {
      turnId: "turn-c03",
      title: "把告警设备排成看板",
      status: "degraded",
      startedAt: "2026-08-06 10:31:47.903",
      durationMs: 4880,
      operations: [
        {
          id: "op-run",
          kind: "run",
          label: "Run · 用户消息",
          status: "degraded",
          nodes,
        },
      ],
      timeline,
      persistence: { eventsSaved: 14, eventsTotal: 14 },
    },
  };
}

function actionResume(): ProtoScenario {
  const runNodes = baseNodes();
  findNode(runNodes, "workbench").summary =
    "渲染含确认型 Action 的 Surface（停运 2 台离线设备）。";
  const resumeNodes = cloneNodes(baseNodes());
  const resumeWorkbench = findNode(resumeNodes, "workbench");
  resumeWorkbench.summary =
    "用户在 Surface 上确认 Action；回传 RuntimeActionReceipt 后继续接收事件。";
  resumeWorkbench.substages = [
    {
      id: "confirm",
      label: "确认型 Action 提交（approved: true）",
      status: "ok",
      durationMs: 8,
    },
    {
      id: "receipt",
      label: "接收 RuntimeActionReceipt",
      status: "ok",
      durationMs: 30,
    },
    {
      id: "render",
      label: "渲染追加的 Assistant Presentation",
      status: "ok",
      durationMs: 420,
    },
  ];
  resumeWorkbench.exchanges = [
    {
      id: "action-exchange",
      label: "RuntimeActionRequest / RuntimeActionResult",
      status: "ok",
      request: {
        summary:
          "action: shutdown_devices；surfaceId 绑定来源 Turn 身份；approved: true",
        payload: {
          protocolVersion: "1.0",
          threadId: "thread-9f2",
          runId: "run-71c",
          action: {
            name: "shutdown_devices",
            surfaceId: "surface-a01-main",
            sourceTurnId: "turn-d04",
            approved: true,
            arguments: { deviceIds: ["cam-07", "cam-11"] },
          },
        },
        artifact: {
          label: "RuntimeActionRequest",
          state: "inline",
          sizeLabel: "1.5 KB",
        },
      },
      response: {
        summary: "status: completed；追加 1 个 Assistant Presentation",
        payload: {
          status: "completed",
          receipt: { operationId: "op-act", acceptedAt: "+12430ms" },
          appendedPresentation: {
            presentationId: "pres-d04-2",
            mode: "generative-ui",
          },
        },
        artifact: {
          label: "RuntimeActionResult",
          state: "inline",
          sizeLabel: "7.9 KB",
        },
      },
    },
  ];
  const resumeAgent = findNode(resumeNodes, "business-agent");
  resumeAgent.summary =
    "Action Resume：从私有 Checkpoint 恢复工作流并执行停运工具。";
  resumeAgent.substages = [
    {
      id: "resume",
      label: "Interrupt 恢复（Action Resume）",
      status: "ok",
      durationMs: 210,
    },
    {
      id: "tool",
      label: "公开工具调用：shutdown_devices",
      status: "ok",
      durationMs: 1690,
    },
    {
      id: "finalize",
      label: "生成追加 AgentContent",
      status: "ok",
      durationMs: 140,
    },
  ];
  resumeAgent.exchanges = [
    {
      id: "tool-call",
      label: "Tool Call：shutdown_devices",
      status: "ok",
      request: {
        summary: "{ deviceIds: [“cam-07”, “cam-11”] }",
        payload: { deviceIds: ["cam-07", "cam-11"], reason: "offline-cleanup" },
        artifact: {
          label: "Tool Call 参数",
          state: "inline",
          sizeLabel: "0.3 KB",
        },
      },
      response: {
        summary: "2 台设备已停运",
        payload: {
          shutdown: [
            { deviceId: "cam-07", ok: true },
            { deviceId: "cam-11", ok: true },
          ],
        },
        artifact: {
          label: "Tool Result",
          state: "inline",
          sizeLabel: "0.5 KB",
        },
      },
    },
  ];
  const resumePresentation = findNode(resumeNodes, "presentation");
  resumePresentation.summary =
    "追加 AgentContent 重新走生成式路由，产出第二个不可变 Presentation。";
  const resumeCompiler = findNode(resumeNodes, "compiler");
  resumeCompiler.summary =
    "编译追加 Presentation 的 A2UI；来源 Turn 的旧 Surface 保持不变。";
  const timeline: ProtoTimelineEvent[] = [
    {
      sequence: 1,
      node: "workbench",
      kind: "message",
      label: "用户消息提交",
      atOffsetMs: 0,
      ref: { node: "workbench", exchange: "run-request" },
    },
    {
      sequence: 2,
      node: "runtime-host",
      kind: "run",
      label: "Run 开始（run-71c）",
      atOffsetMs: 12,
      ref: { node: "runtime-host", exchange: "event-projection" },
    },
    {
      sequence: 3,
      node: "business-agent",
      kind: "tool-call",
      label: "Tool Call：query_device_status",
      atOffsetMs: 1180,
      ref: { node: "business-agent", exchange: "tool-call" },
    },
    {
      sequence: 4,
      node: "business-agent",
      kind: "interrupt",
      label: "Interrupt：等待停运确认",
      atOffsetMs: 2820,
    },
    {
      sequence: 5,
      node: "compiler",
      kind: "diagnostic",
      label: "首个 A2UI Surface 编译完成",
      atOffsetMs: 4360,
      ref: { node: "compiler", exchange: "compile-exchange" },
    },
    {
      sequence: 6,
      node: "workbench",
      kind: "renderer",
      label: "Surface 渲染（含确认按钮）",
      atOffsetMs: 4980,
      ref: { node: "workbench", exchange: "run-request" },
    },
    {
      sequence: 7,
      node: "workbench",
      kind: "action",
      label: "用户确认 Action：shutdown_devices",
      atOffsetMs: 12400,
      ref: { node: "workbench", exchange: "action-exchange" },
    },
    {
      sequence: 8,
      node: "runtime-host",
      kind: "action",
      label: "Action Receipt 提交回执（op-act）",
      atOffsetMs: 12430,
      ref: { node: "workbench", exchange: "action-exchange" },
    },
    {
      sequence: 9,
      node: "agent-adapter",
      kind: "diagnostic",
      label: "Action 授权校验：来源身份匹配",
      atOffsetMs: 12450,
    },
    {
      sequence: 10,
      node: "business-agent",
      kind: "resume",
      label: "Action Resume：工作流恢复",
      atOffsetMs: 12660,
      ref: { node: "business-agent", exchange: "tool-call" },
    },
    {
      sequence: 11,
      node: "business-agent",
      kind: "tool-result",
      label: "Tool Result：2 台已停运",
      atOffsetMs: 14350,
      ref: { node: "business-agent", exchange: "tool-call" },
    },
    {
      sequence: 12,
      node: "presentation",
      kind: "diagnostic",
      label: "追加 AgentContent 进入生成式路由",
      atOffsetMs: 14500,
      ref: { node: "presentation", exchange: "presentation-exchange" },
    },
    {
      sequence: 13,
      node: "compiler",
      kind: "diagnostic",
      label: "第二个 A2UI Surface 编译完成",
      atOffsetMs: 14620,
      ref: { node: "compiler", exchange: "compile-exchange" },
    },
    {
      sequence: 14,
      node: "workbench",
      kind: "renderer",
      label: "追加 Assistant Presentation 渲染",
      atOffsetMs: 15080,
      ref: { node: "workbench", exchange: "action-exchange" },
    },
  ];
  return {
    id: "action-resume",
    label: "Action Resume",
    description:
      "确认型 Action 在来源 Turn 内创建新 Operation/Run，并追加不可变 Assistant Presentation。",
    turn: {
      turnId: "turn-d04",
      title: "停运 3 号园区离线摄像头",
      status: "ok",
      startedAt: "2026-08-06 10:38:11.276",
      durationMs: 15080,
      operations: [
        {
          id: "op-run",
          kind: "run",
          label: "Run · 用户消息",
          status: "ok",
          nodes: runNodes,
        },
        {
          id: "op-act",
          kind: "action-resume",
          label: "Operation · Action Resume（shutdown_devices）",
          status: "ok",
          nodes: resumeNodes,
        },
      ],
      timeline,
      persistence: { eventsSaved: 14, eventsTotal: 14 },
    },
  };
}

function sequenceGap(): ProtoScenario {
  const nodes = baseNodes();
  findNode(nodes, "runtime-host").summary =
    "实时连接中断后按 lastSequence 补齐；发现缺口并显式标记。";
  const timeline = baseTimeline().filter(
    (event) => ![5, 6, 7].includes(event.sequence),
  );
  return {
    id: "sequence-gap",
    label: "事件缺口",
    description:
      "断线重连后 sequence 5–7 缺失：时间线出现缺口标记，诊断完整性存疑。",
    turn: {
      turnId: "turn-e05",
      title: "显示 3 号园区摄像头状态",
      status: "ok",
      startedAt: "2026-08-06 10:44:59.557",
      durationMs: 5120,
      operations: [
        {
          id: "op-run",
          kind: "run",
          label: "Run · 用户消息",
          status: "ok",
          nodes,
        },
      ],
      timeline,
      gap: { afterSequence: 4, missingCount: 3 },
      persistence: {
        eventsSaved: 11,
        eventsTotal: 14,
        note: "缺口区间事件未送达，Recorder 无事实可写。",
      },
    },
  };
}

function safetyBoundary(): ProtoScenario {
  const nodes = baseNodes();
  const adapter = findNode(nodes, "agent-adapter");
  adapter.summary = "仅映射公开事件；Agent 私有协议细节不进入平台诊断。";
  adapter.exchanges = [
    ...adapter.exchanges,
    {
      id: "private-boundary",
      label: "Agent 私有协议帧",
      status: "unavailable",
      note: "私有 State、Checkpoint、系统提示词与未公开内部工具调用永不进入诊断历史。",
      response: {
        summary: "（披露边界）不可见",
        artifact: { label: "Provider 原始响应", state: "not-disclosable" },
      },
    },
  ];
  const agent = findNode(nodes, "business-agent");
  agent.exchanges = [
    {
      id: "tool-call",
      label: "Tool Call：export_device_registry",
      status: "ok",
      request: {
        summary: "{ campus: “park-3” }",
        artifact: {
          label: "Tool Call 参数",
          state: "inline",
          sizeLabel: "0.2 KB",
        },
      },
      response: {
        summary:
          "设备注册表 38 MB，超出内联上限，经 Artifact Storage Router 落对象存储。",
        artifact: {
          label: "Tool Result",
          state: "stored-ref",
          sizeLabel: "38 MB",
        },
      },
      note: "storageRef + sha256 + size 已保存；查看时按需分页加载。",
    },
    {
      id: "big-activity",
      label: "Activity：批量遥测快照",
      status: "ok",
      response: {
        summary: "（保护上限）该活动负载 62 MB，超过保护阈值未保存。",
        artifact: {
          label: "Activity Payload",
          state: "skipped-by-protection-limit",
          sizeLabel: "62 MB",
        },
      },
      note: "skipped-by-protection-limit 只影响诊断完整性，不影响主业务。",
    },
  ];
  const workbench = findNode(nodes, "workbench");
  workbench.substages = [
    ...workbench.substages,
    {
      id: "report-2",
      label: "Renderer 诊断第二批追加（组件级 componentId / errorCode）",
      status: "ok",
      durationMs: 18,
      detail: "浏览器只能追加受控结果，不覆盖后端阶段诊断。",
    },
  ];
  const timeline = cloneTimeline(baseTimeline()).map((event) => {
    if (event.sequence === 5)
      return { ...event, label: "Tool Call：export_device_registry" };
    if (event.sequence === 6)
      return { ...event, label: "Tool Result：38 MB（storageRef）" };
    return event;
  });
  timeline.push({
    sequence: 15,
    node: "workbench",
    kind: "diagnostic",
    label: "Renderer 组件级诊断追加（第二批）",
    atOffsetMs: 5360,
    status: "ok",
  });
  return {
    id: "safety-boundary",
    label: "安全披露边界",
    description:
      "大 Artifact 走对象存储引用、超阈值跳过保存、私有协议内容不可见。",
    turn: {
      turnId: "turn-f06",
      title: "导出 3 号园区设备注册表",
      status: "ok",
      startedAt: "2026-08-06 10:52:08.190",
      durationMs: 5360,
      operations: [
        {
          id: "op-run",
          kind: "run",
          label: "Run · 用户消息",
          status: "ok",
          nodes,
        },
      ],
      timeline,
      persistence: {
        eventsSaved: 15,
        eventsTotal: 15,
        note: "1 个 Artifact 超出保护上限未保存；1 个 Artifact 以 storageRef 保存。",
      },
    },
  };
}

export const PROTOTYPE_SCENARIOS: readonly ProtoScenario[] = [
  generativeOk(),
  markdownDirect(),
  compileFallback(),
  actionResume(),
  sequenceGap(),
  safetyBoundary(),
];

export function resolvePrototypeScenario(
  id: string | undefined,
): ProtoScenario {
  return (
    PROTOTYPE_SCENARIOS.find((scenario) => scenario.id === id) ??
    PROTOTYPE_SCENARIOS[0]!
  );
}

export function findProtoExchange(
  turn: ProtoTurn,
  nodeId: ProtoNodeId,
  exchangeId: string,
): ProtoExchange | undefined {
  for (const operation of turn.operations) {
    const node = operation.nodes.find((item) => item.id === nodeId);
    const exchange = node?.exchanges.find((item) => item.id === exchangeId);
    if (exchange !== undefined) return exchange;
  }
  return undefined;
}
