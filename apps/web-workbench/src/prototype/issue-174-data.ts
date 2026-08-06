export interface PrototypePresentation {
  readonly body: string;
  readonly id: string;
  readonly kind: "markdown" | "surface" | "receipt";
  readonly label: string;
  readonly state: "current" | "historical" | "transient";
}

export interface PrototypeOperation {
  readonly duration: string;
  readonly id: string;
  readonly kind: "message" | "surface-action";
  readonly outcome: "completed" | "running";
  readonly runId: string;
}

export interface PrototypeTurn {
  readonly id: string;
  readonly index: number;
  readonly operations: readonly PrototypeOperation[];
  readonly presentations: readonly PrototypePresentation[];
  readonly status: "completed" | "processing" | "awaiting-action";
  readonly userMessage: string;
}

export interface PrototypeConversation {
  readonly id: string;
  readonly status: "active" | "completed" | "failed";
  readonly time: string;
  readonly title: string;
  readonly turns: number;
}

export const prototypeConversations: readonly PrototypeConversation[] = [
  {
    id: "conv-patrol-042",
    status: "active",
    time: "刚刚",
    title: "A 区巡防方案",
    turns: 3,
  },
  {
    id: "conv-device-118",
    status: "completed",
    time: "18 分钟前",
    title: "设备可用性检查",
    turns: 4,
  },
  {
    id: "conv-degraded-019",
    status: "failed",
    time: "昨天",
    title: "降级路径复现",
    turns: 2,
  },
  {
    id: "conv-catalog-007",
    status: "completed",
    time: "8 月 3 日",
    title: "Catalog 组件核验",
    turns: 6,
  },
];

export const prototypeTurns: readonly PrototypeTurn[] = [
  {
    id: "turn-01",
    index: 1,
    status: "completed",
    userMessage: "查看当前可用的无人机和无人车。",
    operations: [
      {
        duration: "1.42 s",
        id: "op-8f2a",
        kind: "message",
        outcome: "completed",
        runId: "run-2de1",
      },
    ],
    presentations: [
      {
        body: "当前有 1 架无人机与 2 台无人车在线，电量均高于任务阈值。",
        id: "pres-101",
        kind: "markdown",
        label: "设备摘要",
        state: "historical",
      },
    ],
  },
  {
    id: "turn-02",
    index: 2,
    status: "awaiting-action",
    userMessage: "用这些设备生成 A 区巡防方案。",
    operations: [
      {
        duration: "2.86 s",
        id: "op-901c",
        kind: "message",
        outcome: "completed",
        runId: "run-774a",
      },
    ],
    presentations: [
      {
        body: "无人机负责高空巡检，两台无人车分别覆盖东、西地面路线。预计 35 分钟完成。",
        id: "pres-102",
        kind: "surface",
        label: "巡防方案草稿",
        state: "historical",
      },
      {
        body: "高风险提交需要结构化确认。批准后将正式下发任务。",
        id: "pres-103",
        kind: "surface",
        label: "等待明确确认",
        state: "current",
      },
    ],
  },
  {
    id: "turn-03",
    index: 3,
    status: "processing",
    userMessage: "把西侧路线延长到仓储区，但不要下发。",
    operations: [
      {
        duration: "1.08 s",
        id: "op-a321",
        kind: "message",
        outcome: "completed",
        runId: "run-665d",
      },
      {
        duration: "进行中",
        id: "op-c912",
        kind: "surface-action",
        outcome: "running",
        runId: "run-991e",
      },
    ],
    presentations: [
      {
        body: "修改请求已接受，正在重新计算覆盖范围。",
        id: "receipt-221",
        kind: "receipt",
        label: "Action 提交回执",
        state: "transient",
      },
    ],
  },
];

export const prototypeStages = [
  { duration: "12 ms", name: "runtime.validation", status: "completed" },
  { duration: "34 ms", name: "business-agent.adapter", status: "completed" },
  { duration: "812 ms", name: "business-agent.run", status: "running" },
  { duration: "—", name: "presentation.pipeline", status: "queued" },
] as const;
