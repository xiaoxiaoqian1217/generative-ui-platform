// PROTOTYPE(issue #179)——六节点 Execution Map 共享 mock,仅开发期 /prototype-inspect 使用。
// 数据形态对齐 issue #177 决策的 TurnDetailsResponse(服务端临时聚合的只读投影),字段为示意。
// 一个 Turn 覆盖:六节点边界、子阶段展开、请求/返回、Action Resume(新 Operation/Run)、
// UI 校验失败降级 Markdown、双投影并行、Markdown 直出整段跳过、安全排除(Provider 原始载荷/系统提示词)。

export type MockNodeStatus =
  | "completed"
  | "degraded"
  | "failed"
  | "skipped"
  | "running";

export type MockArtifactStatus =
  | "inline"
  | "stored"
  | "persistence-failed"
  | "excluded";

export interface MockArtifact {
  readonly id: string;
  readonly label: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly hash?: string;
  readonly status: MockArtifactStatus;
  readonly preview?: readonly (readonly [string, string])[];
  readonly note?: string;
}

export interface MockSubStage {
  readonly name: string;
  readonly status: MockNodeStatus | "not-started";
  readonly durationMs?: number;
  readonly parallelGroup?: string;
  readonly errorCode?: string;
  readonly fieldPath?: string;
  readonly note?: string;
}

export interface MockNode {
  readonly id: string;
  readonly label: string;
  readonly status: MockNodeStatus;
  readonly startMs: number;
  readonly durationMs: number;
  readonly summary: string;
  readonly subStages: readonly MockSubStage[];
  readonly inputs: readonly MockArtifact[];
  readonly outputs: readonly MockArtifact[];
  readonly degradationReason?: string;
}

export interface MockRun {
  readonly runId: string;
  readonly status: MockNodeStatus;
  readonly durationMs: number;
  readonly nodes: readonly MockNode[];
}

export interface MockOperation {
  readonly operationId: string;
  readonly kind: "user-message" | "action-resume";
  readonly label: string;
  readonly source?: string;
  readonly run: MockRun;
}

export interface MockTurn {
  readonly turnId: string;
  readonly conversationTitle: string;
  readonly status: MockNodeStatus;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly userMessage: string;
  readonly sync: {
    readonly persistedSequence: number;
    readonly observedSequence: number;
    readonly hasGap: boolean;
    readonly revision: number;
  };
  readonly operations: readonly MockOperation[];
}

export const NODE_ORDER = [
  "workbench",
  "runtime-host",
  "agent-adapter",
  "business-agent",
  "presentation-pipeline",
  "ui-compiler-core",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  completed: "已完成",
  degraded: "已降级",
  failed: "失败",
  skipped: "已跳过",
  running: "运行中",
  "not-started": "未开始",
};

export const ARTIFACT_STATUS_LABEL: Record<MockArtifactStatus, string> = {
  inline: "内联",
  stored: "已存储",
  "persistence-failed": "持久化失败",
  excluded: "安全排除",
};

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function formatBytes(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

const turn103Run301Nodes: readonly MockNode[] = [
  {
    id: "workbench",
    label: "Workbench",
    status: "completed",
    startMs: 0,
    durationMs: 45,
    summary:
      "收集用户输入并提交 RuntimeRunRequest;终局接收 Markdown PresentationResult 完成渲染",
    subStages: [
      { name: "input-validation", status: "completed", durationMs: 12 },
      { name: "content-serialization", status: "completed", durationMs: 33 },
      {
        name: "render-feedback",
        status: "completed",
        note: "markdown-render 完成 @6.3s;a2ui-renderer 因降级未启用",
      },
    ],
    inputs: [
      {
        id: "art-u1",
        label: "用户消息",
        contentType: "text/plain",
        sizeBytes: 64,
        status: "inline",
        preview: [["text", "把东门区域的摄像头调出来,并给夜班保安派单"]],
      },
    ],
    outputs: [
      {
        id: "art-r1",
        label: "RuntimeRunRequest",
        contentType: "application/json",
        sizeBytes: 412,
        hash: "sha256:9f2c4a71b3e0",
        status: "inline",
        preview: [
          ["threadId", "thread-9"],
          ["turnId", "turn-103"],
          ["runId", "run-301"],
          ["input", "把东门区域的摄像头调出来,并给夜班保安派单"],
        ],
      },
    ],
  },
  {
    id: "runtime-host",
    label: "Agent Runtime Host",
    status: "completed",
    startMs: 50,
    durationMs: 130,
    summary: "请求校验通过;编排 Run 并做 AG-UI / 诊断双投影(并行)",
    subStages: [
      { name: "request-validation", status: "completed", durationMs: 25 },
      {
        name: "ag-ui-projection",
        status: "completed",
        parallelGroup: "proj",
        note: "实时投影,贯穿整个 Run,不等待持久化",
      },
      {
        name: "diagnostic-persistence",
        status: "completed",
        parallelGroup: "proj",
        note: "诊断持久化,与实时投影并行;eventId 幂等写入",
      },
    ],
    inputs: [
      {
        id: "art-r1",
        label: "RuntimeRunRequest",
        contentType: "application/json",
        sizeBytes: 412,
        hash: "sha256:9f2c4a71b3e0",
        status: "inline",
        preview: [
          ["threadId", "thread-9"],
          ["turnId", "turn-103"],
          ["runId", "run-301"],
        ],
      },
    ],
    outputs: [
      {
        id: "art-b1",
        label: "BusinessAgentRunRequest",
        contentType: "application/json",
        sizeBytes: 388,
        hash: "sha256:51de8c02aa91",
        status: "inline",
        preview: [
          ["agentId", "security-ops-agent"],
          ["threadId", "thread-9"],
          ["runId", "run-301"],
        ],
      },
    ],
  },
  {
    id: "agent-adapter",
    label: "Business Agent Adapter",
    status: "completed",
    startMs: 185,
    durationMs: 60,
    summary:
      "契约校验通过;私有协议事件映射为平台事件,补充关联标识;不改写业务内容",
    subStages: [
      { name: "contract-validation", status: "completed", durationMs: 22 },
      {
        name: "protocol-mapping",
        status: "completed",
        durationMs: 38,
        note: "补充 threadId / runId / turnId / toolCallId",
      },
    ],
    inputs: [
      {
        id: "art-b1",
        label: "BusinessAgentRunRequest",
        contentType: "application/json",
        sizeBytes: 388,
        hash: "sha256:51de8c02aa91",
        status: "inline",
        preview: [["agentId", "security-ops-agent"]],
      },
    ],
    outputs: [
      {
        id: "art-b2",
        label: "平台公开事件订阅",
        contentType: "application/json",
        sizeBytes: 156,
        status: "inline",
        preview: [
          ["映射事件", "message / tool-call / interrupt"],
          ["拒绝非法事件", "0"],
        ],
      },
    ],
  },
  {
    id: "business-agent",
    label: "Business Agent",
    status: "completed",
    startMs: 250,
    durationMs: 3100,
    summary: "两次工具调用完成;发布派单确认 Interrupt;输出结构化 AgentContent",
    subStages: [
      { name: "tool-call list_cameras", status: "completed", durationMs: 1400 },
      {
        name: "tool-call create_dispatch",
        status: "completed",
        durationMs: 900,
      },
      {
        name: "interrupt-request",
        status: "completed",
        note: "发布确认请求,等待 Surface Action 恢复",
      },
    ],
    inputs: [
      {
        id: "art-b1",
        label: "BusinessAgentRunRequest",
        contentType: "application/json",
        sizeBytes: 388,
        hash: "sha256:51de8c02aa91",
        status: "inline",
        preview: [["agentId", "security-ops-agent"]],
      },
    ],
    outputs: [
      {
        id: "art-t1",
        label: "ToolResult · list_cameras",
        contentType: "application/json",
        sizeBytes: 2048,
        hash: "sha256:77aa01fe3c44",
        status: "stored",
        preview: [
          ["CAM-05 / 06 / 08", "在线"],
          ["CAM-07", "离线 · 最后心跳 09:58:12"],
        ],
      },
      {
        id: "art-a1",
        label: "AgentContent(结构化)",
        contentType: "application/json",
        sizeBytes: 1536,
        hash: "sha256:be10d29f08a7",
        status: "stored",
        preview: [
          ["kind", "camera-panel + dispatch-draft"],
          ["cameras", "4 路"],
          ["dispatch", "夜班一组 · 东门 CAM-07 · 优先级高"],
        ],
      },
      {
        id: "art-x1",
        label: "Provider 原始请求 / 响应",
        contentType: "-",
        sizeBytes: 0,
        status: "excluded",
        note: "模型 Provider 原始载荷,永不进入浏览器与诊断历史(边界前排除,非浏览器端隐藏)",
      },
      {
        id: "art-x2",
        label: "系统提示词",
        contentType: "-",
        sizeBytes: 0,
        status: "excluded",
        note: "Business Agent 系统提示词,永不进入浏览器与诊断历史",
      },
    ],
  },
  {
    id: "presentation-pipeline",
    label: "Presentation Pipeline",
    status: "completed",
    startMs: 3360,
    durationMs: 1750,
    summary:
      "路由决策 generative-ui;Model Adapter 产出不可信 UI Plan Candidate",
    subStages: [
      {
        name: "presentation-routing",
        status: "completed",
        durationMs: 60,
        note: "decision = generative-ui(结构化 AgentContent)",
      },
      { name: "catalog-resolution", status: "completed", durationMs: 210 },
      {
        name: "model-analysis",
        status: "completed",
        durationMs: 1480,
        note: "modelLatency 1.4s · 输出不可信,待编译器校验",
      },
    ],
    inputs: [
      {
        id: "art-a1",
        label: "AgentContent(结构化)",
        contentType: "application/json",
        sizeBytes: 1536,
        hash: "sha256:be10d29f08a7",
        status: "stored",
        preview: [["kind", "camera-panel + dispatch-draft"]],
      },
      {
        id: "art-p0",
        label: "PresentationRequest",
        contentType: "application/json",
        sizeBytes: 980,
        hash: "sha256:0c3f77b21d6e",
        status: "inline",
        preview: [
          ["presentationRequestId", "preq-501"],
          ["catalog", "security-ops@v3"],
        ],
      },
    ],
    outputs: [
      {
        id: "art-p1",
        label: "PresentationDecision",
        contentType: "application/json",
        sizeBytes: 210,
        status: "inline",
        preview: [["mode", "generative-ui"]],
      },
      {
        id: "art-p2",
        label: "UI Plan Candidate(不可信)",
        contentType: "application/json",
        sizeBytes: 18842,
        hash: "sha256:3b9e0c55f1d2",
        status: "stored",
        preview: [
          ["root", "Grid"],
          ["children", "5"],
          ["信任状态", "未校验,仅 Compiler 可产出可信 A2UI"],
        ],
      },
      {
        id: "art-x3",
        label: "Presentation Model Provider 原始载荷",
        contentType: "-",
        sizeBytes: 0,
        status: "excluded",
        note: "Provider 原始请求 / 响应与系统提示词,永不进入浏览器与诊断历史",
      },
    ],
  },
  {
    id: "ui-compiler-core",
    label: "UI Compiler Core",
    status: "degraded",
    startMs: 5120,
    durationMs: 880,
    summary: "UI Plan 校验失败,跳过编译,走 Markdown 降级直出",
    degradationReason:
      "UI_PLAN_VALIDATION_FAILED → 降级为 Markdown PresentationResult",
    subStages: [
      {
        name: "ui-plan-validation",
        status: "failed",
        durationMs: 320,
        errorCode: "UI_PLAN_VALIDATION_FAILED",
        fieldPath: "children[2].props.columns",
        note: "CameraGrid 不存在属性 columns",
      },
      {
        name: "ui-compilation",
        status: "skipped",
        note: "校验失败,编译未执行",
      },
      {
        name: "fallback-markdown-serialization",
        status: "completed",
        durationMs: 560,
        note: "降级路径:Markdown 直出,不调用 Presentation Model",
      },
    ],
    inputs: [
      {
        id: "art-p2",
        label: "UI Plan Candidate(不可信)",
        contentType: "application/json",
        sizeBytes: 18842,
        hash: "sha256:3b9e0c55f1d2",
        status: "stored",
        preview: [
          ["root", "Grid"],
          ["children", "5"],
        ],
      },
    ],
    outputs: [
      {
        id: "art-c1",
        label: "Validation Result",
        contentType: "application/json",
        sizeBytes: 345,
        hash: "sha256:64d0a1bb92f8",
        status: "inline",
        preview: [
          ["status", "invalid"],
          ["errorCode", "UI_PLAN_VALIDATION_FAILED"],
          ["fieldPath", "children[2].props.columns"],
        ],
      },
      {
        id: "art-c2",
        label: "PresentationResult(Markdown)",
        contentType: "text/markdown",
        sizeBytes: 4210,
        hash: "sha256:1a7e5c30d8b9",
        status: "stored",
        preview: [
          ["mode", "markdown"],
          ["fallback", "true"],
          ["内容", "派单确认卡片(文本降级版)"],
        ],
      },
    ],
  },
];

const turn103Run302Nodes: readonly MockNode[] = [
  {
    id: "workbench",
    label: "Workbench",
    status: "completed",
    startMs: 0,
    durationMs: 30,
    summary: "用户在来源 Surface 上确认派单,提交 RuntimeActionRequest",
    subStages: [
      { name: "input-validation", status: "completed", durationMs: 8 },
      { name: "content-serialization", status: "completed", durationMs: 22 },
    ],
    inputs: [
      {
        id: "art-u2",
        label: "Surface Action(确认派单)",
        contentType: "application/json",
        sizeBytes: 128,
        status: "inline",
        preview: [
          ["surfaceId", "surface-201"],
          ["actionId", "action-77"],
          ["approved", "true"],
        ],
      },
    ],
    outputs: [
      {
        id: "art-r2",
        label: "RuntimeActionRequest",
        contentType: "application/json",
        sizeBytes: 356,
        hash: "sha256:ad40e7716c05",
        status: "inline",
        preview: [
          ["threadId", "thread-9"],
          ["turnId", "turn-103"],
          ["operationId", "op-202"],
          ["runId", "run-302"],
          ["payloadDigest", "sha256:…6c05"],
        ],
      },
    ],
  },
  {
    id: "runtime-host",
    label: "Agent Runtime Host",
    status: "completed",
    startMs: 35,
    durationMs: 110,
    summary: "Action 授权绑定完整来源身份;在来源 Turn 内创建新 Operation / Run",
    subStages: [
      {
        name: "action-validation",
        status: "completed",
        durationMs: 48,
        note: "绑定 thread-9 / turn-103 / op-202 / run-302 / surface-201 / action-77 + payloadDigest",
      },
      {
        name: "ag-ui-projection",
        status: "completed",
        parallelGroup: "proj",
        note: "实时投影",
      },
      {
        name: "diagnostic-persistence",
        status: "completed",
        parallelGroup: "proj",
        note: "诊断持久化(并行)",
      },
    ],
    inputs: [
      {
        id: "art-r2",
        label: "RuntimeActionRequest",
        contentType: "application/json",
        sizeBytes: 356,
        hash: "sha256:ad40e7716c05",
        status: "inline",
        preview: [
          ["surfaceId", "surface-201"],
          ["actionId", "action-77"],
        ],
      },
    ],
    outputs: [
      {
        id: "art-b3",
        label: "BusinessAgentResumeActionRequest",
        contentType: "application/json",
        sizeBytes: 402,
        hash: "sha256:e891bc340d27",
        status: "inline",
        preview: [
          ["agentId", "security-ops-agent"],
          ["resume", "interrupt:dispatch-confirm"],
        ],
      },
    ],
  },
  {
    id: "agent-adapter",
    label: "Business Agent Adapter",
    status: "completed",
    startMs: 150,
    durationMs: 40,
    summary: "Resume 事件契约校验与协议映射,补充关联标识",
    subStages: [
      { name: "contract-validation", status: "completed", durationMs: 15 },
      { name: "protocol-mapping", status: "completed", durationMs: 25 },
    ],
    inputs: [
      {
        id: "art-b3",
        label: "BusinessAgentResumeActionRequest",
        contentType: "application/json",
        sizeBytes: 402,
        hash: "sha256:e891bc340d27",
        status: "inline",
        preview: [["resume", "interrupt:dispatch-confirm"]],
      },
    ],
    outputs: [
      {
        id: "art-b4",
        label: "平台公开事件订阅",
        contentType: "application/json",
        sizeBytes: 120,
        status: "inline",
        preview: [["映射事件", "tool-call / message"]],
      },
    ],
  },
  {
    id: "business-agent",
    label: "Business Agent",
    status: "completed",
    startMs: 195,
    durationMs: 1200,
    summary: "Resume 后执行派单工具,返回 Markdown AgentContent",
    subStages: [
      {
        name: "tool-call execute_dispatch",
        status: "completed",
        durationMs: 950,
      },
    ],
    inputs: [
      {
        id: "art-b3",
        label: "BusinessAgentResumeActionRequest",
        contentType: "application/json",
        sizeBytes: 402,
        hash: "sha256:e891bc340d27",
        status: "inline",
        preview: [["resume", "interrupt:dispatch-confirm"]],
      },
    ],
    outputs: [
      {
        id: "art-t2",
        label: "ToolResult · execute_dispatch",
        contentType: "application/json",
        sizeBytes: 512,
        hash: "sha256:22ff90aa04b1",
        status: "inline",
        preview: [
          ["工单号", "WO-3321"],
          ["状态", "已派单 · 夜班一组"],
        ],
      },
      {
        id: "art-a2",
        label: "AgentContent(Markdown)",
        contentType: "text/markdown",
        sizeBytes: 640,
        hash: "sha256:c772dbe05193",
        status: "inline",
        preview: [["内容", "派单成功:WO-3321,夜班一组前往东门 CAM-07"]],
      },
      {
        id: "art-x4",
        label: "Provider 原始请求 / 响应",
        contentType: "-",
        sizeBytes: 0,
        status: "excluded",
        note: "永不进入浏览器与诊断历史",
      },
    ],
  },
  {
    id: "presentation-pipeline",
    label: "Presentation Pipeline",
    status: "completed",
    startMs: 1400,
    durationMs: 180,
    summary: "路由决策 markdown,直出 Markdown PresentationResult,不调用模型",
    subStages: [
      {
        name: "presentation-routing",
        status: "completed",
        durationMs: 45,
        note: "decision = markdown",
      },
      {
        name: "catalog-resolution",
        status: "skipped",
        note: "Markdown 路径无需 Catalog",
      },
      {
        name: "model-analysis",
        status: "skipped",
        note: "Markdown 直出不调用 Presentation Model",
      },
    ],
    inputs: [
      {
        id: "art-a2",
        label: "AgentContent(Markdown)",
        contentType: "text/markdown",
        sizeBytes: 640,
        hash: "sha256:c772dbe05193",
        status: "inline",
        preview: [["内容", "派单成功:WO-3321"]],
      },
    ],
    outputs: [
      {
        id: "art-p3",
        label: "PresentationDecision",
        contentType: "application/json",
        sizeBytes: 180,
        status: "inline",
        preview: [["mode", "markdown"]],
      },
      {
        id: "art-p4",
        label: "PresentationResult(Markdown)",
        contentType: "text/markdown",
        sizeBytes: 640,
        hash: "sha256:c772dbe05193",
        status: "inline",
        preview: [["mode", "markdown"]],
      },
    ],
  },
  {
    id: "ui-compiler-core",
    label: "UI Compiler Core",
    status: "skipped",
    startMs: 1580,
    durationMs: 0,
    summary: "Markdown 直出路径,编译链整段跳过",
    subStages: [
      { name: "ui-plan-validation", status: "skipped" },
      { name: "ui-compilation", status: "skipped" },
    ],
    inputs: [],
    outputs: [],
  },
];

export const MOCK_TURN: MockTurn = {
  turnId: "turn-103",
  conversationTitle: "东门摄像头离线排查",
  status: "degraded",
  startedAt: "2026-08-06 10:42:18",
  durationMs: 8100,
  userMessage: "把东门区域的摄像头调出来,并给夜班保安派单",
  sync: {
    persistedSequence: 38,
    observedSequence: 41,
    hasGap: false,
    revision: 12,
  },
  operations: [
    {
      operationId: "op-201",
      kind: "user-message",
      label: "Operation 1 · 用户消息",
      run: {
        runId: "run-301",
        status: "degraded",
        durationMs: 6400,
        nodes: turn103Run301Nodes,
      },
    },
    {
      operationId: "op-202",
      kind: "action-resume",
      label: "Operation 2 · Action Resume",
      source: "来源 surface-201 · action-77(确认派单)",
      run: {
        runId: "run-302",
        status: "completed",
        durationMs: 1700,
        nodes: turn103Run302Nodes,
      },
    },
  ],
};
