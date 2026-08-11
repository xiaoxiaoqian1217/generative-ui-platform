# Generative UI Platform 平台级需求

**适用范围：** 整个仓库。

**当前阶段：** Presentation-first Generative UI。

**权威范围决策：** ADR-0027。

本文定义平台级 MUST / MUST NOT，不替代 Compiler 子系统基线。
`docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md`、`docs/Generative_UI_Compiler_Design.md` 和对应 Compiler ADR 继续约束 Compiler 内部信任与编译边界。

## 1. 产品问题

当前平台只优先解决一个核心问题：

> 用户通过真实 Agent Conversation 获得业务结果后，平台如何把 Business Agent 的最终 AgentContent 自动转换为可靠、主题一致且受控的 Presentation。

当前主链路：

```text
User
  ↓ natural language
Workbench / Business Frontend
  ↓ Agent interaction
Business Agent / Existing Agent Runtime
  ↓ Final AgentContent
Presentation Pipeline
  ↓ Presentation Decision
  ├── markdown
  └── generative-ui
          ↓
     UI Plan Candidate
          ↓
     UI Compiler Core
          ↓
     trusted A2UI
          ↓
     Controlled Renderer
```

Business Agent 不负责 UI Plan、A2UI、前端组件或布局实现。

## 2. 当前 North Star

> 将 Business Agent 或已有 Agent Runtime 产生的最终 AgentContent，转换为可靠、主题一致且受控的 Presentation，并通过真实 Agent Conversation 验证这条链路。

当前新增功能必须至少直接提升以下一项：

1. `AgentContent → Presentation` 的语义正确性；
2. Theme / Presentation Context 一致性；
3. 模型候选到 trusted A2UI 的安全性和可靠性；
4. 真实 Agent 驱动 Generative UI 的可调试、可比较、可验证能力；
5. Core 所必需的最小 Framework / Runtime Integration。

主要解决长期 Conversation Service、Runtime Repository、Workflow Recovery 或 Runtime Observability Platform 的能力默认 Deferred。

## 3. 当前产品分层

### 3.1 Active Core

当前 Core 包括：

- AgentContent / Presentation Contract；
- Presentation Router；
- Presentation Decision；
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Validation / Policy / Binding / Action Descriptor 约束；
- trusted A2UI / PresentationResult；
- Controlled Renderer contract；
- Theme / Presentation Context；
- Generative UI reliability validation。

当前不要求 Presentation Quality 自动评分体系。

### 3.2 Supporting

以下能力用于接入、验证和演示 Core：

- Generative UI Workbench；
- 真实 Agent Conversation reference experience；
- Agent Runtime Host；
- CopilotKit Runtime；
- AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- HTTP / SSE / WebSocket Transport；
- Reference Scenarios；
- Development / E2E tooling。

Supporting MUST NOT 反向定义 Core 产品边界。

### 3.3 Deferred Runtime Platform

以下能力保留既有设计和实现，但当前停止扩张：

- Runtime Thread / Turn / Operation 产品语义；
- Runtime Repository；
- Surface Lifecycle 产品化；
- Command Admission 产品化；
- Runtime-owned long-term Conversation History；
- Conversation Rename / Archive / Delete；
- Runtime Host restart recovery；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- 完整 Agent Runtime Platform。

ADR-0024 继续约束仍存在的 Runtime Integration 路径。
Scope Reset 不允许降低既有 Action / Surface / Command 安全边界。

## 4. Business Agent 边界

Business Agent 负责：

- 用户业务意图理解；
- 业务推理；
- 后端工具；
- 业务 State / Checkpoint；
- 业务副作用语义；
- 最终业务结果。

Business Agent 最终向 Presentation Pipeline 提供 AgentContent。

AgentContent MAY 是：

- Markdown；
- structured business data。

Business Agent MUST NOT 输出：

- UI Plan Candidate；
- A2UI；
- HTML；
- Vue / React 代码；
- Component Catalog 选择；
- 前端布局实现。

Business Agent Adapter MUST NOT 总结、改写、重新解释或重新决定 Business Truth。

## 5. Presentation Pipeline

Presentation Pipeline 负责最终 AgentContent → PresentationResult。

### 5.1 输入处理

进入 Router 前必须：

- 对 Markdown 执行既有 Sanitizer 安全边界；
- 对 structured data 执行 Contract Validation / safe serialization；
- 加载并验证当前 Component Catalog；
- 建立受控 Presentation Context。

### 5.2 Router 语义

ADR-0015 继续作为 Presentation Router / Model Adapter 的权威语义。

Markdown 与 structured data 都是 `RoutableAgentContent`。

Presentation Router MUST：

- 对明确场景允许确定性决策；
- 仅在需要展示语义分析时调用 Presentation Model Adapter；
- 最终产生 `markdown | generative-ui` Presentation Decision；
- 仅在 `generative-ui` 分支携带完整 UI Plan Candidate。

平台 MUST NOT 把输入类型直接等同为展示模式。

禁止写成：

```text
Markdown => always markdown
Structured data => always model => generative-ui
```

### 5.3 Presentation Model

Presentation Model MAY：

- 理解已经确定的业务内容；
- 规划信息层级；
- 建议 Catalog 允许范围内的组件能力；
- 规划布局；
- 根据 Theme / Viewport 调整展示方案。

Presentation Model MUST NOT：

- 修改 Business Truth；
- 执行业务工具；
- 产生受信任 A2UI；
- 绕过 Component Catalog；
- 输出任意可执行前端代码。

Model Adapter 输出始终是不可信候选，并必须经过 Presentation Decision Schema 校验。

## 6. UI Compiler Core

UI Compiler Core 是唯一可信 A2UI 生产者。

它必须保持：

- Agent Framework 中立；
- Transport 中立；
- Provider 中立；
- Frontend Framework 中立；
- deterministic validation；
- explicit failure / fallback；
- no model-generated code execution。

UI Compiler Core 必须验证：

- Runtime Schema；
- Component Catalog identity；
- Component capability；
- Props；
- Binding；
- Action Descriptor；
- Policy；
- 结构和 nesting constraints。

非法候选必须失败或显式降级，不得直接进入 Renderer。

## 7. Component Catalog 与 Theme

### 7.1 Component Catalog

Component Catalog 是 capability authority，回答：

> 当前 Presentation 可以使用什么组件和 Action 能力？

Catalog 必须独立于 Theme 管理和版本化。

### 7.2 Theme

Theme 回答：

> Catalog 已允许的能力应该以什么视觉风格表达？

Theme MAY 影响：

- design tokens；
- typography；
- spacing；
- density；
- layout preferences；
- Catalog 已授权范围内的 component variants。

Theme MUST NOT：

- 增加或删除 Catalog capability；
- 授权新的 Action；
- 绕过 Compiler Policy；
- 改变 Business Truth。

如果需要同时配置 Catalog 与 Theme，应由 Presentation Context / Profile 分别携带 `catalogRef` 与 `themeRef`。

## 8. Generative UI Workbench

Workbench 当前定位为：

> **Generative UI Lab / 真实 Agent 驱动的可视化开发调试工作台。**

### 8.1 主输入

Workbench 的主输入 MUST 是用户自然语言，而不是手工 AgentContent JSON。

主流程：

```text
Natural language
→ Business Agent
→ Final AgentContent
→ Presentation Pipeline
→ Generated Presentation
```

AgentContent 是可观察的中间边界。
Workbench MAY 在 Inspect 中显示 AgentContent，但手工粘贴 AgentContent 不属于当前核心用户任务。

Fixture / unit test / dedicated test harness MAY 直接构造 AgentContent。

### 8.2 主体验

Workbench 当前应支持：

- 用户自然语言输入；
- 当前 Reference Agent Integration；
- Business Agent 公开过程信息；
- 最终 Markdown / Generative UI Presentation；
- 从 Presentation 打开 Inspect；
- Inspect AgentContent；
- Inspect Presentation Decision；
- Inspect UI Plan Candidate；
- Inspect Validation / Compiler Result；
- Inspect trusted A2UI；
- 查看 Rendered UI；
- Theme / Catalog / Viewport 开发调试；
- fallback / invalid candidate / basic reliability 场景。

### 8.3 Conversation 边界

真实 Conversation 是当前 Workbench Supporting Core Experience，不属于 Deferred。

以下完整 Conversation Platform 能力当前 Deferred：

- long-term Conversation History；
- Rename / Archive / Delete；
- Runtime-owned History；
- Runtime Host restart recovery；
- Thread / Turn / Operation 产品浏览；
- 完整 Conversation Service。

Workbench MUST NOT：

- 成为 Business Agent；
- 重新解释 Business Truth；
- 自己调用模型生成第二份 UI Plan；
- 绕过 Presentation Pipeline；
- 绕过 UI Compiler Core；
- 把 UI Plan Candidate 当作 trusted A2UI；
- 执行模型生成任意 HTML / JavaScript；
- 持有 Presentation Model Provider credentials。

## 9. Agent Runtime Host 当前边界

`apps/agent-runtime-host` 当前是 **Reference Integration Host**。

它 MAY 继续：

- 承载 CopilotKit Runtime / AG-UI 参考入口；
- 为 Workbench 提供真实 Agent Conversation；
- 通过 Business Agent Adapter 接入 Reference / Remote Business Agent；
- 在服务端持有 Presentation Model credentials；
- 组装 Presentation Pipeline；
- 把最终 AgentContent 送入 Presentation Pipeline；
- 为 Workbench / E2E 提供可运行服务；
- 保持既有 Runtime Integration 的安全行为。

它当前 MUST NOT 因为已有代码存在而继续扩大 Deferred Runtime Platform。

## 10. Framework independence

Generative UI Core MUST NOT 依赖 CopilotKit、AG-UI 或特定 Business Agent 才能成立。

当前 Reference Integration 可以使用：

```text
Workbench ↔ Runtime Host
Application protocol: AG-UI
Transport: HTTP POST + SSE
```

ADR-0026 继续约束这条 Supporting Reference Path。

未来可以通过 Package API、REST、AG-UI / CopilotKit、LangGraph 或自研 Runtime Adapter 接入 Presentation Core。
稳定公共 API 形态需要独立 ADR。

## 11. 当前 MVP Release Gate

### G1 Real Agent Conversation

- Workbench 可以输入自然语言；
- 可以驱动 Reference / Real Business Agent；
- Business Agent 公开过程与最终 AgentContent 能被区分；
- 不要求 Business Agent 理解 Generative UI。

### G2 Presentation Routing

- Markdown 和 structured data 均可进入 Router；
- Router 可以确定性决策；
- 只有需要语义分析时才调用 Presentation Model；
- Decision 正确区分 `markdown | generative-ui`。

### G3 Trusted Compilation

- UI Plan Candidate 始终不可信；
- Catalog、Props、Binding、Action / Policy 可验证；
- 非法候选被拒绝；
- UI Compiler Core 是唯一可信 A2UI 生产者。

### G4 Rendering

- Markdown 安全展示；
- trusted A2UI 使用受控 Renderer 稳定展示；
- fallback / error 状态明确；
- 不执行模型生成代码。

### G5 Theme / Catalog Boundary

- Theme 与 Catalog capability authority 分离；
- Theme 不改变 Business Truth；
- Theme 不新增组件或 Action 权限。

### G6 Workbench Inspect / Reliability

- 从真实 Conversation 可以查看 AgentContent、Decision、UI Plan、Validation、A2UI 和最终 UI；
- 可以验证合法、非法、fallback 和基础重复生成场景；
- 可以定位问题发生在 AgentContent、Router / Model、Compiler 还是 Renderer。

### G7 Framework Independence

- Core Packages 不依赖 CopilotKit / AG-UI / 具体 Business Agent；
- Reference Integration 可替换而不改变 Presentation Core 语义。

## 12. 当前非目标

当前阶段不主动建设：

- 手工 AgentContent JSON Playground 作为 Workbench 核心体验；
- Presentation Quality 自动评分体系；
- 完整 Agent Runtime Platform；
- 完整长期 Conversation Service；
- Runtime Repository 产品化；
- Surface / Command Admission 新能力；
- Reconcile 和复杂 Runtime Recovery；
- 完整 Observability / Diagnostic Platform；
- Interaction Gateway；
- 多 Business Agent 自动路由；
- 多 Agent 自主协同；
- 真实设备控制；
- 生产级多租户、权限、审计和计费；
- 任意 HTML、JavaScript、Vue 或 React 代码生成。

## 13. 迁移与验证要求

本次 Scope Reset 不要求立即删除 Runtime Platform 代码。

后续按以下原则执行：

1. 停止新增 Deferred Runtime 功能；
2. 保持 `Natural Language → Business Agent → AgentContent → Presentation` 主链路可运行；
3. 优先建设 Presentation / Compiler / Theme / Workbench Inspect / Reliability；
4. 审查 Presentation Contract / Pipeline 中残留的 Thread / Run / Surface metadata；
5. 通过独立 Issue 决定旧 Runtime 代码保留、隔离或删除。

Documentation-only 修改必须通过 `pnpm docs:check`。

Core 代码修改至少需要：

```bash
pnpm check:boundaries
pnpm typecheck
pnpm test
pnpm build
```

Workbench 修改需要执行对应单元测试和浏览器 E2E。
