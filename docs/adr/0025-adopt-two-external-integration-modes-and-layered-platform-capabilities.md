# ADR-0025：采用双外部接入模式与内部能力分层

- **状态：** 已接受
- **日期：** 2026-08-08
- **来源决策：** #185

## 背景

Generative UI Platform 的目标不是绑定某一种 Agent Framework，而是让不同成熟度的 Agent 系统都能使用平台能力。

现有架构已经明确：

- Business Agent 拥有业务推理、业务状态、Checkpoint 和业务副作用事实；
- Agent Runtime Host 是完整平台接入时的交互事实权威；
- Presentation Pipeline 将 AgentContent / 结构化业务结果投影为 Markdown 或 Generative UI；
- UI Compiler Core 是唯一可信 A2UI 生产者；
- ADR-0024 定义 Runtime Host 内部的 Thread / Turn / Operation / Surface / Command Admission、幂等和恢复语义。

早期讨论曾尝试用 Level 1–4 描述平台接入：Compiler、Presentation、Agent Runtime、Interactive Runtime。
这个模型能够表达内部能力层次，但会产生错误的产品心智：好像调用方需要逐级升级，或者“有无 Action”决定是否进入另一个 Runtime 等级。

实际接入需求主要只有两类：

1. 调用方已经拥有自己的 Agent Runtime，只缺 Generative UI / Presentation 能力；
2. 调用方只有 Business Agent，希望平台托管完整会话、交互、Action、Resume、幂等与恢复。

因此需要明确平台的外部接入模型，并区分“展示安全”与“交互执行安全”的责任边界。

## 第一性原理

### 1. 能力边界应由事实所有权决定，而不是由技术模块数量决定

平台对外如何分层，首先应回答：

> 谁拥有这件事的权威事实？

如果调用方保留自己的 Agent Runtime，那么 Thread、Action Admission、重试、Resume 和恢复事实仍由调用方负责。
平台不能因为生成了一个带 Action 的 A2UI，就自动成为这些交互事实的权威。

只有当 Agent Runtime Host 真正托管交互生命周期时，平台才有资格承诺 ADR-0024 中的 Action 幂等和恢复语义。

### 2. 生成 UI 与执行 Action 是两个不同问题

Generative UI 至少包含两类能力：

```text
业务结果
→ 如何安全地表达成 UI

用户操作
→ 如何安全地被接受和执行
```

前者属于 Presentation / Compiler；后者属于 Runtime Interaction。

因此：

> **能够生成可交互 UI，不等于平台拥有该 Action 的执行权威。**

### 3. 平台通用性来自低耦合，而不是支持更多 Framework 名称

一个已有 LangGraph、自研 Runtime、Java Agent Platform 或其他 Agent 系统，不应为了使用 Generative UI 被迫迁移会话、状态和业务执行链路。

同时，一个只有 Business Agent 的团队，也不应被迫自己重复建设 Surface 生命周期、Command 幂等、双击保护、恢复和不确定副作用处理。

因此平台必须同时支持：

- 低侵入 Presentation 接入；
- 完整 Agent Runtime 接入。

### 4. 内部能力分层与外部产品接入是两件事

UI Compiler Core、Presentation Pipeline、PlatformRunService、Runtime Kernel 需要保持清晰职责边界。
这些边界用于安全、复用、测试和演进，不意味着每一个内部层都必须成为一种产品接入模式。

## 决策

平台对外只定义两种主要接入模式：

1. **Presentation Integration**；
2. **Agent Runtime Integration**。

不再把 Level 1–4 作为正式产品接入模型。

内部继续保持能力分层。

---

## 1. Presentation Integration

### 适用对象

适用于已经拥有自己的 Agent Runtime、会话系统、工作流或业务后端，只希望使用平台 Presentation / Generative UI 能力的调用方。

```text
Existing Agent / Agent Runtime
        │
        │ AgentContent / Business Data
        ▼
Presentation Pipeline
        │
        ├── Markdown
        └── Structured Presentation
                 │
                 ▼
          UI Compiler Core
                 │
                 ▼
                A2UI
```

### 平台拥有的责任

Presentation Integration 中，平台负责：

- 校验 Presentation 输入公共契约；
- 根据 Presentation Router 决定 Markdown 或结构化展示路径；
- 对结构化展示产生不可信 UI Plan Candidate；
- 通过可信 UI Compiler Core 执行 Catalog、Props、Action Target 和结构约束；
- 只输出可信 Markdown / A2UI PresentationResult；
- 保持 Renderer 不执行模型生成的任意代码。

因此该模式承诺的是：

> **Presentation Safety Guarantee**

即业务结果如何被安全表达为平台允许的展示。

### Action 边界

Presentation Integration 可以生成包含 Button、Approval、Confirm 等 Action Descriptor 的可交互 A2UI。

但是如果调用方没有把交互托管给 Agent Runtime Host，则：

- Action Admission 由调用方 Runtime 负责；
- Action 幂等由调用方 Runtime 负责；
- Action Resume 由调用方 Runtime 负责；
- 重试、双击、断线与恢复由调用方 Runtime 负责；
- 外部副作用是否已经发生由调用方 / Business Agent 负责判断；
- ADR-0024 的 Runtime Surface / Command Admission 语义不会自动跨系统生效。

即：

```text
A2UI Action Descriptor
        ↓
Caller-owned Interaction Runtime
        ↓
Admission / Idempotency / Resume / Recovery
```

平台不得在没有控制 Action Admission 的情况下宣称该 Action 已获得 exactly-one admission 或 Runtime recovery 保证。

### 不要求

Presentation Integration 不要求调用方采用：

- Runtime Kernel；
- Runtime Repository；
- 平台 Thread / Turn / Operation；
- Platform Command Admission；
- CopilotKit；
- 平台托管会话。

---

## 2. Agent Runtime Integration

### 适用对象

适用于调用方已经有 Business Agent，但没有或不希望自行建设完整交互 Runtime 的场景。

```text
Business Agent
      │
      ▼
Agent Adapter
      │
      ▼
Agent Runtime Host
├── PlatformRunService
├── Runtime Kernel
├── Runtime Repository
├── Presentation Pipeline
├── Surface / Command Admission
├── Action / Resume
├── Idempotency
└── Recovery / Reconcile
      │
      ▼
Markdown / Interactive Generative UI
```

### 平台拥有的责任

一旦 Business Agent 采用该模式接入 Runtime Host，平台同时承担：

- Thread / Turn / Operation 生命周期；
- Surface 生命周期；
- Command Admission；
- Action 是否被平台正式接受；
- exactly-one command admission；
- Runtime 幂等记录；
- consumed Surface 不自动重新激活；
- `indeterminate` 与显式 Reconcile；
- Runtime Repository first 的恢复；
- Presentation Pipeline 与可信 A2UI 编译。

因此该模式承诺的是：

> **Presentation Safety Guarantee + Interaction Safety Guarantee**

其中 Interaction Safety 的精确定义以 ADR-0024 为准。

### Business Agent 仍然拥有业务事实

Agent Runtime Integration 不把业务事实转移给 Runtime Host。

Business Agent 仍然拥有：

- 业务推理；
- 后端工具；
- 私有 State / Checkpoint；
- 业务副作用；
- “业务上到底发生了什么”的最终事实。

Runtime Host 拥有的是：

- “这次用户操作有没有被平台正式接受”；
- “这个 Surface 是否仍可交互”；
- “哪个 Operation 正在执行或已经结束”；
- “Command 是否已被消费、重复或需要 Reconcile”。

因此继续遵循：

```text
Business Agent 决定：业务事情有没有真的发生
Runtime Host 决定：这次用户操作有没有被平台正式接受
```

---

## 3. 两种模式的保证矩阵

| 能力 / 保证 | Presentation Integration | Agent Runtime Integration |
|---|---|---|
| Markdown / Generative UI | 平台负责 | 平台负责 |
| Trusted A2UI Compilation | 平台负责 | 平台负责 |
| Catalog / Presentation Safety | 平台负责 | 平台负责 |
| Agent 会话生命周期 | 调用方负责 | Runtime Host 负责 |
| Surface 交互状态 | 调用方负责 | Runtime Host 负责 |
| Action Admission | 调用方负责 | Runtime Host 负责 |
| Command Idempotency | 调用方负责 | Runtime Host 负责 |
| Action Resume | 调用方负责 | Runtime Host 协调 Business Agent |
| Runtime Recovery | 调用方负责 | Runtime Repository 负责 |
| `indeterminate` / Reconcile | 调用方自行定义 | ADR-0024 语义 |
| 业务 State / Checkpoint | 调用方 / Business Agent | Business Agent |
| 业务副作用事实 | Business Agent / 业务系统 | Business Agent / 业务系统 |

这个矩阵是两个接入模式最重要的责任边界。

---

## 4. 内部能力继续分层

两种外部接入模式之下，平台内部保持以下逻辑层次：

```text
UI Compiler Core
        ↑
Presentation Pipeline
        ↑
PlatformRunService / Agent Interaction Service
        ↑
Runtime Kernel
```

这不是四种产品等级。

### UI Compiler Core

负责：

- 唯一可信 A2UI 生产；
- Catalog Validation；
- Component / Props / Action Target 约束；
- UI IR / A2UI 编译；
- 阻止不可信候选直接进入 Renderer。

UI Compiler Core 可以被测试、工具链或高级内部场景直接调用，但当前不把“直接 Compiler 接入”定义为主要外部产品模式。

### Presentation Pipeline

负责：

- 接收最终 AgentContent / Business Data；
- 决定 Markdown 或 Structured Presentation；
- Structured 路径调用 Presentation Model / UI Plan Candidate；
- 调用 UI Compiler Core；
- 输出可信 PresentationResult。

它既服务 Presentation Integration，也被 Agent Runtime Integration 复用。

### PlatformRunService

`PlatformRunService` 是当前 Runtime Host 的应用级执行入口和流程编排门面。
概念上可理解为 Agent Interaction Service。

它负责组织：

```text
Runtime Operation
→ Business Agent
→ AgentContent
→ Presentation
→ Runtime Projection
```

它不得拥有第二套 Runtime 状态机，也不得重新解释 Business Agent 的业务事实。

是否将代码名称改为 `AgentInteractionService` 属于后续实现命名决策，不影响本 ADR 的职责语义。

### Runtime Kernel

Runtime Kernel 是 Runtime Host 内部的交互领域核心，负责执行 ADR-0024 的：

- Runtime Truth Model；
- Operation state machine；
- Surface lifecycle；
- Command Admission；
- Idempotency；
- Runtime Repository transaction boundary；
- Recovery / Reconcile 约束。

它不是独立微服务，也不因本 ADR 自动形成新 workspace package。

---

## 5. Business Agent Adapter 是完整 Runtime 接入的扩展边界

Agent Runtime Integration 必须通过 Agent Adapter 隔离不同 Agent Framework 和传输差异。

平台的通用性不应依赖：

```text
if LangGraph
if OpenAI Agent SDK
if custom Python Agent
if Java Agent
```

而应依赖稳定的最小 Agent Contract。

方向上，Business Agent 只需要：

- 接收用户输入和必要业务上下文；
- 可选发布公开业务过程事件；
- 返回最终 `AgentContent`；
- 对可交互业务支持 Resume；
- 对可能产生不确定副作用的业务提供 Reconcile 或业务幂等能力。

具体 Adapter SPI 和公共 API Schema 后续单独定义，但不得要求 Business Agent 理解 A2UI、Vue/React、CopilotKit 或 Runtime Surface 内部状态。

---

## 6. 部署边界不由本 ADR 自动改变

ADR-0019 当前仍规定：在本仓库参考实现中，Presentation Pipeline 作为 Package 嵌入 Agent Runtime Host，不建设独立 UI Compiler Service。

本 ADR 中的 Presentation Integration 描述的是**可独立使用的能力边界**，不是自动做出的新部署决定。

因此当前不能从本 ADR 推导出：

```text
必须新增 Presentation Service
必须新增独立端口
必须重新引入 UI Compiler Service
```

Presentation Integration 的公共形态可以先是 Package API、应用内 API 或其他适配方式。
如果未来要新增独立 Presentation Service 或改变部署拓扑，必须单独进行架构决策。

---

## 7. 平台定位

基于上述边界，平台正式定位为：

> **Generative UI Platform 让任意 Business Agent 在无需感知前端框架和 A2UI 的情况下，将业务结果安全投影为 Markdown 或可交互 Generative UI；已有 Agent Runtime 的系统可以只使用 Presentation 能力，而只有 Business Agent 的系统可以接入 Runtime Host，由 Runtime Host 统一管理交互状态、Action Admission、幂等与恢复。**

更简洁的内部原则为：

```text
Agent 专注业务
Platform 负责交互
Compiler 负责可信 UI
Frontend 负责渲染
```

其中“Platform 负责交互”只在 Agent Runtime Integration / Runtime Host 托管交互时成立；Presentation Integration 的交互执行仍由调用方 Runtime 负责。

---

## 与既有 ADR 的关系

### ADR-0019

继续有效。
Presentation Pipeline 当前参考部署仍嵌入 Agent Runtime Host。
本 ADR 只新增外部能力接入语义，不自动引入独立 Presentation / Compiler Service。

### ADR-0023

继续保留其 Workbench、受控 CopilotKit UI 和 Presentation Snapshot 等仍有效边界。

### ADR-0024

继续作为 Agent Runtime Integration 的 Runtime 内部权威语义。
本 ADR 不修改 Thread / Turn / Operation / Surface / Command Admission 模型，而是明确：这些保证只有在 Runtime Host 托管交互时才能由平台承诺。

### Issue #185 原四级模型

原 Level 1–4 仅保留为历史讨论。
当前规范模型为：

```text
External Integration
├── Presentation Integration
└── Agent Runtime Integration

Internal Capability Layers
├── UI Compiler Core
├── Presentation Pipeline
├── PlatformRunService
└── Runtime Kernel
```

---

## 不采用的方案

### 方案 A：所有调用方必须完整接入 Runtime Host

不采用。

原因：

- 对已有 Agent Runtime 侵入过大；
- 为了使用 Generative UI 强迫迁移会话和业务执行系统；
- 降低平台可采用性；
- 把 Presentation 与 Interaction 不必要地耦合。

### 方案 B：把 Compiler / Presentation / Runtime / Interactive Runtime 定义为四个产品等级

不采用。

原因：

- 内部模块边界被错误暴露为产品等级；
- Level 3 与 Level 4 的差异只是 Surface 是否实际包含 Action，不应形成两种 Runtime；
- 单独直接使用 Compiler 的概率低，不值得成为主要产品心智；
- 容易让调用方误以为需要逐级升级。

### 方案 C：Presentation Integration 的 Action 也由平台保证 exactly-one admission

不采用。

原因：

- 平台没有控制调用方的 Action Admission；
- 无法权威判断双击、重试、消费和恢复；
- 会形成无法兑现的跨 Runtime 安全承诺。

---

## 后果

### 正面影响

- 已有 Agent Runtime 可以低侵入使用 Generative UI；
- 只有 Business Agent 的团队可以获得完整交互 Runtime；
- 展示安全与交互安全的责任清晰；
- Runtime Host 不再为了“通用”侵入所有外部 Agent 系统；
- Agent Adapter 成为真正的 Framework 隔离边界；
- UI Compiler Core 保持可信边界但不被过度产品化；
- 后续 SDK/API 可以围绕真实用户场景设计，而不是暴露内部模块树。

### 代价与约束

- Presentation Integration 的调用方必须自行承担 Action Admission 和恢复；
- 文档、SDK 和示例必须明确区分两种模式的保证范围；
- 不能把“生成了可交互 A2UI”表述成“平台已经保证交互不重复”；
- Presentation Pipeline 需要保持足够独立，不能依赖 Runtime Kernel 才能工作；
- Agent Runtime Integration 仍需建设稳定的 Agent Adapter Contract。

---

## 实施约束与后续工作

1. 在 `docs/platform/ARCHITECTURE.md` 中加入 Two External Integration Modes；
2. 在 `docs/platform/REQUIREMENTS.md` 中区分 Presentation Safety 与 Interaction Safety；
3. 定义 Presentation Integration 的最小公共输入/输出契约；
4. 定义不依赖 LangGraph、CopilotKit 的 Business Agent Adapter SPI；
5. Runtime Contract 继续按 ADR-0024 迁移；
6. 示例与 E2E 至少分别覆盖：
   - 已有 Agent Runtime 只使用 Presentation；
   - Business Agent 完整接入 Runtime Host；
7. 如果未来提出独立 Presentation Service、新的部署端口或独立 Runtime Kernel Package，必须单独评审，不由本 ADR 自动授权。
