# Generative UI Platform - Generative UI Compiler MVP 需求规格说明书

**文档版本：** 1.2  
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
4. 不得让 `ui-compiler-core` 依赖网络服务、前端框架或具体 Agent 框架。
5. 不得生成或执行任意前端代码。
6. 不得将 UI Compiler Agent 实现为承担业务推理、规划、工具调用或 Agent 路由的业务 Agent。
7. 出现需求冲突时，以“系统边界”和“关键技术决策”章节为准。
8. 未明确的技术细节应选择简单、可测试、可替换的实现。

---

## 2. 项目概述

### 2.1 名称与范围

| 名称 | 定位 | 本文含义 |
|---|---|---|
| Generative UI Platform | 仓库名称和长期产品载体 | 承载当前 Compiler MVP，并允许未来增加独立扩展能力 |
| Generative UI Compiler | 当前 MVP 产品 | 本文的需求、开发和验收对象 |
| UI Compiler Agent | Compiler 的网络适配服务 | 当前 MVP 模块，不是业务 Agent |
| UI Compiler Core | Compiler 的确定性核心能力 | 当前 MVP 模块，可脱离网络服务独立使用 |
| Interaction Gateway | 未来可选的 Agent 协作扩展能力 | 独立于 Compiler，不属于当前 MVP |

仓库继续使用 **Generative UI Platform** 作为名称，但不代表当前已经实现完整 Agent 平台。

本文中的“项目”“系统”和“产品”在未特别说明时，均指 **Generative UI Compiler MVP**。

### 2.2 背景

业务 Agent 通常以 Markdown 或结构化数据返回结果。如果每个前端应用都自行完成结果解析、组件选择和界面生成，将产生：

* UI 转换逻辑重复建设；
* Agent 输出和前端组件强耦合；
* 生成结果缺少统一约束；
* 不同前端的渲染结果不一致；
* 缺少统一 Schema 校验；
* 缺少稳定的错误处理和降级机制；
* UI 生成能力无法被其他 Agent 或系统复用。

本项目建设独立的生成式 UI 编译基础设施，将 Agent 输出转换为受控、声明式、可验证的 UI 描述。

### 2.3 产品定位

本项目定位为：

> **面向 Agent 应用的、框架无关且协议可适配的生成式 UI 编译基础设施。**

Generative UI Compiler 负责解决：

> Agent 输出如何转换为前端可以安全消费的声明式 UI。

它不解决：

* 用户请求应该由哪个业务 Agent 处理；
* 多个业务 Agent 如何协作；
* 业务任务如何执行；
* 会话、审批和工作流状态如何持久化；
* 前端如何实现真实 Vue、React 或其他框架组件。

### 2.4 产品组成

Generative UI Compiler MVP 包含两个核心模块：

1. **UI Compiler Core**
   * 完成 Markdown／结构化数据到 UI IR 的转换；
   * 根据 Component Catalog 选择受控组件；
   * 将 UI IR 编译为 A2UI；
   * 执行 Schema 校验和降级处理。

2. **UI Compiler Agent**
   * 将 UI Compiler Core 封装为可独立部署的 HTTP／AG-UI 服务；
   * 负责网络协议、请求生命周期、错误映射和可观测性；
   * 不负责业务推理、业务工具调用、Agent 路由或任务编排。

“Agent”是现有模块名称，表示面向 Agent 生态提供调用入口，不表示该模块是业务智能体。

### 2.5 统一术语链路

```text
Agent Output
    ↓
AgentPresentationResult（Presentation Contract，外部输入契约）
    ↓
UI Compiler Core
    ↓
UISurfaceIR（Compiler 内部中间表示）
    ↓
A2UI Operations（当前默认外部 UI 输出协议）
    ↓
Frontend Runtime + Component Registry（外部系统）
    ↓
真实 UI 组件
```

术语约束：

* **Presentation Contract**：描述业务 Agent 提交给 Compiler 的展示结果。
* **UI IR**：Compiler 内部的框架无关中间表示。
* **A2UI**：当前 MVP 默认的外部声明式 UI 输出协议。
* **Component Catalog**：Compiler 可选择组件的声明、语义和 Schema。
* **Component Registry**：前端 Runtime 中“组件类型 → 真实组件实现”的映射，不属于当前 MVP。

禁止将 Presentation Contract、UI IR、A2UI 和 Component Registry 混用为同一概念。

### 2.6 当前阶段结论

当前 MVP 不建设 Interaction Gateway。

MVP 运行链路：

```text
业务 Agent / 测试工具 / 其他调用方
                │
                │ HTTP / AG-UI
                ▼
        UI Compiler Agent
                │
                │ 公开的编译用例调用
                ▼
         UI Compiler Core
                │
                ▼
          A2UI / Fallback
                │
                ▼
      外部 Frontend Runtime
```

未来需要统一管理多个业务 Agent 时，可以增加独立的 Interaction Gateway：

```text
Frontend
    │
    ▼
Interaction Gateway
    ├── Business Agents
    └── Generative UI Compiler
            ├── UI Compiler Agent
            └── UI Compiler Core
```

该图表达产品能力关系，不强制规定未来必须采用 HTTP 还是同进程 SDK 集成。

---

## 3. 建设目标

### 3.1 核心目标

系统必须实现：

1. 接收 Markdown 输入。
2. 接收 JSON 结构化数据输入。
3. 将输入转换为内部 UI IR。
4. 将 UI IR 编译为 A2UI。
5. 根据 Component Catalog 选择受控组件。
6. 禁止生成 Catalog 中不存在的组件。
7. 对组件属性、结构、数据绑定和 Action 执行 Schema 校验。
8. 支持 Action 描述和 Action Schema 校验。
9. 编译失败时返回模板、Markdown 或纯文本降级结果。
10. UI Compiler Core 可脱离网络服务独立运行。
11. UI Compiler Agent 可独立部署。
12. UI Compiler Agent 支持 HTTP 调用。
13. UI Compiler Agent 支持 AG-UI 调用。
14. 核心编译逻辑不绑定 Vue、React、CopilotKit 或具体 Agent 框架。
15. 各共享包能够独立构建、测试和发布。
16. 支持通过 Catalog 描述通用组件和领域组件，但不实现真实领域组件。

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
* `ui-compiler-agent`；
* Presentation Contract；
* 编译输入输出契约；
* Component Catalog Schema；
* UI IR；
* Markdown Parser；
* 结构化数据分析；
* 展示意图识别；
* 组件选择；
* A2UI 编译；
* Schema 校验；
* HTTP Adapter；
* AG-UI Adapter；
* 错误、超时和取消；
* 模板和 Markdown 降级；
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
* 输出业务结果或 Presentation Contract。

本项目不判断业务结果是否正确，只校验展示契约是否有效。

#### 4.2.3 Copilot Runtime

Copilot Runtime 可以作为外部代理层调用 UI Compiler Agent，但不属于本期建设范围。

#### 4.2.4 Interaction Gateway

Interaction Gateway 是未来可选的上层 Agent 协作能力，用于：

* 多业务 Agent 路由；
* Agent 协作和结果聚合；
* Thread、Run、任务和审批状态管理；
* 用户 Action 回传；
* 中断、恢复和权限控制。

Interaction Gateway 不属于 Generative UI Compiler 的内部模块，不得成为 Compiler 的运行前置条件。

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
│ UI Compiler Agent               │
│                                 │
│ HTTP Endpoint                   │
│ AG-UI Endpoint                  │
│ Request Validator               │
│ Application Service             │
│ Output Adapter                  │
│ Error Handler                   │
│ Observability                   │
└────────────────┬────────────────┘
                 │ compile use case
                 ▼
┌─────────────────────────────────┐
│ UI Compiler Core                │
│                                 │
│ Input Validator                 │
│ Markdown Parser                 │
│ Presentation Analyzer           │
│ Catalog Loader                  │
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

UI Compiler Core
负责“业务结果如何转换为受控的声明式 UI”

UI Compiler Agent
负责“如何通过网络协议调用编译能力”

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

MVP 采用以下目录结构：

```text
generative-ui-platform/
├─ apps/
│  └─ ui-compiler-agent/
├─ packages/
│  ├─ ui-compiler-core/
│  ├─ presentation-contract/
│  ├─ component-catalog-schema/
│  ├─ compiler-contract/
│  ├─ ag-ui-adapter/
│  └─ shared-types/
├─ tests/
│  ├─ fixtures/
│  ├─ contract/
│  ├─ integration/
│  └─ e2e/
├─ docs/
│  ├─ REQUIREMENTS.md
│  ├─ ARCHITECTURE.md
│  └─ CONTRACTS.md
├─ pnpm-workspace.yaml
├─ package.json
├─ tsconfig.base.json
└─ turbo.json
```

MVP 不创建：

```text
apps/interaction-gateway/
packages/frontend-runtime/
packages/component-registry/
```

未来扩展必须保持包可独立构建和发布。

---

## 7. 模块目录

### 7.1 UI Compiler Agent

```text
apps/ui-compiler-agent/
├─ src/
│  ├─ http/
│  │  ├─ controllers/
│  │  ├─ routes/
│  │  └─ middleware/
│  ├─ ag-ui/
│  │  ├─ endpoint/
│  │  ├─ event-mapper/
│  │  └─ run-handler/
│  ├─ application/
│  │  └─ compile-use-case.ts
│  ├─ config/
│  ├─ observability/
│  ├─ bootstrap.ts
│  └─ main.ts
├─ tests/
├─ package.json
├─ tsconfig.json
└─ Dockerfile
```

### 7.2 UI Compiler Core

```text
packages/ui-compiler-core/
├─ src/
│  ├─ input-validator/
│  ├─ markdown-parser/
│  ├─ presentation-analyzer/
│  ├─ catalog-loader/
│  ├─ component-selector/
│  ├─ ui-ir/
│  ├─ a2ui-compiler/
│  ├─ schema-validator/
│  ├─ fallback/
│  ├─ compiler.ts
│  └─ index.ts
├─ tests/
├─ package.json
└─ tsconfig.json
```

### 7.3 共享契约包

#### `presentation-contract`

负责：

* `AgentPresentationResult`；
* `PresentationIntent`；
* `ActionIntent`；
* 业务展示结果元数据。

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
* 编译阶段定义。

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

```text
ui-compiler-agent
├─ ui-compiler-core
├─ presentation-contract
├─ compiler-contract
├─ component-catalog-schema
├─ ag-ui-adapter
└─ shared-types

ui-compiler-core
├─ presentation-contract
├─ compiler-contract
├─ component-catalog-schema
└─ shared-types

ag-ui-adapter
├─ compiler-contract
└─ shared-types
```

### 8.2 禁止的依赖

```text
ui-compiler-core → ui-compiler-agent
ui-compiler-core → AG-UI Server
ui-compiler-core → HTTP Framework
ui-compiler-core → CopilotKit
ui-compiler-core → Vue
ui-compiler-core → React
ui-compiler-core → LangGraph
ui-compiler-core → Browser API
ui-compiler-core → Frontend Component Registry
```

共享契约包不得反向依赖应用层。

---

## 9. 模块职责

### 9.1 UI Compiler Core

UI Compiler Core 必须负责：

1. 校验编译输入。
2. 解析 Markdown。
3. 读取结构化数据。
4. 识别或推断展示意图。
5. 加载指定 Component Catalog。
6. 选择合法组件，包括 Catalog 中声明的领域组件。
7. 规划组件层级和布局。
8. 生成 UI IR。
9. 将 UI IR 编译为 A2UI。
10. 校验 UI IR 和 A2UI。
11. 生成降级结果。
12. 返回编译诊断信息。

UI Compiler Core 禁止负责：

* HTTP 服务；
* AG-UI Run 生命周期；
* 业务 Agent 路由；
* 业务推理或工具调用；
* 权威业务状态；
* 用户长期记忆；
* 真实前端组件实现；
* Component Registry 运行；
* 前端组件渲染。

### 9.2 UI Compiler Agent

UI Compiler Agent 必须负责：

1. 暴露 HTTP 编译接口。
2. 暴露 AG-UI 编译接口。
3. 校验网络层请求。
4. 调用 UI Compiler Core 的公开编译接口。
5. 将结果转换为 HTTP 响应。
6. 将结果转换为 AG-UI 事件。
7. 处理请求超时。
8. 处理请求取消。
9. 处理协议层错误。
10. 提供健康检查。
11. 提供版本信息。
12. 记录请求和编译日志。

UI Compiler Agent 禁止负责：

* 业务推理；
* 业务知识维护；
* 业务工具调用；
* 多业务 Agent 路由；
* Agent 编排；
* 权威业务状态；
* 复杂会话管理；
* 前端真实渲染。

---

## 10. 核心数据契约

所有公共契约必须定义在共享包中。

### 10.1 展示意图

```ts
export type PresentationIntent =
  | "summary"
  | "status"
  | "comparison"
  | "timeline"
  | "confirmation"
  | "form"
  | "detail";
```

### 10.2 Presentation Contract

```ts
export interface AgentPresentationResult {
  contentType: "markdown" | "structured-data";

  content?: string;
  data?: unknown;

  presentationIntent?: PresentationIntent;
  actions?: ActionIntent[];

  metadata?: {
    sourceAgentId?: string;
    resultId?: string;
    domain?: string;
    timestamp?: string;
  };
}
```

约束：

1. `contentType = "markdown"` 时，`content` 必须存在且非空。
2. `contentType = "structured-data"` 时，`data` 必须存在。
3. `content` 和 `data` 可以同时存在，但 `contentType` 表示主要输入。
4. UI Compiler 不校验业务结果是否真实，只校验展示契约是否合法。
5. `sourceAgentId` 只表示来源，不用于当前 MVP 的 Agent 路由。

### 10.3 Action

```ts
export interface ActionIntent {
  actionId: string;
  actionType: string;
  label: string;

  ownerAgentId?: string;
  resourceId?: string;
  payload?: Record<string, unknown>;

  requiresApproval?: boolean;
  destructive?: boolean;
}
```

MVP 中 Action 只用于生成 UI 描述，不实现 Action 回传业务 Agent 的完整链路。

约束：

* `actionId` 在同一个 Surface 内必须唯一。
* Action 类型必须在 Catalog 中允许。
* 破坏性操作必须设置 `destructive = true`。
* 需要确认的操作必须设置 `requiresApproval = true`。
* UI Compiler 不得创建未注册 Action。

### 10.4 编译请求

```ts
export interface UICompileRequest {
  requestId: string;
  threadId?: string;
  runId?: string;

  source?: {
    sourceType:
      | "ui-compiler-agent"
      | "interaction-gateway"
      | "business-agent"
      | "http"
      | "sdk"
      | "mcp";
    sourceId?: string;
    domain?: string;
  };

  presentation: AgentPresentationResult;

  catalog: {
    catalogId: string;
    catalogVersion: string;
  };

  context?: {
    locale?: string;
    theme?: string;
    viewport?: {
      width: number;
      height: number;
    };
    userPreferences?: Record<string, unknown>;
  };
}
```

`threadId` 和 `runId` 是可选的协议关联字段。Core 可以透传，但不得据此维护会话状态或 Run 生命周期。

### 10.5 编译结果

```ts
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface UICompileMetadata {
  catalogId: string;
  catalogVersion: string;
  compilerVersion: string;
  compileDurationMs: number;
}

export interface CompileFallback {
  type: "template" | "markdown" | "text";
  content: JsonValue;
  reason: string;
  errorCode: string;
}

interface UICompileResultBase {
  requestId: string;
  metadata: UICompileMetadata;
}

export type UICompileResult = UICompileResultBase &
  (
    | {
        success: true;
        degraded: false;
        surfaceId: string;
        operations: A2UIOperation[];
        fallback?: never;
        errors?: never;
      }
    | {
        success: true;
        degraded: true;
        surfaceId?: never;
        operations?: never;
        fallback: CompileFallback;
        errors: CompileError[];
      }
    | {
        success: false;
        degraded: false;
        surfaceId?: never;
        operations?: never;
        fallback?: never;
        errors: CompileError[];
      }
  );
```

`success` 表示调用方是否获得可消费结果；完整 A2UI 和降级内容都属于可消费结果。

### 10.6 编译错误

```ts
export type CompileStage =
  | "input-validation"
  | "markdown-parse"
  | "presentation-analysis"
  | "catalog-loading"
  | "component-selection"
  | "ui-ir"
  | "a2ui-compile"
  | "schema-validation"
  | "fallback"
  | "output-adapter";

export interface CompileError {
  code: string;
  message: string;
  stage: CompileStage;
  retryable: boolean;
  details?: unknown;
}
```

错误代码必须稳定，禁止仅通过自然语言文本判断错误类型。

---

## 11. Component Catalog 与 Component Registry

### 11.1 Component Catalog 定义

```ts
export interface ComponentDefinition {
  type: string;
  description: string;
  propsSchema: unknown;

  allowedChildren?: string[];
  allowedActions?: string[];
  domains?: string[];
  fallbackComponent?: string;
}

export interface ComponentCatalog {
  catalogId: string;
  catalogVersion: string;
  components: ComponentDefinition[];
}
```

### 11.2 Catalog 所有权

Generative UI Compiler 负责处理：

* Catalog ID；
* Catalog Version；
* 组件类型和语义；
* Props Schema；
* Action Schema；
* 组件嵌套关系；
* 领域标签；
* 降级组件定义。

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

```ts
export interface UISurfaceIR {
  surfaceId: string;
  catalogId: string;
  catalogVersion: string;
  layout: LayoutIR;
  components: ComponentIR[];
  dataModel: Record<string, unknown>;
  actions?: ActionIntent[];
  fallbackMarkdown?: string;
}
```

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

---

## 13. UI Compiler Core 功能需求

### 13.1 输入校验

#### CORE-001

系统必须校验 `UICompileRequest`。

#### CORE-002

系统必须校验 `requestId`、输入内容、Catalog、Action、数据嵌套深度和数据项数量。

#### CORE-003

输入校验失败时不得继续执行 UI 编译。资源阈值必须通过配置注入，不得硬编码。

HTTP 请求体字节数由 UI Compiler Agent 在反序列化之前校验。

### 13.2 Markdown 解析

#### CORE-004

系统必须使用确定性 Markdown Parser 生成 AST。

#### CORE-005

MVP 至少支持标题、段落、列表、表格、引用、代码块、图片、链接和分隔线。

#### CORE-006

禁止完全依赖大模型解析 Markdown 基础语法。

#### CORE-007

系统必须过滤或拒绝 Script、内联 JavaScript、危险 URL、不支持 HTML 和超限结构。

### 13.3 结构化数据处理

#### CORE-008

系统必须支持 JSON 结构化数据输入。

#### CORE-009

系统应根据展示意图、数据字段、数量、层级、领域信息、Catalog 和 Actions 决定展示结构。

#### CORE-010

MVP 至少支持：

| 展示意图 | 推荐组件 |
|---|---|
| summary | Card、Text、List |
| status | Card、Table、Alert |
| comparison | Table、Card |
| timeline | Timeline、Steps |
| confirmation | Card、Button |
| form | Form |
| detail | Card、List、Table |

#### CORE-011

未指定 `presentationIntent` 时，系统可以推断；推断结果必须受 Catalog 限制。

### 13.4 组件选择

#### CORE-012

所有组件必须来自当前 Catalog。

#### CORE-013

组件选择应考虑展示意图、内容结构、数据规模、组件描述、嵌套约束、Actions、领域信息和 Viewport。

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

系统必须将 UI IR 编译为 A2UI Operations。

#### CORE-019

MVP 至少支持 Surface 创建、组件创建与更新、数据模型更新、Action 绑定、Surface 替换和删除。

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
固定 UI 模板
    ↓
原始 Markdown
    ↓
纯文本错误
```

#### CORE-025

降级结果必须包含降级类型、原因、原始错误代码和 `degraded = true`。

#### CORE-026

UI 编译失败不得导致有效业务内容完全丢失。

---

## 14. UI Compiler Agent 功能需求

### 14.1 HTTP 接口

#### AGENT-001

必须提供：

```text
POST /api/ui-compiler/compile
```

请求体使用 `UICompileRequest`，响应体使用 `UICompileResult`。

#### AGENT-002

必须提供：

```text
GET /health
GET /version
```

#### AGENT-003

HTTP 层必须处理请求体限制、JSON 解析、参数校验、超时、取消和错误状态码转换。

### 14.2 AG-UI 接口

#### AGENT-004

UI Compiler Agent 必须提供 AG-UI 兼容入口。

#### AGENT-005

AG-UI Run 至少包含：

```text
RUN_STARTED
编译处理事件或状态
A2UI／Fallback 结果
RUN_FINISHED 或 RUN_ERROR
```

#### AGENT-006

AG-UI Adapter 负责协议事件，不得将 Run 生命周期逻辑放入 UI Compiler Core。

#### AGENT-007

AG-UI 输出中的 A2UI 数据必须来自已经通过 Schema 校验的编译结果。

### 14.3 独立运行

#### AGENT-008

UI Compiler Agent 必须能够独立启动。

#### AGENT-009

UI Compiler Agent 不得依赖 Interaction Gateway、前端应用、Copilot Runtime 或真实业务 Agent。

#### AGENT-010

必须提供独立 Dockerfile。

### 14.4 服务身份

#### AGENT-011

UI Compiler Agent 必须被实现为编译能力的服务适配层，而不是业务 Agent。

#### AGENT-012

UI Compiler Agent 不得主动选择、调用或编排业务 Agent。

---

## 15. 状态与缓存

### 15.1 Core 状态

UI Compiler Core 应优先保持无状态。

可以缓存：

* Component Catalog；
* Catalog Schema；
* Markdown AST；
* 相同输入的编译结果；
* 编译器静态配置。

不得保存：

* 业务任务状态；
* 用户长期记忆；
* 业务 Agent 会话；
* 工作流 Checkpoint；
* 权威审批状态；
* 前端 Component Registry 实例。

### 15.2 Agent 状态

UI Compiler Agent 可以维护当前请求的临时 Run 上下文，只用于请求关联、日志追踪、取消、超时和 AG-UI 生命周期。

请求结束后不得将其视为权威业务状态。

---

## 16. 非功能需求

### 16.1 框架独立性

UI Compiler Core 不得依赖 Vue、React、CopilotKit、LangGraph、CrewAI、浏览器环境或特定模型供应商。

需要模型能力时，必须通过可替换 Adapter 接入。

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
| `REQUEST_BODY_TOO_LARGE` | 请求体超过限制 | UI Compiler Agent |
| `DATA_DEPTH_EXCEEDED` | 数据嵌套深度超过限制 | UI Compiler Core |
| `DATA_ITEMS_EXCEEDED` | 数据项数量超过限制 | UI Compiler Core |
| `COMPILE_TIMEOUT` | 编译执行超时 | UI Compiler Agent |
| `MODEL_TIMEOUT` | 模型调用超时 | Model Adapter |
| `MODEL_RETRY_EXHAUSTED` | 模型重试耗尽 | Model Adapter |

### 16.5 可观测性

每次请求至少记录：

* `requestId`；
* `sourceType`；
* `sourceId`；
* `catalogId`；
* `catalogVersion`；
* `contentType`；
* `presentationIntent`；
* 编译阶段及各阶段耗时；
* 总耗时；
* 是否重试；
* 是否降级；
* 降级原因；
* 错误代码；
* 编译器版本。

### 16.6 性能

系统应该缓存 Catalog 和重复 Schema，使用确定性 Markdown Parser，在本地执行 Schema 校验，避免不必要的模型调用，并为后续增量编译预留接口。

系统不得静默截断或摘要业务数据。

---

## 17. 测试要求

### 17.1 单元测试

必须覆盖 Input Validator、Markdown Parser、Presentation Analyzer、Catalog Loader、Component Selector、UI IR Builder、A2UI Compiler、Schema Validator、Fallback Generator 和 Error Mapper。

### 17.2 契约测试

必须覆盖：

* `AgentPresentationResult`；
* `ActionIntent`；
* `UICompileRequest`；
* `UICompileResult`；
* `CompileError`；
* Component Catalog；
* AG-UI 事件封装。

### 17.3 集成测试

必须验证：

1. Markdown → UI IR → A2UI。
2. 结构化数据 → UI IR → A2UI。
3. HTTP → Core → HTTP Response。
4. AG-UI → Core → AG-UI Events。
5. Catalog 不兼容降级。
6. 非法组件、Props、Action 和嵌套降级。
7. 编译超时和请求取消。
8. Markdown 和纯文本错误降级。
9. Catalog 中领域组件的合法选择。
10. 未声明领域组件被拦截。

### 17.4 Fixture

必须提供：

* 基础 Component Catalog；
* 至少一个领域 Component Catalog 示例；
* Markdown 示例；
* 结构化状态、比较、时间线、确认和表单数据；
* 非法 Catalog；
* 非法 Props；
* 超大输入；
* 超时模拟。

领域组件 Fixture 只包含声明和数据，不包含真实前端组件代码。

---

## 18. MVP 验收标准

### 18.1 工程验收

* Monorepo 可以安装依赖、构建、类型检查和测试。
* `ui-compiler-agent` 可以独立构建和启动。
* `ui-compiler-core` 可以独立导入。
* 共享契约没有重复定义。
* 禁止依赖关系未出现。
* Docker 镜像可以成功构建。

### 18.2 Core 验收

* Markdown 和 JSON 可以转换为 UI IR。
* 七类展示意图均有测试用例。
* UI IR 可以转换为 A2UI。
* 未注册组件、非法 Props、嵌套和 Action 会被拦截。
* Catalog 不兼容会报错或降级。
* 编译失败会返回降级结果。
* Catalog 中声明的领域组件可以被选择。
* Core 不依赖网络、前端、Component Registry 或 Agent 框架。

### 18.3 Agent 验收

* HTTP 可以完成 Markdown 和结构化数据编译。
* AG-UI 可以完成一次编译 Run。
* AG-UI Run 有明确开始和结束事件。
* A2UI 和降级结果可以通过 AG-UI 返回。
* `/health` 和 `/version` 可用。
* UI Compiler Agent 可以独立运行。
* UI Compiler Agent 不依赖 Interaction Gateway。
* UI Compiler Agent 不包含业务推理、路由和编排能力。

---

## 19. 实施顺序

### 阶段一：工程和契约

完成 Monorepo、TypeScript、Workspace、公共契约、错误模型、Catalog Schema 和测试框架。

### 阶段二：确定性编译链路

完成 Input Validator、Markdown Parser、基础和领域 Catalog Fixture、规则分析器、组件选择、UI IR、A2UI Compiler、Schema Validator 和 Fallback。

阶段目标：

```text
Markdown / JSON
      ↓
Presentation Contract
      ↓
UI Compiler Core
      ↓
UI IR
      ↓
A2UI / Fallback
```

### 阶段三：可选智能分析

确定性链路稳定后，可以增加模型 Adapter，用于展示意图推断、复杂内容语义分析、组件组合建议和布局规划。

模型输出仍必须转换为 UI IR 并通过 Schema 校验。

### 阶段四：UI Compiler Agent

完成 HTTP Server、HTTP 编译接口、AG-UI Endpoint、Run 生命周期、错误转换、健康检查、版本接口和 Dockerfile。

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
13. 未将 UI Compiler Agent 实现为业务 Agent。

---

## 21. 关键技术决策

| 编号 | 决策 |
|---|---|
| TD-001 | 当前 MVP 产品是 Generative UI Compiler |
| TD-002 | 当前 MVP 只建设 UI Compiler Core 和 UI Compiler Agent |
| TD-003 | Interaction Gateway 是未来独立可选扩展，不属于 Compiler 内部模块 |
| TD-004 | UI Compiler Core 是唯一核心编译能力 |
| TD-005 | UI Compiler Agent 是 Core 的网络适配服务，不是业务 Agent |
| TD-006 | 项目采用 Monorepo，共享包可以独立发布 |
| TD-007 | Core 不依赖网络协议、前端框架和具体 Agent 框架 |
| TD-008 | Presentation Contract 是外部输入契约 |
| TD-009 | Markdown 和结构化数据统一进入 UI IR |
| TD-010 | UI IR 当前默认编译为 A2UI |
| TD-011 | 组件只能来自 Component Catalog |
| TD-012 | Component Catalog 属于 Compiler 契约，Component Registry 属于外部 Frontend Runtime |
| TD-013 | 领域组件可以通过 Catalog 扩展，但真实组件实现不属于 MVP |
| TD-014 | 所有 A2UI 必须通过 Schema 校验 |
| TD-015 | UI Compiler Agent 同时提供 HTTP 和 AG-UI 接口 |
| TD-016 | Action MVP 只生成描述，不实现完整业务回传 |
| TD-017 | MVP 支持一次性 A2UI，预留增量输出 |
| TD-018 | 所有失败必须返回明确错误或降级结果 |
| TD-019 | 业务 Agent、Frontend Runtime、Component Registry 和 Interaction Gateway 均为外部系统 |

---

## 22. 后续可选能力：Interaction Gateway

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

约束：

1. Gateway 必须把 Generative UI Compiler 视为独立产品能力。
2. Gateway 不得复制或吸收 UI 编译逻辑。
3. 独立部署时，Gateway 可以通过 HTTP／AG-UI 调用 UI Compiler Agent。
4. 同进程或 SDK 部署时，可以调用 UI Compiler Core 的公开 API，但不得依赖 Core 内部目录或实现细节。
5. 无论采用哪种集成方式，架构文档都应表达为“Gateway 组合 Generative UI Compiler”，而不是“Gateway 包含 Compiler”。
6. Interaction Gateway 不得成为 UI Compiler Agent 的运行依赖。

当前阶段不为 Interaction Gateway 创建应用目录、接口、数据库或验收标准。

---

## 23. 待确认事项

以下事项不阻塞当前需求确认，但必须在对应阶段开始前形成 ADR：

| 待确认事项 | 决策截止点 |
|---|---|
| A2UI Schema 版本 | 阶段二开始前 |
| Markdown Parser | 阶段二开始前 |
| Schema 校验库 | 阶段二开始前 |
| 模型 Adapter 接口 | 阶段三开始前 |
| Node HTTP 框架 | 阶段四开始前 |
| AG-UI SDK 版本 | 阶段四开始前 |
| A2UI 自定义事件载荷格式 | 阶段四开始前 |

以下事项必须在相关功能进入验收前形成 ADR：

| 待确认事项 | 决策要求 |
|---|---|
| Component Catalog 存储方式 | 在引入持久化实现前完成 |
| Catalog 与外部 Component Registry 的版本协商方式 | 在接入真实 Runtime 前完成 |
| 编译结果缓存策略 | 在启用缓存前完成 |
| 日志和链路追踪方案 | 阶段五验收前完成 |

在没有明确决策前，编码 Agent 不得将具体实现硬编码到 UI Compiler Core。