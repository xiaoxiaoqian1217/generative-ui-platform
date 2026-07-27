# Generative UI Platform - Generative UI Compiler MVP 需求规格说明书

**文档版本：** 1.4
**项目阶段：** MVP
**目标读者：** 产品负责人、架构师、开发人员、测试人员、Codex、Claude Code 等编码 Agent

---

## 1. 文档约定

本文使用以下约束词：

* **必须（MUST）**：不可省略的强制要求。
* **应该（SHOULD）**：原则上应实现，除非存在明确技术原因。
* **可以（MAY）**：可选能力，不属于 MVP 强制范围。
* **禁止（MUST NOT）**：不得实现或不得形成该依赖关系。

编码 Agent 实施本需求时必须遵守：

1. 不得擅自扩大 MVP 范围。
2. 不得将前端 Runtime、真实业务 Agent、Copilot Runtime 或 Interaction Gateway 纳入本期实现。
3. 不得绕过共享契约，在不同模块重复定义公共类型。
4. 不得让 `ui-compiler-core` 依赖网络服务、前端框架、具体 Agent 框架或模型供应商。
5. 不得生成或执行任意前端代码。
6. 不得将 UI Compiler Service 实现为承担业务推理、工具调用或 Agent 路由的业务 Agent。
7. 不得要求业务 Agent 输出 `presentationMode`、`presentationIntent` 或 UI Plan。
8. 不得让 UI Compiler Core 判断 Agent 内容应该直接展示还是生成 UI。
9. 出现需求冲突时，以“系统边界”和“关键技术决策”章节为准。
10. 未明确的技术细节应选择简单、可测试、可替换的实现。

---

## 2. 项目概述

### 2.1 名称与范围

| 名称 | 定位 | 本文含义 |
|---|---|---|
| Generative UI Platform | 仓库名称和长期产品载体 | 承载当前 Compiler MVP，并允许未来增加独立扩展能力 |
| Generative UI Compiler | 当前 MVP 产品 | 本文的需求、开发和验收对象 |
| UI Compiler Service | Agent 内容展示路由和 UI 编译服务 | 当前 MVP 模块，不是业务 Agent |
| Presentation Router | Markdown 或结构化数据展示模式决策能力 | Service 内部模块，可使用模型 Adapter |
| UI Compiler Core | UI Plan Candidate 的确定性编译能力 | 当前 MVP 模块，可脱离网络服务独立使用 |
| Interaction Gateway | 未来可选的 Agent 协作问题空间 | 不属于当前 MVP，未来产品关系待决策 |

仓库继续使用 **Generative UI Platform** 作为名称，但不代表当前已经实现完整 Agent 平台。

本文中的“项目”“系统”和“产品”在未特别说明时，均指 **Generative UI Compiler MVP**。

### 2.2 背景

业务 Agent 的内容输出契约支持 Markdown 和 JSON 结构化数据。
业务 Agent 不会稳定输出 Compiler 专用的展示模式、展示意图或 UI Plan。
如果每个前端应用都自行完成展示判断、结果解析、组件选择和界面生成，将产生：

* UI 转换逻辑重复建设；
* Agent 输出和前端组件强耦合；
* 生成结果缺少统一约束；
* 不同前端的渲染结果不一致；
* 缺少统一 Schema 校验；
* 缺少稳定的错误处理和降级机制；
* UI 生成能力无法被其他 Agent 或系统复用。

本项目建设独立的生成式 UI 展示和编译基础设施。
系统先判断 Agent 内容应该使用简单 Markdown 表示还是生成结构化 UI。
普通 Markdown 经过安全清理后直接返回前端。
不生成 UI 的结构化数据经过确定性安全序列化后返回 Markdown。
只有生成式 UI 请求进入 UI Compiler Core。

### 2.3 产品定位

本项目定位为：

> **面向 Agent 应用的、框架无关且协议可适配的生成式 UI 编译基础设施。**

Generative UI Compiler 负责解决：

> Agent 的 Markdown 或结构化数据应该如何安全展示，以及需要生成 UI 时如何转换为受控的声明式 UI。

它不解决：

* 用户请求应该由哪个业务 Agent 处理；
* 多个业务 Agent 如何协作；
* 业务任务如何执行；
* 会话、审批和工作流状态如何持久化；
* 前端如何实现真实 Vue、React 或其他框架组件。

### 2.4 产品组成

Generative UI Compiler MVP 包含两个产品模块和一个可替换 Adapter：

1. **UI Compiler Service**
   * 接收业务 Agent 返回的 Markdown 或 JSON 结构化数据；
   * 通过 Presentation Router 判断简单 Markdown 表示或生成式 UI；
   * 对普通 Markdown 执行安全清理并直接返回；
   * 对不生成 UI 的结构化数据执行确定性安全序列化；
   * 在展示路由前从授权来源加载并校验指定 Catalog；
   * 从同一 Catalog 生成带内容哈希的 Router 能力摘要；
   * 组装具体 Model Adapter；
   * 调用 UI Compiler Core；
   * 负责网络协议、请求生命周期、错误映射和可观测性；
   * 不负责业务推理、业务工具调用、Agent 路由或任务编排。

2. **UI Compiler Core**
   * 接收已经选择生成式 UI、Schema 合法但仍不可信的 UI Plan Candidate；
   * 接收由可信 Adapter 注入的 Component Catalog，并验证引用、内容哈希和组件选择；
   * 将 UI Plan Candidate 规范化为可信 UI IR；
   * 将 UI IR 编译为 A2UI；
   * 执行 Schema 校验和确定性降级处理。

3. **Model Adapter**
   * 为 Presentation Router 提供可替换的模型调用；
   * 输出经过 Schema 约束的展示决策和 UI Plan Candidate；
   * 负责模型超时、有限重试和供应商错误映射；
   * 不得被 UI Compiler Core 直接依赖。

### 2.5 统一术语链路

```text
Agent Markdown / JSON
    ↓
PresentationRequest（Service 外部输入契约）
    ↓
Presentation Router
    ├── markdown → Sanitized Markdown
    └── generative-ui → Schema-valid UI Plan Candidate
                              ↓
                       UI Compiler Core
                              ↓
                       UISurfaceIR
                              ↓
                       A2UI Operations
    ↓
PresentationResult（Service 外部输出契约）
    ↓
Frontend Markdown Renderer / A2UI Renderer
```

术语约束：

* **Presentation Request**：描述业务 Agent 返回的 Markdown 或结构化数据，以及调用方可选提供的上下文。
* **Presentation Decision**：Presentation Router 输出的 Markdown 或 generative UI 判别联合。
* **UI Plan Candidate**：模型或确定性规划器提出的、Schema 合法但仍不可信的框架无关 UI 语义方案。
* **Presentation Result**：Service 返回的 Markdown 或 generative UI 判别联合。
* **UI IR**：Compiler 内部的框架无关中间表示。
* **A2UI**：当前 MVP 默认的外部声明式 UI 输出协议。
* **Component Catalog**：Compiler 可选择组件的声明、语义和 Schema。
* **Component Registry**：前端 Runtime 中“组件类型 → 真实组件实现”的映射，不属于当前 MVP。

禁止将 Presentation Request、Presentation Decision、UI Plan Candidate、UI IR、A2UI 和 Component Registry 混用为同一概念。

### 2.6 当前阶段结论

当前 MVP 不建设 Interaction Gateway。

MVP 运行链路：

```text
业务 Agent / 测试工具 / 其他调用方
                │
                │ Markdown / JSON + optional context
                ▼
        UI Compiler Service
                │
                ▼
        Presentation Router
                │
                ├── Safe Markdown Representation
                │
                └── Schema-valid UI Plan Candidate
                            │
                            ▼
                     UI Compiler Core
                            │
                            ▼
                     A2UI / Fallback
                │
                ▼
      外部 Frontend Runtime
```

未来 Agent 协作需求只作为 non-normative roadmap 记录在第 22 节。
当前阶段不预先决定 Interaction Gateway 的产品关系、职责、依赖、协议或部署方式。

---

## 3. 建设目标

### 3.1 核心目标

系统必须实现：

1. 接收业务 Agent 的 Markdown 或 JSON 结构化数据输入。
2. 接收调用方可选提供的原始用户消息和展示上下文。
3. 判断 Agent 内容应使用简单 Markdown 表示还是生成结构化 UI。
4. 对普通 Markdown 执行安全清理，对结构化数据执行确定性安全序列化。
5. 需要生成 UI 时产生经过 Schema 校验但仍不可信的 UI Plan Candidate。
6. 将 UI Plan Candidate 校验并规范化为内部 UI IR。
7. 将 UI IR 编译为 A2UI。
8. 根据 Component Catalog 选择和校验受控组件。
9. 禁止生成 Catalog 中不存在的组件。
10. 对组件属性、结构、数据绑定和 Action 执行 Schema 校验。
11. 支持 Action 描述和 Action Schema 校验。
12. 生成式 UI 失败时返回安全 Markdown 降级结果。
13. UI Compiler Core 可脱离网络服务和模型独立运行。
14. UI Compiler Service 可独立部署。
15. UI Compiler Service 支持 HTTP 调用。
16. UI Compiler Service 支持 AG-UI 调用。
17. 核心编译逻辑不绑定 Vue、React、CopilotKit 或具体 Agent 框架。
18. 各共享包能够独立构建、测试和发布。
19. 支持通过 Catalog 描述通用组件和领域组件，但不实现真实领域组件。

### 3.2 非目标

MVP 不建设：

* Interaction Gateway；
* 多业务 Agent 路由；
* Agent 自动选择；
* 多 Agent 结果聚合；
* 多 Agent 自主规划；
* 用户 Action 到业务 Agent 的完整路由闭环；
* 前端应用；
* Frontend Runtime；
* Component Registry 的真实运行实现；
* A2UI Renderer；
* Vue 或 React 组件；
* 复杂业务组件实现；
* Copilot Runtime；
* 真实业务 Agent；
* 业务工具调用；
* 业务任务状态；
* 长期记忆；
* 业务数据库；
* 业务权限系统；
* 低代码 UI 编辑器；
* 任意 HTML、CSS、JavaScript、Vue 或 React 代码生成。

---

## 4. 系统范围

### 4.1 本期建设范围

MVP 交付内容包括：

* `ui-compiler-core`；
* `ui-compiler-service`；
* Presentation Request、Decision、Result、UI Plan Candidate 和编译输入输出契约；
* Presentation Router 和可替换 Model Adapter；
* Component Catalog Schema；
* UI IR；
* Markdown Sanitizer；
* Structured Data Validator 和 Serializer；
* 展示模式决策和 UI 规划；
* 组件选择；
* A2UI 编译；
* Schema 校验；
* HTTP Adapter；
* AG-UI Adapter；
* 错误、超时和取消；
* Markdown 直出和安全降级；
* 基础日志和可观测性；
* 单元测试；
* 契约测试；
* 集成测试；
* Docker 构建能力。

### 4.2 范围外系统

以下系统只用于说明外部关系，不属于本期正式交付物。

#### 4.2.1 前端应用与 Frontend Runtime

外部前端负责：

* 消费 A2UI；
* 维护 Component Registry；
* 将组件类型映射到真实 Vue、React、Flutter 或其他框架组件；
* 渲染通用组件和复杂业务组件；
* 渲染 Markdown 降级内容；
* 发送用户交互事件。

本项目只输出声明式组件描述，不持有真实组件实例，不执行前端组件代码。

#### 4.2.2 业务 Agent

业务 Agent 负责：

* 业务推理；
* 数据查询；
* 工具调用；
* 业务规则；
* 权威业务状态；
* 工作流和 Checkpoint；
* 输出 Markdown 或 JSON 结构化业务结果。

业务 Agent 不需要输出 `presentationMode`、`presentationIntent` 或 UI Plan。
本项目不判断 Agent 内容中的业务结果是否正确，只校验输入结构、展示决策、UI Plan Candidate 和编译结果是否合法。

#### 4.2.3 Copilot Runtime

Copilot Runtime 可以作为外部代理层调用 UI Compiler Service，但不属于本期建设范围。

#### 4.2.4 Interaction Gateway

Interaction Gateway 代表未来可能需要设计的 Agent 协作问题空间，例如：

* 多业务 Agent 路由；
* Agent 协作和结果聚合；
* Thread、Run、任务和审批状态管理；
* 用户 Action 回传；
* 中断、恢复和权限控制。

当前 MVP 不包含 Interaction Gateway，也不得以现有 Gateway 遗留物作为运行前置条件。
Gateway 与 Generative UI Compiler 的未来产品和架构关系必须由新的范围变更 Issue 和 ADR 决定。

---

## 5. 总体架构

### 5.1 核心架构

```text
┌─────────────────────────────────┐
│ 外部调用方                      │
│ Business Agent / Test Client    │
│ Runtime / Gateway / Other       │
└────────────────┬────────────────┘
                 │ HTTP / AG-UI
                 ▼
┌─────────────────────────────────┐
│ UI Compiler Service             │
│                                 │
│ HTTP Endpoint                   │
│ AG-UI Endpoint                  │
│ Request Validator               │
│ Markdown Sanitizer              │
│ Structured Data Serializer      │
│ Presentation Router             │
│ Model Adapter                   │
│ Output Adapter                  │
│ Error Handler                   │
│ Observability                   │
└───────────┬─────────────────────┘
            │
            ├── Safe Markdown Representation
            │
            └── Schema-valid UI Plan Candidate
                         │
                         ▼
┌─────────────────────────────────┐
│ UI Compiler Core                │
│                                 │
│ Input Validator                 │
│ Catalog Validator               │
│ Component Selector              │
│ UI IR Builder                   │
│ A2UI Compiler                   │
│ Schema Validator                │
│ Fallback Generator              │
└────────────────┬────────────────┘
                 │ A2UI / Fallback
                 ▼
┌─────────────────────────────────┐
│ External Frontend Runtime       │
│ Component Registry + Renderer   │
└─────────────────────────────────┘
```

### 5.2 职责关系

```text
业务 Agent
负责“业务结果是什么”

Presentation Router
负责“Agent 内容应使用简单 Markdown 表示还是生成 UI，以及生成什么 UI Plan Candidate”

UI Compiler Core
负责“UI Plan Candidate 如何经过权威校验后转换为受控的声明式 UI”

UI Compiler Service
负责“如何通过网络协议提供展示路由和编译能力”

Component Catalog
负责“Compiler 允许选择哪些组件以及参数约束”

Frontend Component Registry
负责“组件类型对应哪个真实前端组件”

前端 Renderer
负责“如何渲染和交互”
```

### 5.3 复杂业务组件边界

Compiler 可以选择复杂业务组件，但必须满足：

1. 组件已经在当前 Component Catalog 中声明。
2. 组件语义、Props Schema、Action Schema 和嵌套约束明确。
3. Compiler 只生成组件类型、Props、数据绑定和 Action 描述。
4. 真实组件实现由外部前端 Component Registry 提供。
5. Compiler 不理解或执行组件内部业务逻辑。

示例：

```text
Component Catalog
├── Common Components
│   ├── Card
│   ├── Table
│   └── Form
└── Domain Components
    ├── GISMapPanel
    ├── DeviceControlPanel
    └── TaskManagementPanel
```

只要领域组件已注册到 Catalog，Compiler 就可以选择它；但该组件的地图渲染、设备控制和业务状态仍由外部系统负责。

---

## 6. Monorepo 结构

目标结构由一个应用、六个共享包、测试目录和文档目录组成。

| 路径 | 目标职责 |
|---|---|
| `apps/ui-compiler-service` | HTTP、AG-UI、Presentation Router、Model Adapter 组装和应用编排 |
| `packages/ui-compiler-core` | UI Plan Candidate 到 UI IR 和 A2UI 的确定性编译 |
| `packages/presentation-contract` | 展示请求、决策、结果和 UI Plan Candidate 契约 |
| `packages/component-catalog-schema` | Catalog、组件和 Action Schema |
| `packages/compiler-contract` | 编译请求、UI IR、结果和错误契约 |
| `packages/ag-ui-adapter` | AG-UI 输入输出适配 |
| `packages/shared-types` | 最小通用类型 |
| `tests` | Fixture、契约、集成和端到端测试 |
| `docs` | 需求、架构、契约和 ADR |

当前项目阶段记录在 [README](../README.md#当前项目阶段)。
MVP 不得创建 `apps/interaction-gateway`、`packages/frontend-runtime` 或 `packages/component-registry`。
未来扩展必须保持包可独立构建和发布。

---

## 7. 模块目录

### 7.1 UI Compiler Service

Service 内部至少分离 HTTP、AG-UI、应用用例、Catalog Repository、Presentation Router、Markdown 安全处理、结构化数据处理、Model Adapter、配置和可观测性。
具体目录结构由实现决定，不构成公共契约。

### 7.2 UI Compiler Core

Core 内部至少分离输入校验、Catalog 校验、组件选择、UI IR、A2UI 编译、Schema 校验和降级。
具体目录结构由实现决定，不构成公共契约。

### 7.3 共享契约包

#### `presentation-contract`

负责：

* `PresentationRequest`；
* `AgentContent`；
* `PresentationDecision`；
* `PresentationResult`；
* `UIPlan`；
* `ActionIntent`；
* 展示请求和结果元数据。

#### `component-catalog-schema`

负责：

* Catalog 定义；
* Component Definition；
* Props Schema；
* Action Schema；
* 组件嵌套约束；
* 领域标签；
* Catalog 版本。

该包描述组件能力，不包含 Vue／React 组件实现，也不等同于前端 Component Registry。

#### `compiler-contract`

负责：

* `UICompileRequest`；
* `UICompileResult`；
* `UISurfaceIR`；
* `CompileError`；
* 编译阶段定义；
* A2UI 0.9.1 Profile Schema 和 UI IR 映射契约。

#### `ag-ui-adapter`

负责：

* AG-UI Run 事件封装；
* 编译请求解析；
* A2UI 载荷封装；
* 错误事件封装。

该包不得包含 UI 编译逻辑。

#### `shared-types`

负责：

* 通用 ID；
* 时间戳；
* 日志上下文；
* 基础错误；
* 通用工具类型。

---

## 8. 模块依赖规则

### 8.1 允许的依赖

| 模块 | 可依赖 |
|---|---|
| `ui-compiler-service` | Core、全部共享契约、AG-UI Adapter、具体 Model Adapter |
| `ui-compiler-core` | Presentation Contract、Compiler Contract、Catalog Schema、Shared Types |
| `ag-ui-adapter` | Compiler Contract、Shared Types |

### 8.2 禁止的依赖

UI Compiler Core 不得依赖 UI Compiler Service、网络协议、HTTP 框架、模型 SDK、模型供应商、Agent 框架、前端框架、浏览器 API 或前端 Component Registry。
共享契约包不得反向依赖应用层。

---

## 9. 模块职责

### 9.1 UI Compiler Core

UI Compiler Core 必须负责：

1. 校验编译输入。
2. 校验 UI Plan Candidate。
3. 接收并校验由可信调用方注入的指定 Component Catalog。
4. 解析和校验组件建议，包括 Catalog 中声明的领域组件。
5. 校验组件层级和布局。
6. 生成 UI IR。
7. 将 UI IR 编译为 A2UI。
8. 校验 UI IR 和 A2UI。
9. 生成确定性降级结果。
10. 返回编译诊断信息。

UI Compiler Core 禁止负责：

* HTTP 服务；
* AG-UI Run 生命周期；
* 判断 Markdown 应直接展示还是生成 UI；
* 调用模型；
* 依赖具体模型供应商；
* 业务 Agent 路由；
* 业务推理或工具调用；
* 权威业务状态；
* 用户长期记忆；
* 真实前端组件实现；
* Component Registry 运行；
* 前端组件渲染。

### 9.2 UI Compiler Service

UI Compiler Service 必须负责：

1. 暴露 HTTP 展示接口。
2. 暴露 AG-UI 展示接口。
3. 接收 Markdown、JSON 结构化数据和可选展示上下文。
4. 校验网络层请求。
5. 在任何模型或编译处理前安全清理 Markdown，并安全序列化不生成 UI 的结构化数据。
6. 在展示路由前从授权来源加载并校验 Catalog。
7. 从该 Catalog 生成相同 ID、版本和内容哈希的能力摘要。
8. 调用 Presentation Router。
9. 创建并注入具体 Model Adapter。
10. 校验 Presentation Decision 和 UI Plan Candidate。
11. 为每次 generative UI 编译生成请求级唯一 Surface ID。
12. 对 generative UI 决策调用 UI Compiler Core。
13. 将 Markdown 或 generative UI 结果转换为 HTTP 响应。
14. 将结果转换为 AG-UI 事件。
15. 处理请求和模型超时。
16. 处理请求取消。
17. 处理协议层错误。
18. 提供健康检查。
19. 提供版本信息。
20. 记录请求、路由和编译日志。

UI Compiler Service 禁止负责：

* 业务推理；
* 业务知识维护；
* 业务工具调用；
* 多业务 Agent 路由；
* Agent 编排；
* 权威业务状态；
* 复杂会话管理；
* 前端真实渲染。

### 9.3 Presentation Router 和 Model Adapter

Presentation Router 必须负责：

1. 根据 Markdown、结构化数据和可用上下文判断简单 Markdown 表示或生成式 UI。
2. 在需要模型语义分析时调用可替换 Model Adapter。
3. 返回符合 Schema 的 `PresentationDecision`。
4. 在 generative UI 分支同时返回 `UIPlan`。
5. 路由或模型失败时选择安全 Markdown 降级。

Model Adapter 必须负责：

1. 调用具体模型供应商。
2. 使用 Structured Output 或等价机制生成候选 `PresentationDecision`。
3. 执行模型超时和有限重试。
4. 将供应商错误映射为稳定错误代码。
5. 隔离供应商 SDK 和响应类型。

一次模型调用应该同时完成展示模式判断和 UI Plan Candidate 生成。
不得默认使用一次分类调用加一次 UI 规划调用。

---

## 10. 核心数据契约

所有公共契约必须定义在共享包中。

### 10.1 Presentation Request

`PresentationRequest` 的目标契约形状定义在 [CONTRACTS.md](./CONTRACTS.md#presentation-request)。
可执行事实来源在迁移完成后必须是 `packages/presentation-contract` 的运行时 Schema。

约束：

1. Markdown 内容必须存在且非空。
2. Markdown 必须在进入 Presentation Router、Model Adapter、Core、UI IR、A2UI、缓存或日志前完成安全清理。
3. 结构化数据必须是合法 JSON，并满足数据深度和数据项数量限制。
4. 结构化数据提供 `fallbackMarkdown` 时，该字段必须非空，并在返回前通过 Markdown 安全清理。
5. 结构化数据未提供 `fallbackMarkdown` 时，Service 必须能够生成确定性、安全且不静默截断的 Markdown 表示。
6. `userMessage` 是调用方能够提供时使用的可选上下文。
7. Service 不得要求业务 Agent 提供 `presentationMode`、`presentationIntent` 或 UI Plan Candidate。
8. UI Compiler 不校验 Agent 内容中的业务结果是否真实。

### 10.2 Presentation Decision 和 UI Plan Candidate

`PresentationDecision` 和 `UIPlan` 的目标契约定义在 [CONTRACTS.md](./CONTRACTS.md#presentation-decision)。
`UIPlan` 是契约类型名，领域概念使用 UI Plan Candidate。

`PresentationDecision` 是 Presentation Router 的内部输出，不是业务 Agent 输入。
Model Adapter 产生的候选结果必须先通过 Schema 校验。
UI Plan Candidate 通过 Schema 校验后仍然是不可信、非权威输入。
它应表达语义区域、源数据绑定、组件偏好、布局约束和 Action 意图，而不是复制最终 UI IR。
UI Plan Candidate 不得包含可执行代码、DOM、前端组件实例或模型供应商响应对象。
所有组件和 Action 建议都必须由 UI Compiler Core 根据当前 Catalog 做权威校验。
UI Plan Candidate 的精确接口必须在模型分析阶段开始前通过 ADR 决定。
该接口必须保留从 Candidate 到 UI IR 的实质性 lowering，禁止让 Core 退化成字段透传层。

### 10.3 Action

`ActionIntent` 的目标语义定义在 [CONTRACTS.md](./CONTRACTS.md#action-intent)，可执行事实来源必须是 `packages/presentation-contract`。

MVP 中 Action 只用于生成 UI 描述，不实现 Action 回传业务 Agent 的完整链路。

约束：

* `actionId` 在同一个 Surface 内必须唯一。
* Action 类型必须在 Catalog 中允许。
* 破坏性操作必须设置 `destructive = true`。
* 需要确认的操作必须设置 `requiresApproval = true`。
* UI Compiler 不得创建未注册 Action。

### 10.4 编译请求

`UICompileRequest` 的目标契约形状定义在 [CONTRACTS.md](./CONTRACTS.md#compile-request)。

`threadId` 和 `runId` 是可选的协议关联字段。
Core 可以透传，但不得据此维护会话状态或 Run 生命周期。
Core 接收到 `UICompileRequest` 时必须假设调用方已经选择生成式 UI，不得再次执行展示模式路由。
Core 必须继续把其中的 UI Plan Candidate 视为不可信输入。
`sourceKind = "structured-data"` 时，`sourceData` 必须是通过资源校验的完整原始 JSON。
`sourceKind = "markdown"` 时，`sourceData` 必须是 `{ "markdown": sanitizedMarkdown }`。
原始未清理 Markdown 不得进入 Model Adapter、Core、UI IR、A2UI、缓存或日志。
网络请求只提供 Catalog ID 和版本，Service 必须从授权来源解析完整 Catalog。
Core 必须验证请求 Catalog 引用与注入 Catalog 的 ID 和版本一致。
Core 必须重新计算注入 Catalog 的规范化内容哈希，并与可信 Adapter 传入的哈希一致。
Service 必须验证 Router 能力摘要使用相同的内容哈希。

### 10.5 Presentation Result

`PresentationResult` 和 `PresentationError` 的目标契约形状定义在 [CONTRACTS.md](./CONTRACTS.md#presentation-result)。

前端必须根据 `mode` 把结果发送给 Markdown Renderer 或 A2UI Renderer。
只要原始 Agent 内容有效，路由、模型、UI Plan Candidate 或编译失败都应优先返回 `status = "degraded"` 的安全 Markdown 表示。

### 10.6 编译结果

`UICompileResult` 的可执行事实来源是 `packages/compiler-contract`。
其完整成功、降级成功和完整失败三个互斥状态由 ADR-0002 定义。

`success` 表示调用方是否获得可消费结果；完整 A2UI 和降级内容都属于可消费结果。

### 10.7 编译错误

`CompileStage` 和 `CompileError` 的可执行事实来源是 `packages/compiler-contract`。

错误代码必须稳定，禁止仅通过自然语言文本判断错误类型。

---

## 11. Component Catalog 与 Component Registry

### 11.1 Component Catalog 定义

Component Catalog 的契约所有权说明位于 [CONTRACTS.md](./CONTRACTS.md#package-ownership)。
可执行事实来源必须是 `packages/component-catalog-schema` 的运行时 Schema。

约束：

1. `ActionDefinition.actionType` 在同一 Catalog 版本中必须唯一。
2. `ComponentDefinition.allowedActions` 只能引用当前 Catalog 中存在的 `ActionDefinition`。
3. `ActionIntent.payload` 必须通过对应 `ActionDefinition.payloadSchema` 校验。
4. Action 类型未声明、引用无效或 payload 校验失败时，不得生成可执行 Action 描述。

### 11.2 Catalog 所有权

Generative UI Compiler 负责处理：

* Catalog ID；
* Catalog Version；
* 组件类型和语义；
* Props Schema；
* Action Schema；
* 组件嵌套关系；
* 领域标签；

### 11.3 Component Registry 边界

Component Registry 位于外部 Frontend Runtime，负责：

```text
组件类型 + Catalog 版本
          ↓
查找真实前端组件实现
          ↓
向组件传入经过校验的 Props、数据绑定和 Action
```

MVP 不实现 Component Registry，但输出必须能够被外部 Registry 稳定消费。

Catalog 和 Registry 的区别：

| 概念 | 位置 | 负责内容 | 当前 MVP |
|---|---|---|---|
| Component Catalog | Compiler 侧契约 | 组件语义、Schema、约束和版本 | 是 |
| Component Registry | Frontend Runtime | 组件类型到真实实现的映射 | 否 |
| 真实业务组件 | 业务前端 | 地图、设备控制、任务面板等实现 | 否 |

### 11.4 MVP 基础组件

基础 Catalog 至少包含：

* `Text`；
* `Markdown`；
* `Card`；
* `List`；
* `Table`；
* `Alert`；
* `Button`；
* `Form`；
* `Steps`；
* `Timeline`。

测试 Fixture 应至少包含一个领域组件定义，用于验证 Compiler 可以选择已声明的业务组件，但不得包含真实组件代码。

### 11.5 受控生成

UI Compiler 必须禁止生成：

* Catalog 中未声明的组件；
* 未注册 Action；
* 任意 HTML；
* 任意 CSS；
* 任意 JavaScript；
* 任意 Vue 或 React 组件代码；
* 浏览器 API 调用；
* 动态远程脚本。

---

## 12. UI IR

A2UI 编译前必须生成独立 UI IR。
UI IR 的目标语义定义在 [CONTRACTS.md](./CONTRACTS.md#ui-ir)。
可执行事实来源必须位于 `packages/compiler-contract`。

UI IR 必须满足：

1. 框架无关。
2. 协议相对独立。
3. 不包含组件实例。
4. 不包含 DOM 节点。
5. 不包含可执行代码。
6. 不包含前端 Store。
7. 可以序列化。
8. 可以单独测试。
9. 可以在未来转换为其他 UI 描述协议。
10. 当前默认输出目标为 A2UI。
11. `ComponentIR.componentId` 在同一个 Surface 中必须唯一。
12. 每个 `ComponentActionBindingIR.componentId` 必须引用当前 Surface 中存在的 `ComponentIR`。
13. 每个 `ComponentActionBindingIR.actionId` 必须引用当前 Surface 中存在的 `ActionIntent`。
14. 每个进入 `UISurfaceIR.actions` 的 Action 必须至少存在一个有效的 `ComponentActionBindingIR`，MVP 不支持未绑定组件的 Surface Action。
15. 被绑定 Action 的 `actionType` 必须同时存在于 Catalog 的 Action 定义和目标组件的 `allowedActions` 中。
16. 组件引用、Action 引用、缺失绑定或 Action 许可校验失败时，必须返回 `schema-validation` 阶段的结构化错误并进入降级流程。

---

## 13. UI Compiler Core 功能需求

### 13.1 输入校验

#### CORE-001

系统必须校验 `UICompileRequest`。

#### CORE-002

系统必须校验 `requestId`、UI Plan Candidate、`sourceKind`、`sourceData`、Fallback Markdown、Catalog 引用、重新计算的 Catalog 内容哈希、Action、数据嵌套深度和数据项数量。

#### CORE-003

输入校验失败时不得继续执行 UI 编译。资源阈值必须通过配置注入，不得硬编码。

HTTP 请求体字节数由 UI Compiler Service 在反序列化之前校验。

### 13.2 UI Plan Candidate 校验

#### CORE-004

系统必须校验 `UIPlan` Schema。

#### CORE-005

系统必须拒绝 UI Plan Candidate 中的可执行代码、DOM、前端组件实例和模型供应商响应对象。

#### CORE-006

系统必须把 UI Plan Candidate 视为不可信输入，即使 Service 已经执行过边界校验。

#### CORE-007

系统必须保留已经安全清理的 `fallbackMarkdown`，以便编译失败时返回有效业务内容。

### 13.3 UI Plan Candidate 处理

#### CORE-008

系统必须支持表达语义区域、源数据绑定、组件偏好、布局约束和 Action 意图的 UI Plan Candidate。
Candidate 不得复制最终 UI IR，也不得要求模型决定权威组件树。

#### CORE-009

系统应根据 UI Plan Candidate、Catalog、数据规模、嵌套约束、Actions、领域信息和 Viewport 解析最终展示结构。

#### CORE-010

MVP 至少支持以下展示场景：

| 展示场景 | Core 可选择的组件 |
|---|---|
| summary | Card、Text、List |
| status | Card、Table、Alert |
| comparison | Table、Card |
| timeline | Timeline、Steps |
| confirmation | Card、Button |
| form | Form |
| detail | Card、List、Table |

#### CORE-011

UI Plan Candidate 未表达可用的语义提示时，Core 可以根据其他候选信息使用确定性规则解析。
Core 不得为了补充语义提示调用模型。

### 13.4 组件选择

#### CORE-012

所有组件必须来自当前 Catalog。

#### CORE-013

组件选择应考虑 UI Plan Candidate、数据规模、组件描述、嵌套约束、Actions、领域信息和 Viewport。

#### CORE-014

无法找到匹配组件时必须进入降级流程。

领域组件只要存在于 Catalog 中，应与通用组件采用相同的选择、校验和降级流程。

### 13.5 UI IR

#### CORE-015

A2UI 编译前必须生成 UI IR。

#### CORE-016

UI IR 必须通过内部 Schema 校验。

#### CORE-017

UI IR 生成失败时必须返回明确的编译错误。

### 13.6 A2UI 编译

#### CORE-018

系统必须将 UI IR 编译为 A2UI 0.9.1 Profile Operations。
每条消息必须使用 A2UI v0.9 协议判别字段 `version = "v0.9"`。

#### CORE-019

MVP 至少支持单次完整输出中的 Surface 创建、组件创建与更新、数据模型更新和 Action 绑定。
Surface 替换、删除和增量生命周期属于后续扩展范围。

#### CORE-020

MVP 可以一次性返回完整 A2UI。架构应预留增量输出能力，但不要求真正流式生成组件。

### 13.7 Schema 校验

#### CORE-021

系统必须校验组件类型、Props、必填属性、子组件关系、组件引用、数据绑定、Actions 和 Catalog 版本。

#### CORE-022

Schema 校验禁止关闭。

#### CORE-023

Schema 校验失败时不得直接返回非法 A2UI。

### 13.8 降级

#### CORE-024

系统必须按照以下顺序降级：

```text
动态 A2UI
    ↓
安全 Markdown
    ↓
纯文本错误
```

#### CORE-025

降级结果必须包含安全 Markdown、原因、原始错误代码和 `degraded = true`。
MVP 不生成固定模板 A2UI 降级结果。

#### CORE-026

UI 编译失败不得导致有效业务内容完全丢失。

---

## 14. UI Compiler Service 功能需求

### 14.1 HTTP 接口

#### SERVICE-001

必须提供：

```text
POST /api/ui-compiler/present
```

请求体使用 `PresentationRequest`，响应体使用 `PresentationResult`。
`POST /api/ui-compiler/compile` 可以保留为 SDK 或内部编译入口，但不得承担展示模式路由。

#### SERVICE-002

必须提供：

```text
GET /health
GET /version
```

#### SERVICE-003

HTTP 层必须处理请求体限制、JSON 解析、参数校验、超时、取消和错误状态码转换。

### 14.2 AG-UI 接口

#### SERVICE-004

UI Compiler Service 必须提供 AG-UI 兼容入口。

#### SERVICE-005

AG-UI Run 至少包含：

```text
RUN_STARTED
展示路由事件或状态
Markdown、A2UI 或 Fallback 结果
RUN_FINISHED 或 RUN_ERROR
```

`RUN_STARTED`、`RUN_FINISHED` 和请求上下文必须使用一致且非空的 `threadId` 与 `runId`。
调用方未提供时，AG-UI Adapter 必须生成请求级标识并在整个事件流中复用。

#### SERVICE-006

AG-UI Adapter 负责协议事件，不得将 Run 生命周期逻辑放入 UI Compiler Core。

#### SERVICE-007

AG-UI 输出中的 A2UI 数据必须来自已经通过 Schema 校验的编译结果。

### 14.3 独立运行

#### SERVICE-008

UI Compiler Service 必须能够独立启动。

#### SERVICE-009

UI Compiler Service 不得依赖 Interaction Gateway、前端应用、Copilot Runtime 或真实业务 Agent。

#### SERVICE-010

必须提供独立 Dockerfile。

### 14.4 服务身份

#### SERVICE-011

UI Compiler Service 必须被实现为展示路由和编译能力的应用服务，而不是业务 Agent。

#### SERVICE-012

UI Compiler Service 不得主动选择、调用或编排业务 Agent。

### 14.5 展示路由

#### SERVICE-013

Presentation Router 必须返回 `mode = "markdown"` 或 `mode = "generative-ui"` 的判别联合。

#### SERVICE-014

`mode = "markdown"` 且输入为 Markdown 时，Service 必须清理危险 HTML、内联 JavaScript、危险 URL 和不支持结构，然后直接返回 Markdown 结果。
`mode = "markdown"` 且输入为结构化数据时，Service 必须使用经过非空校验和安全清理的 `fallbackMarkdown`，或生成确定性、安全且不静默截断的 Markdown 表示。
该路径不得调用 UI Compiler Core。
无论最终路由模式如何，Markdown 都必须在进入 Presentation Router、Model Adapter、Core、UI IR 或 A2UI 前完成安全清理。

#### SERVICE-015

`mode = "generative-ui"` 时，Service 必须校验 `UIPlan`，然后调用 UI Compiler Core。

#### SERVICE-016

调用方提供 `context.userMessage` 时，Presentation Router 应结合原始用户意图和 Agent 内容做展示决策。
只有 Agent 内容时仍必须支持路由，但系统不得宣称其判断与包含用户上下文时同等可靠。

#### SERVICE-017

需要模型分析时，Presentation Router 必须通过可替换 Model Adapter 调用模型。
一次模型调用应该同时返回展示模式决策和可选 UI Plan Candidate。

#### SERVICE-018

模型输出必须先通过 `PresentationDecision` Schema 校验。
模型输出不得直接成为 A2UI。

#### SERVICE-019

路由、模型、UI Plan Candidate 或编译失败时，只要原始 Agent 内容有效，Service 必须返回经过安全清理或确定性序列化的降级 Markdown。

#### SERVICE-020

结构化数据必须在进入 Presentation Router 或 Model Adapter 之前通过 JSON、数据深度和数据项数量校验。

#### SERVICE-021

Structured Data Serializer 必须使用稳定、可测试的确定性序列化。
Serializer 不得执行输入内容，不得静默截断或摘要业务数据。

---

## 15. 状态与缓存

### 15.1 Core 状态

UI Compiler Core 应优先保持无状态。

可以缓存：

* Component Catalog；
* Catalog Schema；
* UI Plan Candidate Schema；
* 编译器静态配置。

MVP 不得跨请求缓存完整 UI IR、`UICompileResult`、A2UI Operations、业务数据、Fallback Markdown 或 Surface ID。
未来如缓存不含请求值的编译模板，必须先完成独立 ADR、隐私评估、安全域分区和跨用户隔离测试。

不得保存：

* 业务任务状态；
* 用户长期记忆；
* 业务 Agent 会话；
* 工作流 Checkpoint；
* 权威审批状态；
* 前端 Component Registry 实例。

### 15.2 Service 状态

UI Compiler Service 可以维护当前请求的临时 Run 上下文，只用于请求关联、日志追踪、取消、超时和 AG-UI 生命周期。

请求结束后不得将其视为权威业务状态。

---

## 16. 非功能需求

### 16.1 框架独立性

UI Compiler Core 不得依赖 Vue、React、CopilotKit、LangGraph、CrewAI、浏览器环境或特定模型供应商。

模型能力必须通过 UI Compiler Service 中的可替换 Adapter 接入。
UI Compiler Core 不得调用模型。

### 16.2 可靠性

系统必须：

* 为请求设置超时；
* 为模型调用设置超时；
* 限制重试次数；
* 区分可重试和不可重试错误；
* 支持请求取消；
* 保证每个 AG-UI Run 明确结束；
* 编译失败时提供降级结果；
* 提供健康检查。

### 16.3 安全性

系统必须：

* 禁止执行模型生成代码；
* 清理危险 Markdown；
* 校验所有组件 Props；
* 校验所有 Actions；
* 限制请求体大小；
* 限制数据项数量；
* 限制嵌套深度；
* 避免在日志中输出敏感原文；
* 禁止原始未清理 Markdown 进入模型、编译、输出或缓存；
* 禁止加载未经授权的远程组件；
* 禁止向调用方返回内部堆栈信息。

### 16.4 资源限制配置

MVP 必须提供：

| 配置项 | 含义 | 默认值确定时间 |
|---|---|---|
| `maxRequestBytes` | HTTP 请求体最大字节数 | 阶段四验收前 |
| `maxDataDepth` | 结构化数据最大嵌套层数 | 阶段二验收前 |
| `maxDataItems` | 单次请求最大数据项数量 | 阶段二验收前 |
| `compileTimeoutMs` | 单次编译最长执行时间 | 阶段五验收前 |

启用模型 Adapter 时还必须提供 `modelTimeoutMs` 和 `modelRetryCount`。

资源限制错误代码至少包括：

| 错误代码 | 触发条件 | 责任模块 |
|---|---|---|
| `REQUEST_BODY_TOO_LARGE` | 请求体超过限制 | UI Compiler Service |
| `DATA_DEPTH_EXCEEDED` | Agent 内容或 UI Plan Candidate 数据嵌套深度超过限制 | UI Compiler Service / UI Compiler Core |
| `DATA_ITEMS_EXCEEDED` | Agent 内容或 UI Plan Candidate 数据项数量超过限制 | UI Compiler Service / UI Compiler Core |
| `COMPILE_TIMEOUT` | 编译执行超时 | UI Compiler Service |
| `MODEL_TIMEOUT` | 模型调用超时 | Model Adapter |
| `MODEL_RETRY_EXHAUSTED` | 模型重试耗尽 | Model Adapter |

### 16.5 可观测性

每次请求至少记录：

* `requestId`；
* `catalogId`；
* `catalogVersion`；
* 是否包含用户上下文；
* 最终展示模式；
* 路由、模型和编译阶段及各阶段耗时；
* 总耗时；
* 模型是否调用和是否重试；
* 是否降级；
* 降级原因；
* 错误代码；
* 编译器版本。

### 16.6 性能

系统应该缓存已校验 Catalog 和重复 Schema，在本地执行 Markdown 清理和 Schema 校验，避免重复模型调用，并为后续增量编译预留接口。

系统不得静默截断或摘要业务数据。

---

## 17. 测试要求

### 17.1 单元测试

必须覆盖 Input Validator、Markdown Sanitizer、Structured Data Validator、Structured Data Serializer、Presentation Router、Model Adapter、UI Plan Candidate Validator、Catalog Repository、Catalog Validator、Component Selector、UI IR Builder、A2UI Compiler、Schema Validator、Fallback Generator 和 Error Mapper。

### 17.2 契约测试

必须覆盖：

* `PresentationRequest`；
* `AgentContent`；
* `PresentationDecision`；
* `PresentationResult`；
* `UIPlan`；
* `ActionIntent`；
* `UICompileRequest`；
* `UICompileResult`；
* `CompileError`；
* Component Catalog；
* AG-UI 事件封装。

### 17.3 集成测试

必须验证：

1. 普通 Markdown → Sanitizer → Markdown Result。
2. 结构化数据 → Serializer → Markdown Result。
3. Markdown → Presentation Router → UI Plan Candidate → Core → A2UI。
4. 结构化数据 → Presentation Router → UI Plan Candidate → Core → A2UI。
5. 模型路由失败 → Safe Markdown Representation。
6. 非法 UI Plan Candidate → Safe Markdown Representation。
7. HTTP → Presentation Result。
8. AG-UI → Markdown 或 A2UI Events。
9. Catalog 不兼容降级。
10. 非法组件、Props、Action 和嵌套降级。
11. 模型超时、编译超时和请求取消。
12. Catalog 中领域组件的合法选择。
13. 未声明领域组件被拦截。
14. 超深、超量和超大结构化输入在 Model Adapter 调用前被拒绝，并验证模型调用次数为零。
15. 原始未清理 Markdown 不进入 Model Adapter、Core、UI IR 或 A2UI。
16. 相同 Plan 和不同 `sourceData` 的并发请求不会串用数据、Fallback 或 Surface ID。
17. A2UI 0.9.1 Profile 的所有消息使用 `version = "v0.9"`。
18. AG-UI 调用缺少 Thread ID 或 Run ID 时生成一致且非空的请求级标识。

### 17.4 Fixture

必须提供：

* 基础 Component Catalog；
* 至少一个领域 Component Catalog 示例；
* 适合 Markdown 直出的示例；
* 适合生成状态、比较、时间线、确认和表单 UI 的 Markdown；
* 适合简单序列化和生成式 UI 的结构化数据；
* 对应的 UI Plan Candidate；
* 非法 Catalog；
* 非法 Props；
* 超大输入；
* 超深和超量结构化输入；
* 超时模拟。

领域组件 Fixture 只包含声明和数据，不包含真实前端组件代码。

---

## 18. MVP 验收标准

### 18.1 工程验收

* Monorepo 可以安装依赖、构建、类型检查和测试。
* `ui-compiler-service` 可以独立构建和启动。
* `ui-compiler-core` 可以独立导入。
* 共享契约没有重复定义。
* 禁止依赖关系未出现。
* Docker 镜像可以成功构建。

### 18.2 Core 验收

* UI Plan Candidate 可以转换为 UI IR。
* 七类展示场景均有 UI Plan Candidate 到 UI IR 的测试用例。
* UI IR 可以转换为 A2UI。
* A2UI 0.9.1 Profile 消息使用 `version = "v0.9"`。
* 未注册组件、非法 Props、嵌套和 Action 会被拦截。
* Catalog 不兼容会报错或降级。
* 编译失败会返回降级结果。
* Catalog 中声明的领域组件可以被选择。
* Core 不依赖网络、前端、Component Registry 或 Agent 框架。

### 18.3 Service 验收

* 普通 Markdown 可以不调用 Core 直接返回。
* 适合生成 UI 的 Markdown 可以生成经过验证的 A2UI。
* 结构化数据可以安全序列化为 Markdown 或生成经过验证的 A2UI。
* HTTP 可以完成一次展示路由和可选编译。
* AG-UI 可以完成一次展示 Run。
* AG-UI Run 有明确开始和结束事件。
* AG-UI Run 的开始、结束和上下文使用一致且非空的 Thread ID 与 Run ID。
* A2UI 和降级结果可以通过 AG-UI 返回。
* `/health` 和 `/version` 可用。
* UI Compiler Service 可以独立运行。
* UI Compiler Service 不依赖 Interaction Gateway。
* UI Compiler Service 不包含业务推理、业务 Agent 路由和编排能力。
* UI Compiler Core 不执行展示模式路由或模型调用。

---

## 19. 实施顺序

### 阶段一：工程和契约

完成 Monorepo、TypeScript、Workspace、公共契约、错误模型、Catalog Schema 和测试框架。

### 阶段二：确定性编译链路

完成 Input Validator、UI Plan Candidate Validator、基础和领域 Catalog Fixture、组件选择、UI IR、A2UI Compiler、Schema Validator 和 Fallback。

阶段目标：

```text
Schema-valid UI Plan Candidate
        ↓
UI Compiler Core
        ↓
UI IR
        ↓
A2UI / Fallback
```

### 阶段三：展示路由和模型分析

增加 Presentation Router、Markdown Sanitizer、Structured Data Validator、Structured Data Serializer 和可替换 Model Adapter。
Model Adapter 用于判断简单 Markdown 表示或生成式 UI，并在 generative UI 分支生成 UI Plan Candidate。

模型输出仍必须转换为 UI IR 并通过 Schema 校验。

### 阶段四：UI Compiler Service

完成 HTTP Server、HTTP 展示接口、AG-UI Endpoint、Run 生命周期、错误转换、健康检查、版本接口和 Dockerfile。

### 阶段五：集成验收

完成 Contract Test、Integration Test、E2E Test、超时测试、取消测试、降级测试和 Docker 构建测试。

Frontend Runtime 和真实组件渲染不属于阶段五验收范围，可以通过测试客户端验证输出契约。

---

## 20. Definition of Done

一个功能只有同时满足以下条件才视为完成：

1. 符合模块职责。
2. 未违反依赖规则。
3. 公共类型位于共享契约包。
4. 输入和输出经过 Schema 校验。
5. 错误使用统一错误代码。
6. 日志包含 `requestId`。
7. 具有单元测试。
8. 具有必要的契约或集成测试。
9. 文档同步更新。
10. 不依赖范围外真实系统。
11. 构建、类型检查和测试通过。
12. 未将 Catalog 与 Component Registry 混为同一模块。
13. 未将 UI Compiler Service 实现为业务 Agent。
14. 未让 UI Compiler Core 承担展示模式路由或模型调用。
15. 未跨请求缓存包含业务数据、Fallback Markdown、Surface ID 或最终 Operations 的完整编译结果。

---

## 21. 关键技术决策

| 编号 | 决策 |
|---|---|
| TD-001 | 当前 MVP 产品是 Generative UI Compiler |
| TD-002 | 当前 MVP 建设 UI Compiler Service、Presentation Router、Model Adapter 和 UI Compiler Core |
| TD-003 | Interaction Gateway 不属于当前 MVP，未来产品和架构关系由新的范围变更 Issue 与 ADR 决定 |
| TD-004 | UI Compiler Core 是唯一核心编译能力 |
| TD-005 | UI Compiler Service 是展示路由和编译应用服务，不是业务 Agent |
| TD-006 | 项目采用 Monorepo，共享包可以独立发布 |
| TD-007 | Core 不依赖网络协议、前端框架和具体 Agent 框架 |
| TD-008 | PresentationRequest 是 Service 外部输入契约，支持 Markdown 和 JSON 结构化数据 |
| TD-009 | 简单内容返回安全 Markdown 表示，只有 generative UI 决策进入 UI Compiler Core |
| TD-010 | UI IR 当前默认编译为 A2UI |
| TD-011 | 组件只能来自 Component Catalog |
| TD-012 | Component Catalog 属于 Compiler 契约，Component Registry 属于外部 Frontend Runtime |
| TD-013 | 领域组件可以通过 Catalog 扩展，但真实组件实现不属于 MVP |
| TD-014 | 所有 A2UI 必须通过 Schema 校验 |
| TD-015 | UI Compiler Service 同时提供 HTTP 和 AG-UI 接口 |
| TD-016 | Action MVP 只生成描述，不实现完整业务回传 |
| TD-017 | MVP 支持一次性 A2UI，预留增量输出 |
| TD-018 | 所有失败必须返回明确错误或降级结果 |
| TD-019 | Presentation Router 位于 Core 之前，负责安全 Markdown 表示或 generative UI 决策 |
| TD-020 | 一次模型调用应该同时返回展示决策和可选 UI Plan Candidate |
| TD-021 | Core 不依赖模型供应商，也不决定是否生成 UI |
| TD-022 | 业务 Agent、Frontend Runtime、Component Registry 和 Interaction Gateway 均为外部系统 |
| TD-023 | Catalog 由 Service 或可信 Adapter 加载，Core 校验注入 Catalog 与请求引用及内容哈希一致 |
| TD-024 | Markdown 在进入模型、Core 或 A2UI 前清理，Markdown `sourceData` 只保存清理后的 `/markdown` |
| TD-025 | A2UI 0.9.1 Profile 消息使用 v0.9 协议判别字段 |
| TD-026 | MVP 降级链为 A2UI、Markdown、失败，不生成固定模板 A2UI |
| TD-027 | MVP 不支持 Surface 替换和删除 |
| TD-028 | MVP 不跨请求缓存完整编译结果 |

---

## 22. 后续可选能力：Interaction Gateway

本节是 non-normative roadmap，不属于当前 MVP 的设计、契约、测试或验收依据。

只有出现以下需求时，才考虑启动 Interaction Gateway：

* 前端需要统一连接多个业务 Agent；
* 需要根据 Agent ID、能力或业务领域路由请求；
* 需要聚合多个 Agent 的结果和进度；
* 需要维护 Thread、Run、任务和 Agent 关系；
* 需要将用户 Action 回传给对应业务 Agent；
* 需要处理审批、中断、任务恢复和权限；
* 单个业务 Agent 或现有 Runtime 无法承担上述职责。

未来逻辑关系：

```text
Frontend
    ↓
Interaction Gateway
    ├── Business Agents
    └── Generative UI Compiler
```

该图只表达可能的产品能力关系，不预先决定未来的依赖、协议或部署方式。
上述触发条件只允许启动设计，不自动授权创建或实现 Gateway。
正式启动必须先创建显式的范围变更 Issue，并形成新的 ADR。
新 ADR 必须重新确认 Gateway 的职责、依赖方向、契约归属、协议、部署边界和验收标准。
当前阶段不得为 Interaction Gateway 创建应用目录、公共契约、数据库或验收标准。

---

## 23. 待确认事项

以下事项不阻塞当前需求确认，但必须在对应阶段开始前形成 ADR：

| 待确认事项 | 决策截止点 |
|---|---|
| Markdown Sanitizer | 阶段三开始前 |
| Schema 校验库 | 阶段二开始前 |
| Presentation Router 和模型 Adapter 接口 | 阶段三开始前 |
| Node HTTP 框架 | 阶段四开始前 |
| AG-UI SDK 版本 | 阶段四开始前 |

A2UI 0.9.1 Profile、Markdown 降级、AG-UI CustomEvent 映射、编译数据所有权和完整结果缓存边界已经分别由 ADR-0007 至 ADR-0011 固化。

以下事项必须在相关功能进入验收前形成 ADR：

| 待确认事项 | 决策要求 |
|---|---|
| Component Catalog 存储方式 | 在引入持久化实现前完成 |
| Catalog 与外部 Component Registry 的版本协商方式 | 在接入真实 Runtime 前完成 |
| 编译模板缓存策略 | MVP 不启用；未来启用前必须完成独立 ADR、隐私评估和隔离测试 |
| 日志和链路追踪方案 | 阶段五验收前完成 |

在没有明确决策前，编码 Agent 不得将具体实现硬编码到 UI Compiler Core。
