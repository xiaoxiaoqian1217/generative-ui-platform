# Generative UI Platform

本上下文定义 ADR-0027 下的仓库级统一领域语言。

## Current product language

**Generative UI Platform**  
当前阶段是与 Agent Framework 解耦的 Generative UI Presentation Engine，以及用于验证其可靠性和安全性的开发工具链。  
核心价值是把真实 Business Agent 产生的 Final AgentContent 转换为可信 Presentation。  
_Avoid_: 完整 Agent Runtime Platform、CopilotKit 产品封装、任意前端代码生成器

**Current North Star**  
将 Business Agent 或已有 Agent Runtime 产生的 Final AgentContent，转换为可靠、主题一致且受控的 Presentation，并通过真实 Agent Conversation 验证这条链路。  
_Avoid_: 以 Conversation Management、Runtime Repository 或多 Agent Gateway 作为当前 North Star

**Presentation Integration**  
ADR-0025 定义的当前唯一 Active Product Track。调用方保留自己的 Agent Runtime / Business Runtime，只使用平台的 Presentation / Generative UI 能力。  
_Avoid_: 要求调用方迁移 Thread、Checkpoint、Action Admission 或会话系统

**Agent Runtime Integration**  
ADR-0025 定义的长期第二种接入模式。平台托管 Thread、Turn、Operation、Surface、Command Admission、Recovery 等 Interaction Runtime 能力。当前由 ADR-0027 标记为 Deferred。  
_Avoid_: 当前 Presentation-first MVP Release Gate

**Core**  
当前直接定义产品价值的能力集合：Presentation Contract、Presentation Router、Presentation Decision、Presentation Model Adapter、UI Plan Candidate、UI Compiler Core、Component Catalog、Theme / Presentation Context、trusted Presentation、Controlled Renderer contracts 和 Reliability Validation。  
_Avoid_: CopilotKit、Runtime Repository、完整 Conversation Service

**Supporting Integration**  
用于接入、调试、演示和验证 Core 的能力。包括 Generative UI Workbench、真实 Agent Conversation reference experience、Reference Integration Host、CopilotKit / AG-UI、Business Agent Adapter、Reference Business Agent、Reference Scenarios 和开发 E2E。  
_Avoid_: 反向定义 Generative UI Core

**Deferred Runtime Platform**  
当前保留设计与已有实现、但停止扩张的 Agent Runtime 能力。包括 Runtime Thread / Turn / Operation、Runtime Repository、Surface Lifecycle、Command Admission、long-term Runtime-owned Conversation History、Recovery / Reconcile 和 Runtime Truth Diagnostics。  
_Avoid_: 当前功能开发默认方向

## Agent interaction language

**Real Agent Conversation**  
Workbench 中由用户自然语言输入驱动 Business Agent / Existing Agent Runtime 的真实交互过程。它用于产生真实 Final AgentContent，是当前 Supporting Core Experience。  
_Avoid_: 手工粘贴 AgentContent、完整长期 Conversation Management Platform

**Conversation Management Platform**  
对 Conversation 提供长期 History、Rename、Archive、Delete、跨 Runtime restart recovery、Thread / Turn / Operation 管理等产品能力。当前 Deferred。  
_Avoid_: 将“真实对话”本身误判为 Deferred

**Business Agent**  
拥有业务意图理解、业务推理、后端工具、业务 State / Checkpoint、业务副作用语义和最终业务结果的 Agent。它不负责 UI Plan、A2UI、前端组件或布局实现。  
_Avoid_: UI Compiler Agent、A2UI Agent、Presentation Model

**Business Agent Adapter**  
隔离具体 Business Agent 私有协议与 Reference Integration Host 的适配层。只做契约校验、关联标识和协议映射，不总结、改写或重新解释 Business Truth。  
_Avoid_: Model Adapter、Presentation Model、业务内容加工器

**Reference Business Agent**  
用于产生真实 AgentContent 和验证集成链路的参考业务 Agent。  
_Avoid_: UI Compiler Agent、产品必须依赖的 Agent Framework

**Agent Runtime Host / Reference Integration Host**  
当前是 Reference Integration Host。可以承载 CopilotKit / AG-UI 参考入口、Business Agent Adapter、服务端 Presentation Model 凭据和 Embedded Presentation Pipeline。已有 Runtime Kernel / Repository 等实现属于 Deferred Runtime Platform。  
_Avoid_: Generative UI Core、当前产品 North Star

**AG-UI**  
当前 Workbench ↔ Reference Integration Host 参考 Agent Integration 使用的应用协议。ADR-0026 继续约束这条 Supporting 路径。  
_Avoid_: Generative UI Platform 唯一外部接入协议

**Transport**  
HTTP、SSE、WebSocket 或未来其他传输机制。Transport 不定义 Generative UI Core 语义。  
_Avoid_: 把 HTTP / WebSocket 当作与 AG-UI 同层级的业务协议

## Business and presentation language

**Business Truth**  
业务上真实发生了什么的权威事实。由 Business Agent 或业务系统拥有。Presentation Model、UI Compiler、Workbench 和 Renderer 不得修改 Business Truth。  
_Avoid_: Presentation Decision、UI 展示状态

**AgentContent**  
Business Agent 或已有 Agent Runtime 最终提交给 Presentation Pipeline 的业务内容。当前允许 Markdown 或 structured business data。  
AgentContent 是系统边界和可观察对象，不是 Workbench 当前主要人工输入。  
_Avoid_: UI Plan Candidate、A2UI、全部 Agent 内部事件流、Workbench JSON Playground

**Business Agent Public Process Events**  
Business Agent 主动公开给 Agent UI 的消息、进度、状态、Tool Activity 或其他过程事件。它们不等于 Final AgentContent，也不自动进入 Presentation Pipeline。  
_Avoid_: 把过程事件拼成业务最终结果

**Presentation Request**  
提交给 Presentation Pipeline 的 Final AgentContent，以及 Catalog、Theme / Presentation Context、Viewport 等受控展示上下文。  
_Avoid_: Business Agent 执行请求、Runtime Command

**RoutableAgentContent**  
经过 Sanitizer / Validator 后可交给 Presentation Router 的 Markdown 或 structured-data。两种输入类型都可以被 Router 决定为 Markdown 或 Generative UI Presentation。  
_Avoid_: Markdown input 等价 Markdown mode、structured input 等价 Generative UI mode

**Presentation Pipeline**  
负责 Final AgentContent → PresentationResult 的应用能力层。它清理 / 校验输入、调用 Presentation Router，并在 generative-ui Decision 时调用 UI Compiler Core。  
_Avoid_: Business Agent Runtime、过程事件解释器、Runtime 状态机

**Presentation Router**  
在 Presentation Pipeline 中决定 `markdown | generative-ui` 的模块。可以对明确场景做 deterministic decision，需要展示语义分析时才调用 Model Adapter。  
_Avoid_: Business Agent Router、多 Agent Router、按 content type 硬编码 presentation mode

**Presentation Decision**  
Router 的最终展示决策。规范联合为：

```text
markdown
or
generative-ui + UI Plan Candidate
```

只有 generative-ui 分支包含完整 UI Plan Candidate。  
_Avoid_: Business Truth、Runtime Operation Outcome

**Presentation Model**  
用于理解已经确定的业务内容并规划展示的模型能力。可以设计信息层级、组件能力偏好和布局，但不能重新决定 Business Truth。  
_Avoid_: Business Agent、业务工具执行器、trusted A2UI producer

**Model Adapter**  
Presentation Pipeline 中封装具体 Presentation Model Provider 的适配实现。返回 untrusted Presentation Decision Candidate。  
_Avoid_: Business Agent Adapter、UI Compiler Core

**UI Plan Candidate**  
Presentation Model 或确定性规划器提出的 UI 语义方案。即使 Schema 合法仍然是不可信输入。  
_Avoid_: UI IR、A2UI、trusted Presentation

**UI Compiler Core**  
校验 UI Plan Candidate 和 Component Catalog、构建 UI IR 并编译 A2UI 的框架无关核心能力。唯一可信 A2UI 生产者。  
_Avoid_: Presentation Router、Business Agent、Renderer、Runtime Kernel

**UI IR**  
UI Compiler Core 校验并规范化后的可信框架无关中间表示。  
_Avoid_: UI Plan Candidate、A2UI

**A2UI**  
当前输出的受控声明式 UI Payload。只有经过 UI Compiler Core 产生的 A2UI 才属于 trusted Presentation。  
_Avoid_: AG-UI、Runtime Surface、UI Plan Candidate

**PresentationResult**  
Presentation Pipeline 的最终可信展示结果，主要为安全 Markdown 或 trusted A2UI，以及必要状态和元数据。  
_Avoid_: Business Agent 原始执行状态、Runtime Truth

**Presentation Safety**  
平台保证业务结果只能以允许的 Markdown / Component Catalog / A2UI 能力表达，模型候选不能绕过 Compiler Trust Boundary。  
_Avoid_: 自动等同于 Action Admission / Runtime Recovery 保证

## Catalog, theme and renderer language

**Component Catalog**  
Presentation / Compiler 的 capability authority，声明允许使用的组件类型、Props Schema、nesting、Action Descriptor、能力和版本。  
_Avoid_: Theme、Component Registry、组件实现代码

**Component Registry**  
Frontend Renderer 中从受控组件类型映射到真实组件实现。  
_Avoid_: Component Catalog、模型动态组件加载器

**Theme**  
影响已授权 Presentation 能力视觉表达的受控主题配置。可以影响 Design Token、Typography、Spacing、Density、Layout Preference 和 Catalog 已允许的 Component Variant。  
Theme 不得增加 / 删除 Catalog capability、授权 Action、改变 Business Truth 或绕过 Compiler Policy。  
_Avoid_: capability authority、任意 CSS / HTML 代码注入、业务权限

**Presentation Context / Profile**  
提供给 Presentation Pipeline 的受控展示上下文。可以分别包含 `catalogRef`、`themeRef`、Viewport 和其他展示约束。  
_Avoid_: 把 Catalog capability 混入 Theme、Business Agent 私有 State

**Controlled Renderer**  
只渲染 trusted Presentation，并只使用 Component Registry 中注册实现。不得执行模型生成的任意 HTML、JavaScript、Vue 或 React 代码。  
_Avoid_: 动态代码执行器

**Reliability Validation**  
验证 Generative UI 在合法、非法、fallback、Theme 变化和基础重复生成场景下是否稳定、可解释和受控。  
当前不等于 Presentation Quality 自动评分。  
_Avoid_: 完整通用实验管理平台

## Workbench language

**Generative UI Workbench**  
真实 Agent 驱动的 Generative UI Lab。主输入是自然语言 Conversation；最终 AgentContent 由 Business Agent 产生。Workbench 可从 Presentation Inspect 查看 AgentContent、Presentation Decision、UI Plan Candidate、Validation / Compiler Result、trusted A2UI 和 Rendered UI。  
_Avoid_: AgentContent JSON Playground、Agent Runtime 管理产品、Business Agent、UI Compiler

**Presentation Inspect**  
从真实 Conversation 中某个最终 Presentation 进入的开发调试视图，用于追溯：

```text
AgentContent
→ Presentation Decision
→ UI Plan Candidate (if generative-ui)
→ Validation / Compiler Result
→ trusted A2UI
→ Rendered UI
```

_Avoid_: 完整 Runtime Turn / Operation Diagnostics 的别名

**Reference Scenario**  
用于快速驱动某类真实 Agent Conversation、Presentation 策略或 Compiler 行为的参考场景。  
_Avoid_: 以手工 AgentContent 输入替代真实 Agent、完整 Case / Regression Management 平台

## Deferred Runtime language

以下术语继续用于已有或未来 Agent Runtime Integration，当前不是 Presentation-first MVP Release Gate。

**Runtime Truth Model**  
Agent Runtime Host 在完整 Agent Runtime Integration 中对用户交互事实的权威模型。

**Runtime Repository**  
持久化 Runtime Truth 的权威存储边界。

**Runtime Thread**  
Runtime Host 管理的用户可见会话容器。

**Turn**  
用户可见会话中的稳定位置，一个 Turn 可以关联多个 Operation。

**Operation**  
Runtime Host 正式接受并执行一次工作的最小权威单位。

**Command Admission**  
Runtime Host 决定一个用户 Command 是否被正式接受的安全过程。

**Surface**  
完整 Agent Runtime Integration 中的权威交互对象。A2UI / Markdown 是展示 Payload，不等于 Surface 生命周期。

**Presentation Role**  
`current | historical`，与 Surface Interaction State 独立。

**Surface Interaction State**  
至少包含 `actionable | claimed | consumed | disabled`。

**Historical Action Authority**  
历史 Presentation 对应的旧执行授权上下文，不得通过历史 revision、旧 `runId` 或其他 stale context 直接重放。

**Recovery / Reconcile**  
完整 Agent Runtime Integration 中用于恢复权威状态或关闭 `indeterminate` 执行结果的能力。当前 Deferred。

**Runtime Diagnostics**  
用于观察 Runtime Thread / Operation / Surface / Command 的事件和 Artifact 投影。当前不定义 Presentation Core。

## Scope and governance language

**Compiler MVP 文档基线**  
原 `docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和设计文档定义的 Compiler 子系统规范。继续约束 Compiler 内部安全边界。  
_Avoid_: 仓库级当前产品范围

**平台级规范**  
`docs/platform/` 和当前有效平台 ADR 中描述仓库阶段范围、跨子系统职责和当前产品边界的文档。  
_Avoid_: Compiler 内部详细设计

**Architecture Conflict Gate**  
当新 Issue、Goal、PR 或实现与已接受 ADR / Platform Requirements / Architecture 发生实质冲突时，必须先明确标记冲突并获得架构决策，再修改实现。  
_Avoid_: 通过代码或文档静默覆盖现有架构
