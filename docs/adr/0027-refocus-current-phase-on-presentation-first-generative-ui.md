# ADR-0027：当前阶段回归 Presentation-first Generative UI 主线

- **状态：** 已接受
- **日期：** 2026-08-10
- **来源决策：** 用户确认执行 Scope Reset，并从第一性原理重新收敛当前产品边界

## 背景

Generative UI Platform 最初要验证的核心问题很简单：

> Business Agent 输出业务内容后，平台如何通过 Presentation Intelligence 自动生成美观、可靠、主题一致且受控的 UI。

随着 Agent Runtime Host、CopilotKit、AG-UI、Conversation、Runtime Repository、Thread / Turn / Operation、Surface Lifecycle、Command Admission、Recovery 和 Diagnostics 逐步加入，仓库当前阶段已经从 Generative UI Presentation 问题扩展为 Agent Runtime Platform 问题。

这些 Runtime 问题本身真实且有价值。
但它们不是证明 `AgentContent → Generative UI` 能力成立的必要前提。

ADR-0025 已经区分两种外部接入模式：Presentation Integration 与 Agent Runtime Integration。
Presentation Integration 明确不要求调用方采用平台 Runtime Kernel、Runtime Repository、Thread / Turn / Operation、CopilotKit 或平台托管会话。

因此需要重新确定当前阶段的唯一主线，并把 Runtime Platform 能力从当前 Release Gate 中移出。

## 第一性原理

### 1. 产品价值首先来自业务结果到可信界面的转换

Business Agent 的核心职责是产生业务事实和最终业务结果。
Generative UI Platform 的核心职责是把这些结果转换成用户可以理解和操作的可信 Presentation。

因此当前最短价值链是：

```text
Business Agent / Existing Agent Runtime
        ↓
Final AgentContent / Business Data
        ↓
Presentation Pipeline
        ↓
Presentation Model
        ↓
untrusted UI Plan Candidate
        ↓
UI Compiler Core
        ↓
trusted A2UI / PresentationResult
        ↓
Renderer
```

任何不直接提升这条链路的展示质量、可靠性、安全性或开发验证效率的能力，都不应自动进入当前阶段主线。

### 2. Agent Framework 和通信协议属于集成手段，不是产品核心

CopilotKit、AG-UI、HTTP、SSE、WebSocket 或未来其他 Agent Framework 都只是平台接入方式。

更换 Agent Framework 不应要求修改 Presentation Pipeline、UI Plan Candidate、UI Compiler Core、Component Catalog 或主题系统的核心语义。

因此平台不能因为当前参考实现使用 CopilotKit Runtime 和 AG-UI，就把 CopilotKit Runtime 的完整会话与 Runtime 状态问题提升为 Generative UI Platform 当前产品核心。

### 3. Workbench 的存在理由是提高 Generative UI 的可验证性

Workbench 最初存在的原因是让开发者能够可视化观察、调试和比较 Generative UI 是否正确、稳定和美观。

因此 Workbench 应优先服务于：

- AgentContent 输入与参考场景；
- Presentation 决策查看；
- UI Plan Candidate 查看；
- Validation / Compiler Error 查看；
- A2UI 和最终 Renderer 结果查看；
- Theme / Catalog / Viewport 切换；
- 不同模型、提示词或主题下的结果比较；
- fallback 与非法候选验证；
- Generative UI 稳定性和可靠性评测。

Workbench 不需要为了成立而拥有完整 Conversation Service、Runtime Recovery 或 Command Admission 产品能力。

### 4. Runtime Truth 只有在平台拥有交互执行权威时才是核心问题

如果平台未来真正托管用户 Action、Resume、业务副作用接纳、重试和恢复，那么 Thread、Turn、Operation、Surface、Command Admission、Idempotency 和 Runtime Repository 都有明确价值。

但在 Presentation-first 阶段，平台首先承诺的是 Presentation Safety，而不是完整 Interaction Safety。

因此 ADR-0024 描述的 Runtime Truth Model 继续有效于已有或未来 Agent Runtime Integration 路径，但不再是当前 Generative UI MVP 的 Release Gate。

### 5. 已经完成的 Runtime 研究应该冻结而不是立即删除

现有 Runtime Platform 代码和设计不视为错误实现。

当前阶段不进行大规模删除或推倒重写。
已有路径在继续存在期间仍必须遵守其安全不变量。

只有当后续代码收缩能够显著降低维护成本，并且不会破坏当前 Presentation 主链路时，才通过独立任务逐步删除或简化。

## 决策

### 1. 当前唯一产品主线

当前阶段将 **Presentation Integration** 提升为唯一 Active Product Track。

当前 North Star 是：

> 将 Business Agent 或已有 Agent Runtime 产生的 Markdown / structured AgentContent，转换为美观、可靠、主题一致且受控的 Presentation。

当前核心链路固定为：

```text
AgentContent
    ↓
Presentation Router
    ├── Markdown → safe Markdown PresentationResult
    └── Structured Business Data
              ↓
      Presentation Model
              ↓
      untrusted UI Plan Candidate
              ↓
      UI Compiler Core
              ↓
      trusted A2UI PresentationResult
```

### 2. Core 能力

当前阶段 Core 包括：

- AgentContent / Presentation Contract；
- Presentation Router；
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Validation / Policy / Binding / Action Descriptor 约束；
- trusted A2UI / PresentationResult；
- 受控 Renderer；
- Theme / Presentation Context；
- Generative UI reliability evaluation。

### 3. Supporting 能力

以下能力保留，但定位为 Supporting：

- Generative UI Workbench；
- Reference Business Agent；
- Agent Runtime Host 作为参考 Integration Host；
- CopilotKit Runtime；
- AG-UI；
- Business Agent Adapter；
- HTTP / SSE / WebSocket Transport；
- Reference Scenarios；
- 开发环境和 E2E。

Supporting 能力的目标是让 Core 更容易接入、验证和演示。
它们不得反向定义 Core 的产品边界。

### 4. Workbench 重新定位

Generative UI Workbench 重新定位为：

> **Generative UI Lab / 可视化开发调试工作台。**

当前 MVP 不再以 Conversation-first、Runtime Recovery、Command Admission 或逐 Operation Runtime Diagnostics 作为 Release Gate。

现有 Conversation、Inspect、Cases、Runtime 状态或兼容页面可以在迁移期保留。
但不得因为这些页面已经存在，就继续扩大 Runtime Platform 范围。

Workbench 当前优先建设 Theme、Catalog、Presentation Inspection、UI Plan、A2UI、Renderer、模型结果比较和可靠性验证能力。

### 5. Agent Runtime Host 重新定位

`apps/agent-runtime-host` 当前保留为参考 Integration Host。

它可以继续：

- 承载当前 CopilotKit Runtime / AG-UI 参考入口；
- 隔离 Business Agent 私有协议；
- 在服务端持有 Presentation Model 凭据；
- 组装 Presentation Pipeline；
- 为 Workbench 和 E2E 提供可运行的参考链路。

它不再因为当前实现包含 Runtime Kernel、Runtime Repository 或 Diagnostics，就成为当前产品核心。

当前阶段禁止无独立确认继续扩展：

- Thread / Turn / Operation 产品语义；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Reconcile；
- Runtime Recovery；
- 完整 Conversation Service；
- 完整 Diagnostic Platform。

### 6. Agent Runtime Integration 延后

ADR-0025 定义的 Agent Runtime Integration 保留为未来能力。

以下能力统一标记为 **Deferred Runtime Platform**：

- Thread；
- Turn；
- Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Runtime-owned Conversation History；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- exactly-one Command Admission 保证。

这些能力只有在未来明确需要平台拥有 Stateful Interaction 和 Action Execution Authority 时才恢复为 Active。

### 7. 框架中立

Generative UI Core 必须能够在不使用 CopilotKit 的情况下成立。

未来可以通过：

- Package API；
- REST API；
- AG-UI / CopilotKit Integration；
- LangGraph Integration；
- 自研 Runtime Adapter；

接入 Core。

具体稳定公共 API 形态仍需要独立决策。
本 ADR 不重新引入独立 UI Compiler Service 作为目标部署结论。

### 8. 当前功能准入标准

当前阶段新增功能必须至少满足以下一项：

1. 直接提升 `AgentContent → Presentation` 的语义正确性；
2. 直接提升生成 UI 的视觉质量或主题一致性；
3. 直接提升模型输出到 trusted A2UI 的安全性和可靠性；
4. 直接提升 Generative UI 的可调试、可比较、可评测能力；
5. 为 Core 提供必要且最小的 Framework / Runtime Integration。

如果一个功能主要解决的是通用 Agent Runtime、Conversation Service、Runtime State、Workflow Recovery 或 Observability Platform 问题，则默认属于 Deferred。

## 与既有 ADR 的关系

### ADR-0018

本 ADR 部分取代 ADR-0018 的“当前阶段以平台全链路 Runtime 验证环境为主要交付范围”结论。

ADR-0018 中以下结论继续有效：

- Generative UI Compiler 保持独立核心能力；
- Business Agent 不承担 UI Plan / A2UI 职责；
- Model 输出保持不可信；
- Interaction Gateway 和多 Agent 路由不是当前范围。

### ADR-0019

ADR-0019 继续有效于当前参考实现。

Presentation Pipeline 可以继续作为 Package 嵌入 Agent Runtime Host。
但“嵌入 Runtime Host”只是当前参考组合方式，不意味着 Runtime Host 是 Generative UI Core 的产品边界。

### ADR-0024

ADR-0024 继续有效于已有和未来 Agent Runtime Integration。

其安全规则继续约束仍然存在的 Runtime Host Action / Surface / Command 路径。
但 Thread / Turn / Operation / Surface / Command Admission 不再属于当前 Presentation-first MVP Release Gate。

### ADR-0025

本 ADR细化 ADR-0025 的阶段优先级。

Presentation Integration 是当前 Active Product Track。
Agent Runtime Integration 保留，但转为 Deferred。

### ADR-0026

ADR-0026 继续约束当前 CopilotKit / Workbench 参考 Agent 集成路径。

AG-UI 是该参考路径的 Agent 应用协议。
但 AG-UI 不成为 Generative UI Core 的强制外部协议。

## 当前 Release Gate

当前 MVP Release Gate 聚焦：

1. AgentContent 输入契约稳定；
2. Presentation Router 能正确选择 Markdown / Generative UI；
3. Presentation Model 能产生符合候选契约的 UI Plan；
4. UI Compiler 能拒绝非法候选并只产生 trusted A2UI；
5. Renderer 能安全、稳定地展示 trusted Presentation；
6. Workbench 能查看 AgentContent、Presentation Decision、UI Plan、Validation、A2UI 和最终 Renderer；
7. Workbench 能验证 Theme / Catalog / Viewport 变化；
8. 测试能覆盖合法、非法、fallback 和稳定性场景；
9. Core 不依赖 CopilotKit、AG-UI 或特定 Agent Framework 才能成立。

## 后果

### Positive

- 当前项目重新回到最初且可验证的产品价值；
- Core 与 CopilotKit / Agent Runtime 解耦；
- Workbench 的功能增长重新围绕 Generative UI 质量；
- 已有 Runtime 研究保留，不需要立即推倒重写；
- 未来切换 Agent Framework 时，Presentation Core 仍然可复用。

### Trade-offs

- 当前不会继续完善完整 Conversation / Runtime Recovery 体验；
- 已有 Runtime 代码与当前主线会在一段时间内同时存在；
- 需要逐步清理文档、Goal 和测试中的 Runtime-first Release Gate；
- Presentation Integration 的稳定公共 API 仍需要后续单独决策。

## 非目标

当前阶段不主动建设：

- 完整 Agent Runtime Platform；
- 完整 Conversation Service；
- Runtime Thread / Operation 产品化；
- Runtime Repository 产品化；
- Surface / Command Admission 新能力；
- Reconcile 和复杂 Runtime Recovery；
- 完整 Observability / Diagnostic Platform；
- Interaction Gateway；
- 多 Agent 自动路由；
- 多租户、权限、审计和计费。

## 迁移策略

本次 Scope Reset 首先修改 ADR、平台需求、平台架构、Workbench SRS、README 和 Agent 规则。

第一阶段不要求删除 Runtime Platform 代码。

后续代码任务按以下顺序评估：

1. 停止新增 Deferred Runtime 功能；
2. 保证现有 Presentation 主链路继续可运行；
3. 将 Workbench 新增功能转向 Generative UI Lab；
4. 识别只为 Deferred Runtime 服务且显著增加维护成本的代码；
5. 通过独立 Issue / PR 再决定保留、隔离或删除。
