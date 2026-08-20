import type { AgentSource } from "../settings/agent-source.js";
import type { RequestedPresentationMode } from "../settings/presentation-request.js";

export interface QuickScenario {
  agentSource: AgentSource;
  description: string;
  id: string;
  label: string;
  message: string;
  /**
   * Explicit presentation request sent to the Runtime policy via
   * forwardedProps (Issue #210). Absent means auto: the policy decides
   * the presentation path per content unit - that is the normal state,
   * not a mode named "source-native".
   */
  requestedMode?: RequestedPresentationMode;
}

/**
 * 快捷场景必须与其 Agent Source 当前已实现的受控入口一一对应；
 * 没有受控入口支撑的入口不得加入列表。
 */
export const quickScenarios: QuickScenario[] = [
  {
    agentSource: "ag-ui-mock",
    id: "map-patrol-route-review",
    label: "北侧通道巡逻方案",
    description: "验证图层、聚焦、高亮与路径预览的连续地图意图",
    message: "帮我想想怎么巡逻北侧通道",
  },
  {
    agentSource: "ag-ui-mock",
    id: "inspection-summary-a2ui",
    label: "巡检摘要 (A2UI)",
    description: "验证 Basic Catalog 固定渲染",
    message: "展示巡检摘要 A2UI",
  },
  {
    agentSource: "ag-ui-mock",
    id: "inspection-summary-platform-a2ui",
    label: "巡检摘要 (Platform Catalog)",
    description: "验证 Metric / StatusBadge / InfoRow 平台语义组件",
    message: "展示平台 Catalog 巡检摘要 A2UI",
  },
  {
    agentSource: "ag-ui-mock",
    id: "inspection-summary-dynamic-a2ui",
    label: "巡检摘要 (Dynamic A2UI)",
    description: "验证 Secondary LLM + Final Catalog 动态生成",
    message: "展示巡检摘要结构化结果",
    requestedMode: "dynamic",
  },
  {
    agentSource: "ag-ui-mock",
    id: "markdown",
    label: "http://localhost:5173/conversation",
    description: "验证安全 Markdown 展示",
    message: "请用 Markdown 总结当前平台状态。",
  },
  {
    agentSource: "ag-ui-mock",
    id: "run-error",
    label: "安全降级",
    description: "验证 bounded RUN_ERROR 与降级诊断",
    message: "触发一次 mock failure 验证降级诊断",
  },
];
