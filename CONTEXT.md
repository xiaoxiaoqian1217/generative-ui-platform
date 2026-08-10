# Generative UI Platform

本上下文定义 ADR-0027 下的仓库级统一领域语言。

## Current product language

**Generative UI Platform**:
当前阶段是与 Agent Framework 解耦的 Generative UI Presentation Engine，以及用于验证其质量、可靠性和安全性的开发工具链。
核心价值是把最终 AgentContent 转换为可信 Presentation。
_Avoid_: 完整 Agent Runtime Platform、CopilotKit 产品封装、任意前端代码生成器

**Current North Star**:
将 Business Agent 或已有 Agent Runtime 产生的 Markdown / structured AgentContent，转换为美观、可靠、主题一致且受控的 Presentation。
_Avoid_: 以 Conversation、Runtime Repository 或多 Agent Gateway 作为当前 North Star

**Presentation Integration**:
ADR-0025 定义的当前唯一 Active Product Track。
调用方保留自己的 Agent Runtime / Business Runtime，只使用平台的 Presentation / Generative UI 能力。
_Avoid_: 要求调用方迁移 Thread、Checkpoint、Action Admission 或会话系统

**Agent Runtime Integration**:
ADR-0025 定义的长期第二种接入模式。
平台托管 Thread、Turn、Operation、Surface、Command Admission、Recovery 等 Interaction Runtime 能力。
当前由 ADR-0027 标记为 Deferred。
_Avoid_: 当前 Presentation-first MVP Release Gate

**Core**:
当前直接定义产品价值的能力集合。
包含 Presentation Contract、Presentation Router、Presentation Model Adapter、UI Plan Candidate、UI Compiler Core、Component Catalog、Theme / Presentation Context、trusted Presentation 和 Reliability Evaluation。
_Avoid_: CopilotKit、Runtime Repository、完整 Conversation Service

**Supporting Integration**:
用于接入、调试、演示和验证 Core 的能力。
当前包括 Generative UI Workbench、Agent Runtime Host、CopilotKit / AG-UI、Business Agent Adapter、Reference Business Agent、Reference Scenarios 和开发 E2E。
_Avoid_: 反向定义 Generative UI Core

**Deferred Runtime Platform**:
当前保留设计与已有实现、但停止扩张的 Agent Runtime 能力。
包括 Runtime Thread / Turn / Operation、Runtime Repository、Surface Lifecycle、Command Admission、Runtime-owned Conversation History、Recovery / Reconcile 和 Runtime Truth Diagnostics。
_Avoid_: 当前功能开发默认方向

## Business and presentation language

**Business Agent**:
拥有业务推理、后端工具、业务 State / Checkpoint、业务副作用语义和最终业务结果的 Agent。
它不负责 UI Plan、A2UI、前端组件或布局实现。
_Avoid_: UI Compiler Agent、A2UI Agent、Presentation Model

**AgentContent**:
Business Agent 或已有 Agent Runtime 最终提交给 Presentation Pipeline 的业务内容。
当前允许 Markdown 或 structured business data。
_Avoid_: UI Plan Candidate、A2UI、全部 Agent 内部事件流

**Business Truth**:
业务上真实发生了什么的权威事实。
由 Business Agent 或业务系统拥有。
Presentation Model、UI Compiler、Workbench 和 Renderer 不得修改 Business Truth。
_Avoid_: Presentation Decision、UI 展示状态

**Presentation Request**:
提交给 Presentation Pipeline 的最终 AgentContent，以及 Catalog、Theme / Presentation Context、Viewport 等受控展示上下文。
_Avoid_: Business Agent 执行请求、Runtime Command

**Presentation Pipeline**:
负责最终 AgentContent → PresentationResult 的应用能力层。
Markdown 默认形成安全 Markdown PresentationResult。
Structured AgentContent 才进入 Presentation Model 和 Generative UI 编译链路。
_Avoid_: Business Agent Runtime、过程事件解释器、Runtime 状态机

**Presentation Router**:
在 Presentation Pipeline 中决定 Markdown 或 Generative UI 路径的模块。
_Avoid_: Business Agent Router、多 Agent Router、UI Compiler Core

**Presentation Model**:
用于理解已经确定的业务内容并规划展示的模型能力。
它可以设计信息层级、组件能力和布局，但不能重新决定 Business Truth。
_Avoid_: Business Agent、业务工具执行器、trusted A2UI producer

**Model Adapter**:
Presentation Pipeline 中封装具体 Presentation Model Provider 的适配实现。
它返回不可信 Presentation Decision / UI Plan Candidate。
_Avoid_: Business Agent Adapter、UI Compiler Core

**Presentation Decision**:
Presentation Router / Model 对最终展示路径的决策结果。
它可以选择 Markdown 或 Generative UI，并附带必要的展示元数据。
_Avoid_: Business Truth、Runtime Operation Outcome

**UI Plan Candidate**:
Presentation Model 或确定性规划器提出的 UI 语义方案。
即使 Schema 合法，它仍然是不可信输入。
_Avoid_: UI IR、A2UI、trusted Presentation

**UI Compiler Core**:
校验 UI Plan Candidate 和 Component Catalog、构建 UI IR 并编译 A2UI 的框架无关核心能力。
它是唯一可信 A2UI 生产者。
_Avoid_: Presentation Router、Business Agent、Renderer、Runtime Kernel

**UI IR**:
UI Compiler Core 校验并规范化后的可信框架无关中间表示。
_Avoid_: UI Plan Candidate、A2UI

**A2UI**:
Generative UI Compiler 当前输出的受控声明式 UI Payload。
只有经过 UI Compiler Core 产生的 A2UI 才属于 trusted Presentation。
_Avoid_: AG-UI、Runtime Surface、UI Plan Candidate

**PresentationResult**:
Presentation Pipeline 的最终可信展示结果。
当前主要包含安全 Markdown 或 trusted A2UI，以及必要的状态和元数据。
_Avoid_: Business Agent 原始执行状态、Runtime Truth

**Presentation Safety**:
平台保证业务结果只能以允许的 Markdown / Component Catalog / A2UI 能力表达，并且模型候选不能绕过 Compiler Trust Boundary。
这是当前 Presentation-first 阶段的主要安全保证。
_Avoid_: 自动等同于 Action Admission / Runtime Recovery 保证

## Catalog, theme and renderer language

**Component Catalog**:
声明 Presentation / Compiler 可以使用的组件类型、语义、Schema、约束、Action Descriptor 能力和版本。
_Avoid_: Component Registry、组件实现代码

**Component Registry**:
Frontend Renderer 中从受控组件类型映射到真实组件实现的能力。
_Avoid_: Component Catalog、模型动态组件加载器

**Theme**:
影响 Generative UI 视觉表达的受控主题配置。
Theme 可以影响 Design Token、Component Variant、Density、Typography、Spacing 和布局偏好。
Theme 不得改变 Business Truth 或绕过 Compiler Policy。
_Avoid_: 任意 CSS / HTML 代码注入、业务权限

**Presentation Context**:
提供给 Presentation Pipeline 的受控展示上下文。
可以包含 Theme、Viewport、设备类型、Catalog 能力摘要和其他明确声明的展示约束。
_Avoid_: Business Agent 私有 State、Provider 系统提示词

**Controlled Renderer**:
只渲染 trusted Presentation，并且只使用 Component Registry 中注册实现的 Renderer。
它不得执行模型生成的任意 HTML、JavaScript、Vue 或 React 代码。
_Avoid_: 动态代码执行器

**Reliability Evaluation**:
验证 Generative UI 在合法、非法、fallback、Theme 变化和重复生成场景下是否稳定、可解释和受控的工程能力。
_Avoid_: 完整通用实验管理平台

## Workbench language

**Generative UI Workbench**:
Generative UI Lab / 可视化开发调试工作台。
它用于查看 AgentContent、Presentation Decision、UI Plan Candidate、Validation / Compiler Result、trusted A2UI、Rendered UI、Theme、Catalog、Viewport 和 Reliability 结果。
_Avoid_: 当前阶段的 Agent Runtime 管理产品、Business Agent、UI Compiler

**Generative UI Lab**:
Workbench 当前的产品心智。
目标是让生成式 UI 的质量问题可以被观察、比较、复现和定位。
_Avoid_: Conversation Service、Runtime Repository 管理台

**Reference Scenario**:
用于快速验证某类业务内容、Presentation 策略或 Compiler 行为的确定性或半确定性输入场景。
_Avoid_: 完整 Case / Regression Management 平台

**Compare**:
在相同 AgentContent 下比较 Theme、Model、Prompt / Model Config、Catalog、Viewport 或重复生成结果的 Workbench 能力。
_Avoid_: 通用 A/B 实验平台

## Supporting framework language

**Agent Runtime Host**:
当前是 Reference Integration Host。
它可以承载 CopilotKit / AG-UI 参考入口、Business Agent Adapter、服务端 Presentation Model 凭据和 Embedded Presentation Pipeline。
已有 Runtime Kernel / Repository 等实现属于 Deferred Runtime Platform。
_Avoid_: Generative UI Core、当前产品 North Star

**Business Agent Adapter**:
隔离具体 Business Agent 私有协议与参考 Integration Host 的适配层。
它只做契约校验、关联标识和协议映射，不总结、改写或重新解释 Business Truth。
_Avoid_: Model Adapter、Presentation Model、业务内容加工器

**Reference Business Agent**:
用于真实 AgentContent 和集成链路验证的参考业务 Agent。
它不是 Generative UI Core 的组成部分。
_Avoid_: UI Compiler Agent、产品必须依赖的 Agent Framework

**AG-UI**:
当前 Workbench ↔ Agent Runtime Host 参考 Agent Integration 使用的应用协议。
ADR-0026 继续约束这条 Supporting 路径。
AG-UI 不是 Presentation Core 的强制协议。
_Avoid_: Generative UI Platform 唯一外部接入协议

**CopilotKit Runtime**:
当前 Reference Integration Host 中的 Supporting Framework dependency。
它可以提供当前 AG-UI 入口，但不得定义 Presentation Pipeline、UI Compiler Core、Catalog 或 Theme 的语义。
_Avoid_: Generative UI Core、不可替换产品边界

**Transport**:
HTTP、SSE、WebSocket 或未来其他传输机制。
Transport 不定义 Generative UI Core 语义。
_Avoid_: 把 HTTP / WebSocket 当作与 AG-UI 同层级的业务协议

## Deferred Runtime language

以下术语继续用于已有或未来 Agent Runtime Integration。
它们当前不是 Presentation-first MVP Release Gate。

**Runtime Truth Model**:
Agent Runtime Host 在完整 Agent Runtime Integration 中对用户交互事实的权威模型。
包含 Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot。

**Runtime Repository**:
持久化 Runtime Truth 的权威存储边界。
它不是 Diagnostic Store 的别名。

**Runtime Thread**:
Runtime Host 管理的用户可见会话容器。

**Turn**:
用户可见会话中的稳定位置。
一个 Turn 可以关联多个 Operation。

**Operation**:
Runtime Host 正式接受并执行一次工作的最小权威单位。

**Command Admission**:
Runtime Host 决定一个用户 Command 是否被正式接受的安全过程。
它包含幂等、revision、Surface 状态和并发控制。

**Surface**:
完整 Agent Runtime Integration 中的权威交互对象。
A2UI / Markdown 是展示 Payload，不等于 Surface 生命周期。

**Presentation Role**:
`current | historical`。
它与 Surface Interaction State 独立。

**Surface Interaction State**:
至少包含 `actionable | claimed | consumed | disabled`。

**Historical Action Authority**:
历史 Presentation 对应的旧执行授权上下文。
它不得通过历史 revision、旧 `runId` 或其他 stale context 被直接重放。

**Recovery / Reconcile**:
完整 Agent Runtime Integration 中用于恢复权威状态或关闭 `indeterminate` 执行结果的能力。
当前 Deferred。

**Runtime Diagnostics**:
用于观察 Runtime Thread / Operation / Surface / Command 的事件和 Artifact 投影。
它不定义当前 Presentation Core，也不替代 Runtime Repository。

## Scope and governance language

**Compiler MVP 文档基线**:
原 `docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和设计文档定义的 Compiler 子系统规范。
这些文档继续保留，并继续约束 Compiler 内部安全边界。
_Avoid_: 仓库级当前产品范围

**平台级规范**:
`docs/platform/` 和当前有效平台 ADR 中描述仓库阶段范围、跨子系统职责和当前产品边界的文档。
_Avoid_: Compiler 内部详细设计

**Architecture Conflict Gate**:
任何后续文档、Goal、Issue、PR 或实现与当前有效 ADR、平台需求或平台架构发生实质冲突时，必须先报告冲突并获得用户/架构决策者确认后才能改变架构语义。
_Avoid_: 静默覆盖、以实现事实反向修改架构、一次确认外推全部冲突
