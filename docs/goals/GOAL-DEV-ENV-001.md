# GOAL-DEV-ENV-001：生成式 UI 平台全链路开发验证环境建设

## 1. Goal 定位

本 Goal 是 Generative UI Platform 的阶段性工程建设任务。

它不是独立产品，也不是正式业务系统。

它交付平台研发基础设施和全链路集成验证环境。

## 2. 建设目标

建立以下可运行闭环：

```text
用户输入
-> Web Workbench
-> Agent Runtime Host
-> Business Agent Adapter
-> TypeScript LangGraph Business Agent
-> Markdown / Structured Data
-> UI Compiler Service
-> UI Compiler Model Adapter
-> UI Plan Candidate
-> UI Compiler Core
-> A2UI
-> Vue A2UI Renderer
-> 用户 Action
-> LangGraph Resume
-> 页面更新
```

## 3. 关键架构边界

- Web 只连接 Runtime Host。
- Business Agent 只输出 Markdown 或结构化业务数据。
- Business Agent 不输出 UI Plan Candidate 或 A2UI。
- Business Agent Adapter 不做 UI 编译。
- Model Adapter 位于 UI Compiler Service。
- Model Adapter 处理 AgentContent 并生成不可信 UI Plan Candidate。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- Renderer 只渲染 Component Registry 中注册的组件。
- Action 必须在 Runtime Host 中校验。

## 4. 子任务

### TASK-001 平台集成契约

定义 Business Agent、Runtime、Presentation 和 Action 公共契约。

### TASK-002 Reference Business Agent

实现 TypeScript LangGraph MVP，覆盖设备状态、巡逻计划和任务确认。

### TASK-003 Business Agent Adapter

在 Runtime Host 中实现 LangGraph HTTP Adapter，并保留 Mock Adapter。

### TASK-004 UI Compiler Model Adapter

审计并扩展现有 Model Adapter。

支持 Fixture，以及可配置的 Kimi、豆包、GLM 和通义千问接入。

模型输出必须满足 UI Plan Candidate Schema。

### TASK-005 Runtime Host 编排

实现 RunOrchestrator、ActionOrchestrator、UICompilerClient 和 SurfaceContextStore。

### TASK-006 Web Workbench

将静态 Demo 升级为 Vue 3、Vite、TypeScript 工程。

### TASK-007 Vue A2UI Renderer

实现当前 A2UI Profile、Component Registry、数据绑定和 Action Event。

### TASK-008 Action 闭环

完成 Action 校验、LangGraph Resume 和 Surface 更新。

### TASK-009 平台 E2E

使用真实进程和 Playwright 覆盖 HTTP、WebSocket、Markdown、A2UI、Action 和故障路径。

### TASK-010 一键开发环境

提供 `dev:platform`、`build:platform`、`test:e2e:platform` 和 `verify:platform`。

### TASK-011 诊断与可观测性

通过 requestId 串联 Agent、Model Adapter、Compiler、Renderer 和 Action。

### TASK-012 文档与演示

补齐接入、配置、运行、测试、排障和验收说明。

## 5. 默认开发模式

```bash
UI_COMPILER_MODEL_PROVIDER=fixture
```

默认模式不需要 API Key，不产生模型费用，并且必须可以在 CI 中稳定重复。

真实模型只作为 UI Compiler Model Adapter 的受控 Smoke Test。

## 6. 参考场景

参考场景使用智慧安防巡逻：

- 查询设备状态。
- 生成巡逻计划。
- 显示设备、步骤和风险。
- 用户确认任务。
- LangGraph 恢复并更新业务状态。

参考场景不改变平台的业务无关定位。

## 7. Definition of Done

- 全新克隆可以冻结安装依赖。
- 一条命令启动四个服务。
- Business Agent 不依赖 A2UI。
- Model Adapter 位于 UI Compiler Service。
- Fixture 全链路 E2E 通过。
- 至少一个真实 UI Compiler 模型供应商 Smoke Test 通过。
- HTTP 和 WebSocket 全链路通过。
- Markdown 和 A2UI 均可渲染。
- Action 可以回传并恢复 LangGraph。
- API Key 不进入浏览器、日志或仓库。
- Workbench 可以构建并部署为测试和演示环境。

## 8. 非目标

- Interaction Gateway。
- 多 Business Agent 动态路由。
- 多 Agent 自主协作。
- 真实设备控制。
- 生产数据库、权限和计费。
- Token 级流式输出。
- 任意代码生成。
- 完整 A2UI 全规范。
- 正式业务生产应用。
