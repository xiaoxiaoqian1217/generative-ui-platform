# Generative UI Platform 平台级需求

**适用范围：** 整个仓库。

**当前阶段：** Presentation-first Generative UI。

**权威范围决策：** ADR-0027。

本文定义平台级范围，不替代或删除现有 Compiler MVP 文档。
`docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 继续作为 Generative UI Compiler 子系统基线。

## 1. 建设背景

Generative UI Platform 最初要解决的问题是：

> Business Agent 输出业务内容后，平台如何通过 Presentation Intelligence 自动生成美观、可靠、主题一致且受控的 UI。

仓库后续加入了 Agent Runtime Host、CopilotKit、AG-UI、Conversation、Runtime Repository、Thread / Turn / Operation、Surface Lifecycle、Command Admission、Recovery 和 Diagnostics。
这些能力可以解决完整 Agent Runtime Integration 问题。
但它们不是证明 Generative UI Presentation 能力成立的必要前提。

当前阶段因此回归最短价值链：

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

## 2. 平台定位

Generative UI Platform 当前定位为：

> **与 Agent Framework 解耦的 Generative UI Presentation Engine，以及用于验证其质量、可靠性和安全性的开发工具链。**

平台负责把 Business Agent 或已有 Agent Runtime 产生的最终业务内容转换为可信 Presentation。
平台不要求 Business Agent 理解 A2UI、Component Catalog、前端组件或 Generative UI。
平台也不要求调用方采用 CopilotKit、AG-UI 或平台托管会话。

当前平台优先承诺 **Presentation Safety**。
完整 Interaction Safety 只属于未来或已有的 Agent Runtime Integration 路径。

## 3. 当前 North Star

当前 North Star 是：

> 将 Markdown / structured AgentContent 转换为语义正确、视觉合理、主题一致、可验证且受控的 Presentation。

当前阶段所有新增功能必须至少直接提升以下一项：

1. `AgentContent → Presentation` 的语义正确性；
2. 生成 UI 的视觉质量；
3. Theme / Presentation Context 下的一致性；
4. 模型输出到 trusted A2UI 的安全性和可靠性；
5. Generative UI 的可调试、可比较、可评测能力；
6. 为 Core 提供必要且最小的 Framework / Runtime Integration。

主要解决通用 Agent Runtime、Conversation Service、Workflow Recovery 或 Runtime Observability 的能力默认属于 Deferred。

## 4. 当前 Active Core

当前 Core 必须支持：

- AgentContent / Presentation Contract；
- Markdown 与 structured business data 两类最终输入；
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

### 4.1 Business Agent 输出边界

Business Agent 负责：

- 业务推理；
- 后端工具；
- 业务 State / Checkpoint；
- 业务副作用语义；
- 最终业务结果。

Business Agent 的最终 AgentContent 只能是：

- Markdown；
- structured business data。

Business Agent MUST NOT 输出：

- UI Plan Candidate；
- A2UI；
- HTML；
- Vue / React 代码；
- Component Catalog 选择；
- 前端布局实现。

### 4.2 Presentation Pipeline

Presentation Pipeline 负责最终业务结果到 Presentation 的转换。

Markdown AgentContent 默认直接形成安全 Markdown PresentationResult。

Structured AgentContent 进入：

```text
Presentation Router
→ Presentation Model
→ untrusted UI Plan Candidate
→ UI Compiler Core
→ trusted A2UI PresentationResult
```

Presentation Model 可以理解业务内容并选择展示结构。
Presentation Model MUST NOT 重新决定业务事实。
Presentation Model MUST NOT 执行业务工具或业务副作用。
Presentation Model 输出始终是不可信候选。

### 4.3 UI Compiler Core

UI Compiler Core 是唯一可信 A2UI 生产者。

UI Compiler Core 必须保持：

- Agent Framework 中立；
- Transport 中立；
- 模型供应商中立；
- 前端框架中立；
- 不执行模型生成代码；
- 不负责业务推理；
- 不负责 Presentation Mode 选择。

UI Compiler Core 必须基于运行时 Schema、Component Catalog、Props、Binding、Action Descriptor 和安全 Policy 验证候选。
非法候选必须失败或显式降级，不得直接进入 Renderer。

### 4.4 Theme / Presentation Context

Theme 属于当前产品主线，而不是装饰性附属能力。

平台必须允许 Presentation 在不改变业务事实的前提下，根据受控 Theme / Presentation Context 产生不同视觉表达。

Theme / Presentation Context 可以影响：

- 可用组件能力；
- 视觉密度；
- 布局偏好；
- 组件变体；
- Typography / spacing 等受控 design token；
- Viewport / device context。

Theme MUST NOT 改变业务数据语义或绕过 Compiler 安全约束。

Theme / Presentation Context 的稳定公共 Contract 需要独立设计和验收。

### 4.5 Reliability Evaluation

平台当前必须把“生成结果是否可靠”作为一等工程问题。

至少需要能够验证：

- 同一输入是否稳定得到合法结果；
- 是否出现不存在的组件；
- Props 是否满足 Contract；
- Binding 是否引用有效数据；
- Action Descriptor 是否符合 Catalog / Policy；
- 非法 UI Plan 是否被 Compiler 拒绝；
- Presentation Model 失败时 fallback 是否明确；
- 不同 Theme 下业务语义是否保持一致；
- Renderer 是否可以稳定渲染 trusted A2UI。

具体 reliability 指标体系可以分阶段建设。

## 5. Generative UI Workbench

Generative UI Workbench 当前定位为：

> **Generative UI Lab / 可视化开发调试工作台。**

Workbench 的核心用户任务是：

1. 输入或选择 AgentContent / Reference Scenario；
2. 触发 Presentation；
3. 查看 Presentation Decision；
4. 查看 UI Plan Candidate；
5. 查看 Validation / Compiler Result；
6. 查看 A2UI；
7. 查看最终 Renderer；
8. 切换 Theme / Catalog / Viewport；
9. 比较不同模型、配置或主题的输出；
10. 验证 fallback、非法候选和稳定性场景。

Workbench 不得成为 Business Agent、UI Compiler 或业务工具执行器。

Workbench 当前 MVP 不要求：

- Conversation-first 产品体验；
- Runtime-owned Conversation History；
- Runtime Host 重启恢复；
- Thread / Turn / Operation 产品化；
- Surface Lifecycle 产品化；
- Command Admission 产品化；
- 完整 Runtime Diagnostics；
- Diagnostic Bundle 产品化。

现有相关页面和代码可以在迁移期保留。
但它们不得继续成为当前 Workbench Release Gate。

## 6. Supporting Integration

以下能力保留为 Supporting：

- Agent Runtime Host；
- CopilotKit Runtime；
- AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- HTTP / SSE / WebSocket Transport；
- Reference Scenarios；
- 开发环境和 E2E。

Supporting Integration 的目标是：

- 提供真实 AgentContent 来源；
- 提供服务端 Presentation Model 凭据边界；
- 提供可运行的参考接入链路；
- 验证 Framework Adapter 不污染 Core；
- 验证 Core 在真实应用中的可嵌入性。

Supporting Integration MUST NOT 反向定义 Generative UI Core 的产品边界。

## 7. Agent Runtime Host 当前边界

`apps/agent-runtime-host` 当前保留为参考 Integration Host。

当前允许它继续：

- 承载 CopilotKit Runtime / AG-UI 参考入口；
- 通过 Business Agent Adapter 接入 Reference Business Agent；
- 在服务端持有 Presentation Model Provider 凭据；
- 组装 Presentation Pipeline；
- 提供 Workbench 和 E2E 所需的参考服务；
- 保留已有 Runtime Platform 路径的兼容和安全行为。

当前阶段禁止无新决策继续扩大：

- Thread / Turn / Operation 产品模型；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Reconcile；
- Runtime Recovery；
- 完整 Conversation Service；
- 完整 Diagnostic Platform。

现有这些代码继续存在期间，仍必须遵守 ADR-0024 的安全不变量。

## 8. Deferred Runtime Platform

ADR-0025 定义的 Agent Runtime Integration 保留为长期能力。

以下能力当前 Deferred：

- Runtime Thread；
- Turn；
- Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Runtime-owned Conversation History；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- exactly-one Command Admission 保证。

只有当未来明确需要平台拥有 Stateful Interaction 和 Action Execution Authority 时，才恢复这部分产品化工作。

如果未来恢复，ADR-0024 继续作为 Runtime Truth 和 Interaction Safety 的基础。

## 9. Framework Independence

Generative UI Core 不得依赖 CopilotKit 或 AG-UI 才能成立。

当前允许的集成形态包括但不限于：

- Package embedding；
- Reference Integration Host；
- CopilotKit / AG-UI Adapter；
- LangGraph Integration；
- 自研 Runtime Adapter；
- 未来 REST API。

Presentation Integration 的稳定公共 API 形态必须通过独立决策确定。
本文不自动重新引入独立 UI Compiler Service。

## 10. 当前非目标

当前阶段不主动建设：

- 完整 Agent Runtime Platform；
- 完整 Conversation Service；
- Runtime Thread / Operation 产品化；
- Runtime Repository 产品化；
- Surface / Command Admission 新能力；
- Reconcile 和复杂 Runtime Recovery；
- 完整 Observability / Diagnostic Platform；
- Interaction Gateway；
- 多 Business Agent 自动路由；
- 多 Agent 自主协同；
- 真实设备控制；
- 生产级多租户、细粒度权限、审计和计费；
- 保存 Business Agent 私有 State、Checkpoint 或完整内部推理轨迹；
- 任意 HTML、JavaScript、Vue 或 React 代码生成；
- 完整 A2UI 全规范迁移。

## 11. 当前 MVP Release Gate

当前 MVP 必须证明：

### G1 AgentContent Contract

- Markdown 与 structured business data 输入边界明确；
- Business Agent 不需要理解 UI；
- 非法输入有稳定错误结果。

### G2 Presentation Intelligence

- Markdown 路径明确；
- structured content 可以进入 Presentation Model；
- Presentation Model 不重写业务事实；
- Presentation Decision 可以被观察和调试。

### G3 Trusted Compilation

- UI Plan Candidate 始终是不可信输入；
- Component Catalog 和 Policy 可验证；
- 非法 Props / Binding / Action 被拒绝；
- UI Compiler Core 是唯一可信 A2UI 生产者。

### G4 Rendering Quality

- trusted A2UI 可以被受控 Renderer 稳定渲染；
- Markdown 安全展示；
- fallback 状态明确；
- 不执行任意模型生成代码。

### G5 Theme / Context

- 至少能够验证不同 Theme / Presentation Context；
- Theme 不改变业务事实；
- Theme 不绕过 Catalog / Compiler 安全边界。

### G6 Workbench / Reliability

- Workbench 可以观察 AgentContent、Decision、UI Plan、Validation、A2UI 和最终 UI；
- 可以验证合法、非法、fallback 和稳定性场景；
- 可以用于定位 Generative UI 生成质量问题。

### G7 Framework Independence

- Core Packages 不依赖 CopilotKit、AG-UI 或具体 Business Agent；
- 当前参考 Integration 可以替换而不改变 Presentation Core 语义。

## 12. 验证要求

Documentation-only 修改必须通过 `pnpm docs:check`。

Core 代码修改至少需要：

```bash
pnpm check:boundaries
pnpm typecheck
pnpm test
pnpm build
```

Workbench 修改需要执行对应单元测试和浏览器验证。

Runtime Platform Deferred 区域只在维护现有兼容或安全行为时修改。
新增 Runtime Platform 功能必须先有新的明确范围授权。
