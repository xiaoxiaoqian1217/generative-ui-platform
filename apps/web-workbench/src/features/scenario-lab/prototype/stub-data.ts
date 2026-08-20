/**
 * PROTOTYPE - throwaway. Stub data for the Scenario Lab UI prototype.
 * Question: "Scenario Lab 三栏 IDE 骨架下,编辑 / 预览 / 评估哪个做主角最顺?"
 * All state is in-memory; no real Runtime calls.
 */

export interface StubFact {
  pointer: string;
  value: string;
}

export type StubFactStatus = "found" | "review" | "accepted" | "unchecked";

export interface StubFactRow extends StubFact {
  /** acceptedAs: 人工认可后的可接受表达,如 "93.8%" */
  acceptedAs?: string | undefined;
  status: StubFactStatus;
}

export interface StubScenario {
  /** 列表徽标文案,如 "5 轮 · 4/5" */
  evaluation: string;
  /** 信息形态标签:摘要 / 明细 / 集合 / 时间线 / 对比 / 结果 */
  form: string;
  name: string;
  presentationInput: string;
  facts: StubFact[];
  /** 运行后这些 pointer 标为 review(模拟 0.938 -> "93.8%" 的表达改写) */
  reviewPointers: string[];
  /** review pointer 在 surface 中的实际表达,确认后作为 alias 沉淀 */
  reviewAliases: Record<string, string>;
}

export interface StubRound {
  durationMs: number;
  factsFound: number;
  factsTotal: number;
  n: number;
  renderable: boolean;
  valid: boolean;
}

export interface StubRunResult {
  factStatus: Record<string, StubFactStatus>;
  rounds: StubRound[];
}

function pretty(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function input(value: unknown): string {
  return pretty({
    content: { kind: "structured", mediaType: "application/json", value },
    context: { allowedActions: [] },
    lifecycle: "stable",
    provenance: [],
  });
}

export const STUB_SCENARIOS: [StubScenario, ...StubScenario[]] = [
  {
    evaluation: "5 轮 · 4/5",
    form: "摘要",
    name: "summary",
    presentationInput: input({
      failed: 8,
      status: "partial_success",
      success: 120,
      successRate: 0.938,
      total: 128,
    }),
    facts: [
      { pointer: "/status", value: "partial_success" },
      { pointer: "/total", value: "128" },
      { pointer: "/success", value: "120" },
      { pointer: "/failed", value: "8" },
      { pointer: "/successRate", value: "0.938" },
    ],
    reviewPointers: ["/successRate"],
    reviewAliases: { "/successRate": "93.8%" },
  },
  {
    evaluation: "5 轮 · 5/5",
    form: "明细",
    name: "detail",
    presentationInput: input({
      expectedEndAt: "15:30",
      id: "JOB-1024",
      name: "Task A",
      owner: "Alice",
      startedAt: "14:20",
      status: "running",
    }),
    facts: [
      { pointer: "/id", value: "JOB-1024" },
      { pointer: "/status", value: "running" },
      { pointer: "/owner", value: "Alice" },
    ],
    reviewPointers: [],
    reviewAliases: {},
  },
  {
    evaluation: "5 轮 · 3/5",
    form: "集合",
    name: "collection",
    presentationInput: input({
      items: [
        { name: "Item A", progress: 0.82, status: "normal" },
        { name: "Item B", progress: 0.63, status: "warning" },
        { name: "Item C", progress: 0.91, status: "normal" },
      ],
    }),
    facts: [
      { pointer: "/items/1/status", value: "warning" },
      { pointer: "/items/1/progress", value: "0.63" },
      { pointer: "/items/2/progress", value: "0.91" },
    ],
    reviewPointers: ["/items/1/progress"],
    reviewAliases: { "/items/1/progress": "63%" },
  },
  {
    evaluation: "未评估",
    form: "时间线",
    name: "timeline",
    presentationInput: input({
      events: [
        { label: "Created", time: "14:20" },
        { label: "Started", time: "14:22" },
        { label: "Warning detected", time: "14:31" },
        { label: "Recovered", time: "14:35" },
        { label: "Completed", time: "14:42" },
      ],
    }),
    facts: [
      { pointer: "/events/2/label", value: "Warning detected" },
      { pointer: "/events/4/time", value: "14:42" },
    ],
    reviewPointers: [],
    reviewAliases: {},
  },
  {
    evaluation: "5 轮 · 4/5",
    form: "对比",
    name: "comparison",
    presentationInput: input({
      options: [
        { cost: 120, duration: 12, name: "A", risk: "low", successRate: 0.92 },
        {
          cost: 145,
          duration: 9,
          name: "B",
          risk: "medium",
          successRate: 0.97,
        },
      ],
    }),
    facts: [
      { pointer: "/options/0/successRate", value: "0.92" },
      { pointer: "/options/1/cost", value: "145" },
      { pointer: "/options/1/risk", value: "medium" },
    ],
    reviewPointers: ["/options/0/successRate"],
    reviewAliases: { "/options/0/successRate": "92%" },
  },
  {
    evaluation: "未评估",
    form: "结果",
    name: "result-warning",
    presentationInput: input({
      message: "8 of 128 jobs failed during the nightly run.",
      result: "partial_failure",
    }),
    facts: [
      { pointer: "/result", value: "partial_failure" },
      { pointer: "/message", value: "128" },
    ],
    reviewPointers: [],
    reviewAliases: {},
  },
];

export const STUB_USED_COMPONENTS: Record<string, string[]> = {
  collection: ["Column", "Text", "StatusBadge", "List"],
  comparison: ["Column", "Row", "Text", "StatusBadge"],
  detail: ["Column", "InfoRow", "StatusBadge", "Divider"],
  "result-warning": ["Callout", "Text"],
  summary: ["Column", "Row", "Metric", "StatusBadge", "InfoRow"],
  timeline: ["Column", "Row", "Text", "Icon"],
};

/** Deterministic fake run: 600ms latency, review pointers flagged per scenario. */
export function runStub(
  scenario: StubScenario,
  times: number,
): Promise<StubRunResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const factStatus: Record<string, StubFactStatus> = {};
      for (const fact of scenario.facts) {
        factStatus[fact.pointer] = scenario.reviewPointers.includes(
          fact.pointer,
        )
          ? "review"
          : "found";
      }
      const total = scenario.facts.length;
      const reviewCount = scenario.reviewPointers.length;
      const rounds: StubRound[] = Array.from({ length: times }, (_, index) => ({
        durationMs: 1200 + ((index * 370 + scenario.name.length * 211) % 1400),
        factsFound: total - (index % 3 === 2 ? reviewCount : 0),
        factsTotal: total,
        n: index + 1,
        renderable: true,
        valid: true,
      }));
      resolve({ factStatus, rounds });
    }, 600);
  });
}
