# TASK-012：文档与演示

## 目标

形成可交接、可接入、可评审的开发验证环境文档。

## 文档内容

- 所属平台项目背景；
- 当前环境建设背景；
- 环境定位；
- 架构边界；
- Business Agent 接入；
- Business Agent Adapter；
- UI Compiler Model Adapter；
- Provider 配置；
- Component Catalog；
- A2UI Renderer；
- Action 安全；
- 一键启动；
- E2E；
- 故障排查。

## 演示流程

```text
1. 查询设备状态
2. Business Agent 返回结构化数据
3. UI Compiler Model Adapter 生成 UI Plan Candidate
4. UI Compiler Core 编译 A2UI
5. Web 渲染
6. 生成巡逻计划
7. 点击确认
8. Business Agent 恢复并更新状态
9. 切换 HTTP / WebSocket
10. 切换 Fixture / 真实 UI Compiler 模型
11. 查看诊断面板
```

## 验收

- 新开发人员可按文档启动环境；
- 评审人员可完成完整演示；
- 文档明确当前交付物是验证环境，不是独立产品；
- 文档明确 Model Adapter 位于 UI Compiler Service。
