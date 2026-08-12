export interface QuickScenario {
  description: string;
  id: string;
  label: string;
  message: string;
}

export const quickScenarios: QuickScenario[] = [
  {
    id: "markdown",
    label: "Markdown 摘要",
    description: "验证安全 Markdown 展示",
    message: "请用 Markdown 总结当前平台状态。",
  },
  {
    id: "locate-device",
    label: "定位无人机",
    description: "验证 AG-UI Frontend Tool 闭环",
    message: "定位无人机 01",
  },
  {
    id: "devices",
    label: "设备状态",
    description: "查看结构化设备结果",
    message: "查看当前可用的无人机和无人车。",
  },
  {
    id: "patrol",
    label: "巡防方案",
    description: "验证生成式 UI 结果",
    message: "使用一架无人机和两台无人车巡查 A 区域。",
  },
  {
    id: "degraded",
    label: "安全降级",
    description: "验证失败与降级诊断",
    message: "返回一个需要安全降级的展示结果。",
  },
];
