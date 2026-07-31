# GOAL-DEV-ENV-001：生成式 UI 平台全链路开发验证环境建设

## 1. 文档用途

本文件是 GOAL-DEV-ENV-001 的唯一总目标说明。

详细子任务位于 [`./GOAL-DEV-ENV-001/`](./GOAL-DEV-ENV-001/README.md)。

本 Goal 不是建设独立产品。
它是 Generative UI Platform 的阶段性研发基础设施建设任务，用于开发、联调、诊断、自动化回归和能力演示。

## 2. 建设背景

当前仓库已经具备 UI Compiler Core、UI Compiler 应用能力、Presentation Contract、Component Catalog Schema、Agent Runtime Host，以及 HTTP 和 WebSocket Mock 验证。

但现有能力仍以局部验证为主，尚不能从浏览器完整验证 Business Agent 接入、展示决策、受控 A2UI 编译、浏览器渲染和 Action 回传。

ADR-0019 已决定取消独立 UI Compiler Service 作为目标部署应用。
原 UI Compiler Service 中与 HTTP、CLI 和独立进程生命周期无关的能力，需要提取为 `packages/presentation-pipeline`，并由 Agent Runtime Host 在进程内组装。

## 3. 建设目标

建立以下可重复运行的完整验证链路：

```text
Vue Web Workbench
→ Agent Runtime Host
   ├── Business Agent Adapter
   │   → TypeScript LangGraph Reference Business Agent
   │   → Markdown / Structured Business Data
   │
   └── Embedded Presentation Pipeline
       → Sanitizer / Validator / Catalog
       → Model Adapter
       → untrusted PresentationDecision Candidate
          ├── markdown
          └── generative-ui + UI Plan Candidate
       → Validation / Policy / Component Catalog
       → UI Compiler Core
       → PresentationResult
→ Vue Markdown / A2UI Renderer
→ Action Event
→ Agent Runtime Host
→ LangGraph Resume
→ Embedded Presentation Pipeline
→ Updated PresentationResult
```

建设完成后应支持：

- 一条命令启动完整环境；
- HTTP 和 WebSocket 双传输验证；
- Fixture 模式离线、确定性运行；
- 至少一个真实 Presentation Model Provider Smoke Test；
- Markdown 和 A2UI 浏览器渲染；
- Action 回传、LangGraph Resume 和再次展示编译；
- Playwright 全链路 E2E；
- 通过关联 ID 查看跨模块安全诊断摘要。

## 4. 架构边界

### 4.1 Web

Web 只连接 Agent Runtime Host。

禁止 Web 直接调用 Business Agent、Presentation Pipeline、UI Compiler Core 或模型供应商。
Web 只配置 Runtime Host 地址，不配置独立 Compiler 地址。

### 4.2 Business Agent

Reference Business Agent 只负责业务请求、业务工具、任务状态、暂停和恢复。

它只输出 Markdown 或结构化业务数据，不输出 PresentationDecision、UI Plan Candidate、A2UI、HTML、Vue 或组件选择结果。

### 4.3 Business Agent Adapter

Business Agent Adapter 隔离 Runtime Host 与具体 Agent 协议。

Runtime Host 不直接依赖 LangGraph SDK。
Adapter 不承担展示决策或 UI 编译。

### 4.4 Presentation Pipeline

Presentation Pipeline 是独立 Package，但运行在 Agent Runtime Host 进程内。

它负责 Sanitizer、结构化数据校验、Catalog、Presentation Router、Model Adapter、候选验证、UI Compiler Core 调用、PresentationResult 和安全降级。

Runtime Host 负责组装依赖和 Run 生命周期，不得复制 Pipeline 内部规则。
PresentationRequest / PresentationResult 是稳定的进程内 Package 契约，不建立 UI Compiler 网络协议。

### 4.5 Model Adapter

Model Adapter 的逻辑归属是 Presentation Pipeline。

它处理清洗后的 AgentContent、Presentation Context 和 Component Catalog 摘要，输出不可信的 `PresentationDecision` 候选。

候选可以选择 Markdown；选择 `generative-ui` 时必须包含 UI Plan Candidate。

Model Adapter 不处理业务工具，不用于 Business Agent 推理，也不直接产生可信 A2UI。

### 4.6 UI Compiler Core

UI Compiler Core 是唯一可信 A2UI 生产者。

任何模型输出都必须经过 Schema、Policy、Catalog、Props、Action 和数据绑定校验后，才能进入确定性编译。

### 4.7 生命周期与降级

Business Agent Run、Presentation Pipeline 和 Action Resume 共享 Runtime Host 的关联 ID、取消信号、总超时预算和观测上下文。

Business Agent 已产生有效内容后，模型、路由或编译失败不得丢失有效业务结果，应优先返回安全 Markdown 降级。

### 4.8 当前非目标

当前不实现：

- 独立 UI Compiler HTTP Service；
- Embedded / Remote 双模式；
- UI Compiler Client、`UI_COMPILER_URL` 或独立 Compiler 端口；
- Interaction Gateway；
- 多 Business Agent 路由；
- 真实设备控制；
- 生产数据库、权限计费和长期会话持久化；
- 完整 A2UI 全规范。

## 5. 参考验证场景

开发环境使用“智能安防空地多智能体巡逻”作为参考领域，但平台核心保持业务无关。

- 查询设备状态：Business Agent 返回结构化设备数据，Pipeline 生成状态展示。
- 生成巡逻计划：Business Agent 返回任务草稿，Pipeline 生成计划和确认界面。
- 确认任务：用户点击 Action，Runtime 校验后恢复 LangGraph，再次调用同一 Embedded Presentation Pipeline 并更新界面。

## 6. 子任务总览

| 任务 | 名称 | 主要交付 |
|---|---|---|
| TASK-001 | 平台集成契约 | Business Agent、Runtime、Presentation 和 Action 公共契约 |
| TASK-002 | LangGraph Reference Business Agent | 确定性业务 Agent、Checkpoint 和 Resume |
| TASK-003 | Business Agent Adapter | Runtime 与 LangGraph Agent 的协议隔离 |
| TASK-013 | Presentation Pipeline Package 提取 | 提取可嵌入展示能力、最小 Fixture，并退役旧服务模式 |
| TASK-004 | Presentation Model Adapter 多模型接入 | Fixture 故障模拟与真实 Provider 的展示决策候选生成 |
| TASK-005 | Runtime Host 平台编排 | Agent Run 与 Embedded Pipeline 的完整编排 |
| TASK-006 | Web Workbench 工程化 | 可发布的 Vue 开发联调工作台 |
| TASK-007 | Vue A2UI Renderer | 受控组件注册、数据绑定和 Surface 渲染 |
| TASK-008 | Action 回传闭环 | Action 校验、LangGraph Resume、再次编译和界面更新 |
| TASK-010 | 一键开发环境 | 三服务启动、环境检查和统一命令 |
| TASK-009 | 完整平台 E2E | Fixture 全链路、三服务拓扑检查和真实模型 Smoke |
| TASK-011 | 诊断与可观测性 | 跨模块关联、耗时、错误与安全诊断摘要 |
| TASK-012 | 文档与演示 | 接入、运行、测试、排错和演示说明 |

## 7. 推荐执行顺序

```text
TASK-001
├── TASK-002 Reference Business Agent
├── TASK-006 Web Workbench 基础
└── TASK-013 Presentation Pipeline 提取

TASK-002 → TASK-003
TASK-001 + TASK-013 → TASK-004
TASK-003 + TASK-013 → TASK-005
TASK-006 → TASK-007
TASK-005 + TASK-007 → TASK-008
TASK-002 + TASK-005 + TASK-006 + TASK-007 → TASK-010
TASK-004 + TASK-008 + TASK-010 → TASK-009
TASK-001 起持续建设 TASK-011
全部完成后收口 TASK-012
```

关键说明：

- TASK-013 必须提供最小确定性 Fixture，Runtime Fixture 全链路不应被真实模型 Provider 接入阻塞。
- TASK-004 负责真实 Provider 和扩展故障模拟，不应成为 TASK-005 的前置条件。
- 一键启动环境是 E2E 的前置能力，不应依赖 E2E 完成。
- 诊断能力应随各任务增量建设，而不是最后一次性补齐。
- 当前开发环境只启动 Workbench、Runtime Host 和 Reference Business Agent 三个服务。
- Pipeline、Catalog 和 Fixture Adapter 属于 Runtime 进程内能力，不是独立服务。

## 8. 完成条件

- 新克隆仓库可以使用冻结锁文件安装；
- 一个命令启动 Web、Runtime Host 和 Reference Business Agent；
- Presentation Pipeline 作为 Package 嵌入 Runtime Host；
- Runtime Host 直接依赖 Package，不通过内部 HTTP 调用展示编译能力；
- 不保留独立 UI Compiler HTTP Service、Client、端口、`UI_COMPILER_URL` 或 Remote Mode；
- Fixture 模式不需要模型密钥；
- HTTP 和 WebSocket 全链路通过；
- Markdown 和 A2UI 浏览器渲染通过；
- Action 回传和 LangGraph Resume 通过，并重新经过 Embedded Presentation Pipeline；
- 至少一个真实 Presentation Model Provider 通过 Smoke Test；
- Playwright E2E 在 CI 稳定通过；
- Model Adapter 输出始终作为不可信候选校验；
- UI Compiler Core 保持唯一可信 A2UI 生产者；
- API Key、完整业务内容、Provider 原始响应和未脱敏 Action Payload 不进入日志或浏览器诊断；
- 文档明确区分平台、Compiler 子系统和开发验证环境。

## 9. 相关规范

- 平台需求：[`../platform/REQUIREMENTS.md`](../platform/REQUIREMENTS.md)
- 平台架构：[`../platform/SYSTEM_ARCHITECTURE.md`](../platform/SYSTEM_ARCHITECTURE.md)
- 开发环境：[`../platform/DEVELOPMENT_ENVIRONMENT.md`](../platform/DEVELOPMENT_ENVIRONMENT.md)
- ADR-0018：[`../adr/0018-expand-repository-scope-to-platform-validation-environment.md`](../adr/0018-expand-repository-scope-to-platform-validation-environment.md)
- ADR-0019：[`../adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md`](../adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- Compiler MVP 需求：[`../REQUIREMENTS.md`](../REQUIREMENTS.md)
- Compiler MVP 架构：[`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Compiler 设计：[`../Generative_UI_Compiler_Design.md`](../Generative_UI_Compiler_Design.md)
