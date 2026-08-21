export type MapAgentTraceVariant = "map-A" | "map-B" | "map-C";

export type PrototypeStepStatus = "completed" | "running" | "pending";

export interface PrototypeMapStep {
  detail: string;
  id: string;
  label: string;
  output: string;
}

export const PROTOTYPE_MAP_STEPS: readonly PrototypeMapStep[] = [
  {
    id: "constraints",
    label: "显示任务限制图层",
    detail: "读取巡逻约束并在地图中打开限制区。",
    output: "限制图层已显示",
  },
  {
    id: "corridor",
    label: "聚焦北侧通道",
    detail: "将地图移动到本次巡逻的分析范围。",
    output: "北侧通道已聚焦",
  },
  {
    id: "observations",
    label: "标记观察点和限制区",
    detail: "把三个观察点与北侧限制区关联到地图。",
    output: "4 处关键位置已高亮",
  },
  {
    id: "route",
    label: "预览候选路线 A",
    detail: "生成一条经过关键观察点的连续路线。",
    output: "候选路线 A 已绘制",
  },
];

export function prototypeStepStatus(
  stepIndex: number,
  completedCount: number,
): PrototypeStepStatus {
  if (stepIndex < completedCount) return "completed";
  if (stepIndex === completedCount) return "running";
  return "pending";
}

export function resolveMapAgentTraceVariant(
  value: string | null,
): MapAgentTraceVariant {
  return value === "map-B" || value === "map-C" ? value : "map-A";
}
