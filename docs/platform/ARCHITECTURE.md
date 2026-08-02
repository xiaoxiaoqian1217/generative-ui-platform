# Generative UI Platform 平台级架构

本文描述整个仓库的跨子系统关系。
Compiler 内部架构继续以 `docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 为准。

## 1. 平台链路

```text
Generative UI Workbench
→ Agent Runtime Host
→ Business Agent Adapter
→ Reference Business Agent
→ Markdown / Structured Data
→ Agent Runtime Host
→ Embedded Presentation Pipeline
→ Presentation Router / Model Adapter
→ untrusted PresentationDecision Candidate
   ├── markdown
   └── generative-ui + UI Plan Candidate → UI Compiler Core
→ PresentationResult
→ Frontend Runtime
→ Action Event
→ Agent Runtime Host
→ Business Agent Resume
```

## 2. 子系统职责

- Workbench 是 Frontend Runtime 参考实现，只连接 Agent Runtime Host。
- Agent Runtime Host 管理 Run、调用 Business Agent、在进程内组装 Presentation Pipeline，并校验 Action。
- Business Agent Adapter 隔离 Runtime Host 与具体 Agent 协议。
- Reference Business Agent 负责业务工具、状态和恢复，只输出 Markdown 或结构化数据。
- Presentation Pipeline 负责展示路由、Model Adapter 组装和 Compiler 调用。
- Model Adapter 位于 Presentation Pipeline，输出受 Schema 约束但仍不可信的 PresentationDecision Candidate；仅 `generative-ui` 分支包含 UI Plan Candidate。
- UI Compiler Core 校验 Candidate 和 Catalog，构建 UI IR 并编译 A2UI。
- Frontend Runtime 维护 Component Registry，渲染 Markdown 或 A2UI，并产生 Action Event。

## 3. 运行约束

HTTP 和 WebSocket 必须共用同一 RunOrchestrator。
Action 必须校验 surfaceId、runId、actionId 和 Catalog 定义后再恢复 Business Agent。
UI Compiler Core 是唯一可信 A2UI 生产者。

## 4. 协议边界

- Runtime Contract 描述 Web 与 Runtime Host 的 HTTP / WebSocket Run 和 Action 消息，以及 Runtime Host 与 Business Agent Adapter 的 Run 和 Resume Action 消息。
- Business Agent Contract 描述业务请求和 AgentContent，并由 `packages/runtime-contract` 承载。
- Presentation Contract 描述 Runtime Host 与 Embedded Presentation Pipeline 的进程内请求和结果。
- Compiler Contract 描述 Presentation Pipeline 与 UI Compiler Core 的进程内编译请求、UI IR、A2UI Profile 和编译结果。
- A2UI 描述可渲染 UI Surface。
- HTTP、WebSocket 或可选 AG-UI 只描述前端传输，不描述 UI Compiler 网络客户端。
- Business Agent 不需要实现 AG-UI。

## 5. 默认开发拓扑

```text
Workbench              5173
Agent Runtime Host     8200
Reference Agent        8300
```

## 6. 安全原则

- 模型输出和 UI Plan Candidate 均不可信。
- 不执行模型生成代码。
- Component Registry 只暴露允许组件。
- Action Payload 视为不可信输入。
- 敏感配置不得进入浏览器或日志。

## 7. 未来范围

Interaction Gateway、多 Business Agent 自动路由和多 Agent 协作仍属于未来范围。
当前阶段只完成单一参考 Business Agent 的平台全链路验证。
