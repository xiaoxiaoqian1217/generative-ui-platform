export interface QuickScenario {
  description: string;
  id: string;
  label: string;
  message: string;
}

/**
 * 快捷场景必须与 AGUIMock 当前已注册的场景一一对应；
 * 没有 mock 支撑的入口不得加入列表。
 */
export const quickScenarios: QuickScenario[] = [
  {
    id: "inspection-summary-a2ui",
    label: "巡检摘要 (A2UI)",
    description: "验证 Basic Catalog 固定渲染",
    message: "展示巡检摘要 A2UI",
  },
  {
    id: "inspection-summary-platform-a2ui",
    label: "巡检摘要 (Platform Catalog)",
    description: "验证 Metric / StatusBadge / InfoRow 平台语义组件",
    message: "展示平台 Catalog 巡检摘要 A2UI",
  },
  {
    id: "markdown",
    label: "http://localhost:5173/conversation",
    description: "验证安全 Markdown 展示",
    message: "请用 Markdown 总结当前平台状态。",
  },
  {
    id: "run-error",
    label: "安全降级",
    description: "验证 bounded RUN_ERROR 与降级诊断",
    message: "触发一次 mock failure 验证降级诊断",
  },
];
