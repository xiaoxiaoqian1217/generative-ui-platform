# ADR-0018: 将仓库范围扩展为平台全链路开发验证环境

- **状态：** 部分被 ADR-0019、ADR-0027 取代
- **日期：** 2026-07-31

## 取代说明

ADR-0019 取代了本 ADR 中关于 UI Compiler Service 在当前阶段独立部署、Runtime Host 通过 UI Compiler Client 调用 Service，以及 Model Adapter 进程归属固定为独立 Service 的结论。

ADR-0027 进一步取代了本 ADR 中“当前阶段以平台全链路 Runtime 验证环境为主要交付范围”的阶段性结论。

当前阶段改为 Presentation-first，优先验证：

```text
Natural Language
→ Business Agent
→ Final AgentContent
→ Presentation Router
→ Presentation Decision
   ├── markdown
   └── generative-ui + UI Plan Candidate
→ UI Compiler Core
→ trusted Presentation
```

ADR-0015 的 Router 语义继续有效：Markdown 与 structured data 都可以进入 Router；只有需要展示语义分析时才调用 Model Adapter；content type 不等于 presentation mode。

真实 Agent Conversation 继续作为当前 Supporting Reference Experience，用于产生真实 AgentContent。
完整 Conversation Management / Runtime Persistence / Recovery 不再构成当前 Release Gate。

本 ADR 关于 Generative UI Compiler 独立核心能力、Business Agent 不承担 UI 生成职责、模型输出不可信、受控 Renderer，以及 Interaction Gateway / 多 Agent 路由非目标等结论继续有效。
本 ADR 中关于 Runtime Host、Action 闭环和完整 Runtime 验证的允许范围继续作为已实现或未来 Agent Runtime Integration 的历史决策背景，但不再构成当前 Presentation-first MVP Release Gate。

## 背景

仓库最初以 Generative UI Compiler MVP 作为当前交付范围。
ADR-0003 因此将当前 MVP 收敛为 UI Compiler Service 和 UI Compiler Core，并将 Interaction Gateway、真实 Business Agent、Frontend Runtime 和完整交互闭环排除在 Compiler MVP 之外。

随着 UI Compiler 主路径、Model Adapter、Catalog 校验、A2UI 编译、HTTP Service 和 Runtime Host 参考应用逐步建立，仓库已经具备从单一 Compiler 子系统扩展到平台级集成验证的基础。
当时阶段需要真实验证以下链路：

```text
Web Workbench
→ Agent Runtime Host
→ Business Agent Adapter
→ Reference Business Agent
→ Markdown / Structured Data
→ Presentation Pipeline
→ Model Adapter
→ UI Plan Candidate
→ UI Compiler Core
→ A2UI
→ Frontend Runtime / Renderer
→ Action 回传
```

如果仍把 Compiler MVP 文档当作整个仓库的唯一范围规范，Reference Business Agent、Business Agent Adapter、Workbench、Renderer 和 Action 闭环会持续与旧范围约束冲突。
同时，如果直接废弃原 Compiler 文档和 ADR，又会丢失已经确认的 Compiler 内部信任边界和安全决策。

## 决策驱动因素

- 保留 Generative UI Compiler 的独立代码能力和既有安全边界。
- 为跨子系统开发、联调、诊断和端到端测试建立明确的仓库级范围。
- Business Agent 不应承担 UI Plan、组件选择或 A2UI 生成职责。
- 模型输出仍必须保持不可信，并由 Compiler 契约和 Catalog 约束。
- 前端必须通过统一后端入口访问当时完整 Agent Runtime Integration 参考链路。
- 当前阶段应验证单一 Reference Business Agent，而不是提前建设多 Agent 网关。
- 原 Compiler MVP 文档和 ADR 必须继续可追溯、可引用。

## 决策

### 仓库级范围

Generative UI Platform 成为仓库级和长期平台边界。
Generative UI Compiler 继续作为平台核心子系统，并保持可独立构建、测试和作为 Package 复用。
其当前 Reference Integration 部署边界由 ADR-0019 规定，并由 ADR-0027 重新解释为 Supporting Integration，而不是 Core 长期唯一宿主。

本 ADR 接受时的阶段交付物是平台全链路开发验证环境，而不是新的独立业务产品。
该环境用于平台研发、Business Agent 接入联调、Compiler 验证、A2UI Renderer 开发、Action 闭环验证、自动化回归和能力演示。
当前阶段范围已由 ADR-0027 重新收敛。

### 本 ADR 接受时允许建设的组成部分

- Agent Runtime Host；
- Business Agent Contract；
- Business Agent Adapter；
- 单一 Reference Business Agent；
- Web Workbench；
- Frontend Runtime 和受控 A2UI Renderer；
- Runtime Host 内部 Presentation Pipeline；
- Action 校验和 Business Agent 恢复链路；
- HTTP 和 WebSocket 全链路；
- Fixture 与真实 Presentation Model Provider 验证；
- 完整端到端测试和开发诊断能力。

上述 Runtime-first 能力的当前优先级已由 ADR-0027 调整。

Reference Business Agent 可以采用 TypeScript LangGraph 实现，但 LangGraph 不是平台公共契约，也不是 Runtime Host 或 Compiler 的必需依赖。

### 强制架构边界

Web 只连接 Agent Runtime Host 的结论适用于本 ADR 定义的完整 Agent Runtime Integration 参考链路。
Presentation Integration 的长期公共 API 由后续决策定义。

Agent Runtime Host 在本 ADR 接受时负责传输接入、Run 编排、Business Agent Adapter 调用、Presentation Pipeline 组装、Action 编排、关联标识和安全错误映射。
Runtime Host 不负责生成 UI Plan Candidate、UI IR 或 A2UI。

Business Agent 负责业务意图、业务工具、业务状态和流程恢复。
Business Agent 只输出 Markdown 或结构化业务数据，不输出 UI Plan Candidate、A2UI、HTML、Vue 组件或前端代码。

Model Adapter 继续属于展示决策和 UI 编译子系统。
它只接收已清理的 AgentContent、展示上下文和 Catalog 能力摘要，并返回不可信的 Presentation Decision Candidate。
它不参与 Business Agent 的业务推理或工具调用。
其具体运行宿主由 ADR-0019 规定。

UI Compiler Core 继续是唯一可信 A2UI 生产者。
任何模型输出都必须经过运行时 Schema、Component Catalog、Props、Action、Binding 和安全策略校验后才能进入 Core。

Frontend Runtime 只渲染 Component Registry 中已注册的组件。
它不得执行模型生成的任意 HTML、JavaScript 或 Vue 代码。

### 当前仍不属于范围的能力

以下能力在本 ADR 和 ADR-0027 下均不属于当前阶段：

- Interaction Gateway；
- 多 Business Agent 动态发现和路由；
- 多 Agent 自主协作；
- 生产级身份认证、权限和计费；
- 真实设备控制；
- 任意前端代码生成；
- 完整 A2UI 全规范实现。

如果未来启动 Interaction Gateway 或多 Agent 路由，仍必须通过新的范围变更 Issue 和 ADR 重新确认职责、契约、部署和依赖方向。

## 与既有决策的关系

本 ADR 部分取代 ADR-0003 中“仓库当前交付范围只包含 UI Compiler Service 和 UI Compiler Core”的阶段性结论。

ADR-0003 以下决策继续有效：

- Interaction Gateway 不属于当前阶段；
- 不得默认恢复早期 Gateway 脚手架；
- 启动 Gateway 必须先有明确业务触发条件、范围变更 Issue 和新 ADR。

原 Compiler ADR 继续约束 Compiler 子系统，包括但不限于：

- Monorepo 与模块边界；
- 明确的编译结果状态；
- Markdown 与结构化 AgentContent；
- 编译数据所有权和 Catalog 注入；
- A2UI Profile；
- Markdown 降级；
- Presentation Router 与 Model Adapter；
- 可靠性、安全和可观测性。

ADR-0019 进一步确定当前 Reference Integration 将 Presentation Pipeline 嵌入 Agent Runtime Host，并取消独立 UI Compiler Service 作为目标部署应用。
ADR-0019 的长期 Runtime Host 产品定位已被 ADR-0027 部分取代。

ADR-0027 将当前阶段重新聚焦到 Presentation-first Generative UI，并把完整 Agent Runtime Integration 降为 Deferred。

平台级需求、架构和当前 Goal 不得放宽 Compiler 内部信任边界。

## 后果

### 正面影响

- 仓库级平台范围与 Compiler 子系统范围得到明确分层。
- Business Agent、Reference Integration Host、Presentation Pipeline 和 Frontend Runtime 的职责得到明确隔离。
- 原 Compiler 文档和 ADR 可以继续作为子系统基线使用。
- 已完成的全链路研究仍可作为未来 Agent Runtime Integration 基础。

### 代价和风险

- 仓库包含更多可运行应用和可复用 Packages，开发环境和 CI 编排复杂度增加。
- Runtime-first 代码在 Scope Reset 后仍会暂时存在，需要避免其继续反向驱动产品范围。
- 旧 Compiler 文档中的“当前产品”和“范围外”措辞仍保留，需要通过文档导航和规范优先级正确理解。
- Reference Business Agent 和 Workbench 可能被误认为平台生产实现，文档必须持续标明其验证性质。

## 验证要求

该决策与 ADR-0027 共同通过以下证据持续验证：

- Compiler 子系统依赖边界检查继续通过；
- Workbench 可以通过自然语言驱动 Reference / Real Business Agent；
- Business Agent Contract 不包含 UI Plan Candidate 或 A2UI；
- Final AgentContent 与 public process events 保持区分；
- Presentation Router 继续遵守 ADR-0015；
- Model Adapter 仍只服务于展示决策；
- UI Compiler Core 仍是唯一可信 A2UI 生产者；
- 至少一个真实 Presentation Model Provider 可以通过受控 Smoke Test；
- Workbench 可以验证最终 Generative UI 结果并 Inspect Presentation Trace；
- Interaction Gateway 和多 Agent 路由没有被隐式引入；
- 新增当前阶段能力符合 ADR-0027 功能准入标准。
