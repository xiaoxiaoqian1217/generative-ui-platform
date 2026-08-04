# GOAL-WEB-WORKBENCH-001：Generative UI Workbench 开发验证产品化

## 1. 目标

将 Generative UI Workbench 从已完成的平台全链路开发验证环境，演进为可独立部署、可诊断、可回放和可验收的开发验证产品。
本 Goal 以 [`../WEB_WORKBENCH_SRS.md`](../WEB_WORKBENCH_SRS.md) 为需求来源，并以 ADR-0020、ADR-0021 与 ADR-0022 收敛其前端集成、模型联调和 Business Agent 传输方式。

Workbench 仍不是正式业务运营前端。
它不承担真实设备控制、生产权限、长期业务数据、计费或多 Agent 路由。

## 2. 已完成基线

`GOAL-DEV-ENV-001` 已完成并构成当前基线。
当前基线已具备 Runtime Host、Business Agent Adapter、嵌入式 Presentation Pipeline、Vue Renderer、Action 回传、HTTP、WebSocket、CopilotKit Headless Runtime Adapter 和基础部署能力。

本 Goal 不重建这些能力。
本 Goal 在既有边界内补足 Workbench 的产品化信息架构、验收案例、只读查询契约和真实模型开发联调体验。

## 3. 架构约束

- Workbench 只连接 Agent Runtime Host。
- CopilotKit Headless、HTTP 和 WebSocket 是映射到同一 RunOrchestrator 的薄传输入口。
- Runtime Host 当前通过 HTTP + SSE 与 WebSocket Business Agent Adapter 和 Business Agent 通信。
- Business Agent 私有调用真实 Business Model，并且只向 Runtime Host 输出 Markdown 或结构化业务数据。
- Presentation Pipeline 私有调用真实 Presentation Model，并且只输出不可信的展示决策候选。
- UI Compiler Core 仍是唯一可信 A2UI 生产者。
- Component Action 继续经 Runtime Host 的 Action 契约回传。
- Catalog 摘要和已加载场景元数据必须由 Runtime Host 通过只读、Schema 校验的 Runtime Contract 提供。
- 浏览器不得读取内部 Package、Business Agent 私有协议、模型供应商配置、密钥、令牌、设备凭证或 Provider 原始响应。
- 参考场景的用户输入和业务结果可在本地调试模式显示。

## 4. P0 范围

- 提供 Playground、Inspect、Cases、Catalog、Scenarios 和 Settings 六个稳定路由。
- 将 Workbench 主交互迁移到 CopilotKit Headless。
- 保留 HTTP 和 WebSocket 的 Runtime Contract 与自动化覆盖，但不要求继续保留面向用户的传输切换界面。
- 建立本地案例库。
- 提供代码内置的十个最低验收案例和一个额外的后端工具失败案例。
- 支持单例重放、重新运行、语义断言比较和失败诊断保存。
- 支持浏览器本地保存用户案例以及 JSON 导入导出。
- 提供 Catalog 只读查看和受控组件预览。
- 提供场景元数据查看和浏览器本地非敏感设置。
- 对确认型 Action 显示 Runtime Host 提供的风险元数据，并在用户批准前阻止 Resume。
- 支持自然语言文本确认与结构化确认型 Action。
- 日常开发联调使用真实 Business Model 和真实 Presentation Model。
- 退役可运行的 Fixture Provider、Fixture 应用模式和相关运行配置。
- 自动化测试只使用进程内测试替身，不把真实模型可用性作为 CI 或合并门槛。

## 5. 验收案例矩阵

内置最低矩阵必须包括以下十个案例。

1. Markdown 直出。
2. 设备状态 UI。
3. 多方案 UI。
4. 地图 Action。
5. 任务确认。
6. 用户取消。
7. 非法组件。
8. 非法 Props。
9. 非法 Action。
10. Compiler 失败后的安全降级。

后端工具失败作为第十一个额外案例。

案例比较使用语义断言。
语义断言只验证展示模式、关键组件、Action、错误阶段、稳定错误码和降级原因。
语义断言不比较原始 A2UI、页面文案或截图。

## 6. 非目标

- 正式智能安防指挥系统。
- 强制绑定任何单一业务场景。
- 真实设备或后端业务工具控制。
- 服务端案例库、账号、权限、多人协作或长期业务数据。
- 可运行 Fixture Provider、默认离线 Fixture 模式或独立 Fixture 服务。
- 真实模型 Smoke Test、Provider 可用性 CI 门槛或合并门槛。
- 浏览器中的任意 Props 编辑、任意动态组件加载或任意代码执行。
- CopilotKit Tool Call 到组件 Action 的映射。

## 7. 验证要求

- 文档变更运行 `pnpm docs:check`。
- Runtime Contract 和 Workbench 代码变更运行对应的 TypeScript、单元和集成测试。
- 路由、案例重放、语义断言、确认型 Action、Catalog 预览和本地案例库具有浏览器 E2E 覆盖。
- HTTP、WebSocket 和 CopilotKit Headless 入口共享同一 RunOrchestrator 的行为必须具有自动化证据。
- 真实模型仅由开发人员在开发环境通过 Workbench 联调。
- 自然语言确认与结构化确认型 Action 的行为边界具有自动化证据。

## 8. 任务与依赖

任务包位于 [`./GOAL-WEB-WORKBENCH-001/`](./GOAL-WEB-WORKBENCH-001/README.md)。

```text
TASK-001 Business Agent 事件传输 Adapter
TASK-002 退役可运行 Fixture Provider
TASK-003 Workbench 路由与本地设置

TASK-001 + TASK-003 → TASK-004 CopilotKit 主运行与确认闭环
TASK-003 → TASK-005 Runtime Catalog 与场景浏览
TASK-003 + TASK-004 → TASK-006 Cases 与语义断言
TASK-004 + TASK-006 → TASK-007 Inspect 与确认型 Action
TASK-001 + TASK-002 + TASK-005 + TASK-006 + TASK-007 → TASK-008 自动化验证与文档收口
```

## 9. 完成条件

- Workbench 可以独立构建和部署为开发验证产品。
- 用户可以通过六个稳定路由运行、检查、保存、重放和比较案例。
- Runtime Host 只公开经契约定义的运行、Action、健康和只读查询入口。
- Runtime Host 可以通过 HTTP + SSE 或 WebSocket Adapter 与 Business Agent 运行和恢复 Action，并接收请求期间的离散业务事件。
- Workbench 通过 CopilotKit Headless 使用 Runtime Host，并且不绕过 Presentation Pipeline。
- 不存在可运行 Fixture Provider、Fixture 应用模式或默认 Fixture 环境配置。
- 自动化测试保持确定性，不依赖真实模型。
- 开发人员可在配置真实双模型后直接通过 Workbench 联调。
