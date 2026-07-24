# Generative UI Platform - Generative UI Compiler MVP 需求规格说明书

**文档版本：** 1.1
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
2. 不得将前端、真实业务 Agent、Copilot Runtime 或 Interaction Gateway 纳入本期实现。
3. 不得绕过共享契约，在不同模块重复定义公共类型。
4. 不得让 `ui-compiler-core` 依赖网络服务、前端框架或 Agent 框架。
5. 不得生成或执行任意前端代码。
6. 出现需求冲突时，以“系统边界”和“关键技术决策”章节为准。
7. 未明确的技术细节应选择简单、可测试、可替换的实现。

---

## 2. 项目概述

### 2.1 名称与范围

| 名称 | 定位 | 本文含义 |
|---|---|---|
| Generative UI Platform | 仓库名称和长期平台定位 | 承载当前 Compiler MVP 及未来平台能力 |
| Generative UI Compiler | 当前 MVP 产品 | 本文的需求、开发和验收对象 |
| Interaction Gateway | 未来平台扩展能力 | 不属于当前 MVP 范围 |

仓库长期使用 Generative UI Platform 作为名称。

本文标题中的 Generative UI Compiler 表示当前 MVP 产品，不表示仓库从 Platform 更名为 Compiler。

除非文档明确说明未来阶段，本文中的“项目”和“系统”均指当前 Generative UI Compiler MVP。

### 2.2 背景

业务 Agent 通常以 Markdown 或结构化数据返回结果。

如果每个前端应用都自行完成结果解析、组件选择和界面生成，将产生以下问题：

* UI 转换逻辑重复建设；
* Agent 输出和前端组件强耦合；
* 生成结果缺少统一约束；
* 不同前端的渲染结果不一致；
* 缺少统一的 Schema 校验；
* 缺少稳定的错误处理和降级机制；
* UI 生成能力无法被其他 Agent 或系统复用。

本项目建设独立的生成式 UI 编译能力，将 Markdown 或结构化数据转换为受控的 A2UI 数据。

### 2.3 项目定位

本项目定位为：

> 框架无关、协议可适配的生成式 UI 编译服务。

项目包含两个核心模块：

1. **UI Compiler Core**
   负责完成 Markdown／结构化数据到 UI IR、A2UI 的核心编译过程。

2. **UI Compiler Agent**
   将 UI Compiler Core 封装为可独立调用和部署的 HTTP／AG-UI 服务。

### 2.4 当前阶段结论

当前 MVP 不建设 Interaction Gateway。

MVP 运行链路为：

```text
外部调用方
业务 Agent / 测试工具 / Runtime
           │
           │ HTTP 或 AG-UI
           ▼
UI Compiler Agent
           │
           │ 内部函数调用
           ▼
UI Compiler Core
           │
           ▼
A2UI / Fallback
```

未来需要统一管理多个业务 Agent 时，再增加：

```text
Frontend
   ↓ AG-UI
Interaction Gateway
   ├─ Business Agents
   └─ UI Compiler Core
```

Interaction Gateway 不属于当前文档的开发和验收范围。

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
7. 对所有组件属性和结构执行 Schema 校验。
8. 支持 Action 描述和 Action Schema 校验。
9. 编译失败时返回模板、Markdown 或纯文本降级结果。
10. UI Compiler Core 可脱离网络服务独立运行。
11. UI Compiler Agent 可独立部署。
12. UI Compiler Agent 支持 HTTP 调用。
13. UI Compiler Agent 支持 AG-UI 调用。
14. 核心编译逻辑不绑定 Vue、React、CopilotKit 或具体 Agent 框架。
15. 各共享包能够独立构建、测试和发布。

### 3.2 非目标

MVP 不建设：

* Interaction Gateway；
* 多业务 Agent 路由；
* Agent 自动选择；
* 多 Agent 结果聚合；
* 多 Agent 自主规划；
* 用户 Action 到业务 Agent 的完整路由闭环；
* 前端应用；
* A2UI Renderer；
* Vue 或 React 组件；
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
* 编译输入输出契约；
* 业务展示结果契约；
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

以下系统仅用于说明外部关系，不属于正式交付物。

#### 前端应用

前端负责：

* 消费 A2UI；
* 实现真实组件；
* 渲染生成式 UI；
* 渲染 Markdown 降级内容；
* 发送用户交互事件。

本项目不实现前端。

#### 业务 Agent

业务 Agent负责：

* 业务推理；
* 数据查询；
* 工具调用；
* 业务规则；
* 权威业务状态；
* 工作流和 Checkpoint；
* 输出业务结果。

本项目只定义业务 Agent 可使用的展示结果契约。

#### Copilot Runtime

Copilot Runtime 可以作为外部代理层调用 UI Compiler Agent，但不属于本期建设范围。

#### Interaction Gateway

Interaction Gateway 用于未来统一连接前端和多个业务 Agent。

当前 MVP 不创建、不实现、不验收 Interaction Gateway。

---

## 5. 总体架构

### 5.1 核心架构

```text
┌───────────────────────────────┐
│ 外部调用方                    │
│ Business Agent / Runtime      │
│ Test Client / Other Service   │
└───────────────┬───────────────┘
                │
                │ HTTP / AG-UI
                ▼
┌───────────────────────────────┐
│ UI Compiler Agent             │
│                               │
│ HTTP Endpoint                 │
│ AG-UI Endpoint                │
│ Request Validator             │
│ Application Service           │
│ Output Adapter                │
│ Error Handler                 │
│ Observability                 │
└───────────────┬───────────────┘
                │
                │ 内部函数调用
                ▼
┌───────────────────────────────┐
│ UI Compiler Core              │
│                               │
│ Input Validator               │
│ Markdown Parser               │
│ Presentation Analyzer         │
│ Catalog Loader                │
│ Component Selector            │
│ UI IR Builder                 │
│ A2UI Compiler                 │
│ Schema Validator              │
│ Fallback Generator            │
└───────────────────────────────┘
```

### 5.2 职责关系

```text
业务 Agent
负责“业务结果是什么”

UI Compiler Core
负责“业务结果如何转换为声明式 UI”

UI Compiler Agent
负责“如何通过网络协议调用编译能力”

前端
负责“如何真实渲染组件”
```

---

## 6. Monorepo 结构

MVP 项目必须采用以下目录结构：

```text
generative-ui-platform/
├─ apps/
│  └─ ui-compiler-agent/
│
├─ packages/
│  ├─ ui-compiler-core/
│  ├─ presentation-contract/
│  ├─ component-catalog-schema/
│  ├─ compiler-contract/
│  ├─ ag-ui-adapter/
│  └─ shared-types/
│
├─ tests/
│  ├─ fixtures/
│  ├─ contract/
│  ├─ integration/
│  └─ e2e/
│
├─ docs/
│  ├─ REQUIREMENTS.md
│  ├─ ARCHITECTURE.md
│  └─ CONTRACTS.md
│
├─ pnpm-workspace.yaml
├─ package.json
├─ tsconfig.base.json
└─ turbo.json
```

MVP 不创建：

```text
apps/interaction-gateway/
```

后续进入多业务 Agent 阶段时再增加该应用。

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
* 业务结果元数据。

#### `component-catalog-schema`

负责：

* Catalog 定义；
* Component Definition；
* Props Schema；
* Action Schema；
* 组件嵌套约束；
* Catalog 版本。

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

禁止：

```text
ui-compiler-core → ui-compiler-agent

ui-compiler-core → AG-UI Server
ui-compiler-core → HTTP Framework
ui-compiler-core → CopilotKit
ui-compiler-core → Vue
ui-compiler-core → React
ui-compiler-core → LangGraph
ui-compiler-core → Browser API
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
6. 选择合法组件。
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
* 业务工具调用；
* 权威业务状态；
* 用户长期记忆；
* 前端组件渲染。

### 9.2 UI Compiler Agent

UI Compiler Agent 必须负责：

1. 暴露 HTTP 编译接口。
2. 暴露 AG-UI 编译接口。
3. 校验网络层请求。
4. 调用 UI Compiler Core。
5. 将结果转换为 HTTP 响应。
6. 将结果转换为 AG-UI 事件。
7. 处理请求超时。
8. 处理请求取消。
9. 处理协议层错误。
10. 提供健康检查。
11. 提供版本信息。
12. 记录请求和编译日志。

UI Compiler Agent 禁止负责：

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

### 10.2 业务展示结果

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
5. `sourceAgentId` 仅表示来源，不用于当前 MVP 的 Agent 路由。

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

`threadId` 和 `runId` 是可选的协议关联字段。

Core 可以透传这些字段，但不得根据这些字段维护会话状态或 Run 生命周期。

AG-UI Adapter 可以在协议层维护 Run 信息，但不得要求 Core 维护会话状态。

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

`success` 表示调用方是否获得了可消费结果。
完整 A2UI 和降级内容都属于可消费结果。
`degraded` 只在返回降级内容时为 `true`。
完全失败不得同时返回 Operations 或 Fallback。
所有结果都必须携带请求关联信息和编译元数据。

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

## 11. Component Catalog

### 11.1 Catalog 定义

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

真实组件实现由外部前端维护。

本项目负责处理：

* Catalog ID；
* Catalog Version；
* 组件名称；
* 组件语义；
* Props Schema；
* Action Schema；
* 组件嵌套关系；
* 降级组件定义。

### 11.3 MVP 基础组件

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

### 11.4 受控生成

UI Compiler 必须禁止生成：

* 未注册组件；
* 未注册 Action；
* 任意 HTML；
* 任意 CSS；
* 任意 JavaScript；
* 任意 Vue 或 React 组件；
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

## 13. 功能需求

### 13.1 输入校验

#### CORE-001

系统必须校验 `UICompileRequest`。

#### CORE-002

系统必须校验：

* `requestId`；
* `contentType`；
* `content` 或 `data`；
* `catalogId`；
* `catalogVersion`；
* Action 基础结构；
* 数据嵌套深度；
* 数据项数量。

#### CORE-003

输入校验失败时不得继续执行 UI 编译。

数据嵌套深度和数据项数量的阈值必须通过配置注入，不得硬编码到 UI Compiler Core。

开发阶段可以使用宽松配置，但单元测试和集成测试必须能够注入有限阈值并验证拒绝行为。

HTTP 请求体字节数必须由 UI Compiler Agent 在反序列化之前校验，不得由 UI Compiler Core 负责。

---

### 13.2 Markdown 解析

#### CORE-004

系统必须使用确定性 Markdown Parser 生成 AST。

#### CORE-005

MVP 至少支持：

* 标题；
* 段落；
* 无序列表；
* 有序列表；
* 表格；
* 引用；
* 代码块；
* 图片；
* 链接；
* 分隔线。

#### CORE-006

禁止完全依赖大模型解析 Markdown 基础语法。

#### CORE-007

系统必须过滤或拒绝：

* Script；
* 内联 JavaScript；
* 危险 URL；
* 不支持的 HTML；
* 超大嵌套结构；
* 超出大小限制的输入。

---

### 13.3 结构化数据处理

#### CORE-008

系统必须支持 JSON 结构化数据输入。

#### CORE-009

系统应根据以下信息决定展示结构：

* `presentationIntent`；
* 数据字段；
* 数据数量；
* 数据层级；
* 领域信息；
* Component Catalog；
* Actions。

#### CORE-010

MVP 至少支持：

| 展示意图         | 推荐组件             |
| ------------ | ---------------- |
| summary      | Card、Text、List   |
| status       | Card、Table、Alert |
| comparison   | Table、Card       |
| timeline     | Timeline、Steps   |
| confirmation | Card、Button      |
| form         | Form             |
| detail       | Card、List、Table  |

#### CORE-011

未指定 `presentationIntent` 时，系统可以推断。

推断结果必须受到 Catalog 限制。

---

### 13.4 组件选择

#### CORE-012

所有组件必须来自当前 Catalog。

#### CORE-013

组件选择应考虑：

* 展示意图；
* 内容结构；
* 数据数量；
* 组件描述；
* 允许的子组件；
* 允许的 Actions；
* 领域信息；
* Viewport 上下文。

#### CORE-014

无法找到匹配组件时必须进入降级流程。

---

### 13.5 UI IR

#### CORE-015

A2UI 编译前必须生成 UI IR。

#### CORE-016

UI IR 必须通过内部 Schema 校验。

#### CORE-017

UI IR 生成失败时必须返回明确的编译错误。

---

### 13.6 A2UI 编译

#### CORE-018

系统必须将 UI IR 编译为 A2UI Operations。

#### CORE-019

MVP 至少支持：

* Surface 创建；
* 组件创建；
* 组件更新；
* 数据模型更新；
* Action 绑定；
* Surface 替换；
* Surface 删除。

#### CORE-020

MVP 可以一次性返回完整 A2UI。

系统架构应预留增量输出能力，但 MVP 不要求实现真正的流式组件生成。

---

### 13.7 Schema 校验

#### CORE-021

系统必须校验：

* Component Type；
* Props；
* 必填属性；
* 子组件关系；
* 组件引用；
* 数据绑定；
* Actions；
* Catalog ID；
* Catalog Version。

#### CORE-022

Schema 校验禁止关闭。

#### CORE-023

Schema 校验失败时不得直接返回非法 A2UI。

---

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

降级结果必须包含：

* 降级类型；
* 降级原因；
* 原始错误代码；
* `degraded = true`。

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

请求体使用 `UICompileRequest`。

响应体使用 `UICompileResult`。

#### AGENT-002

必须提供：

```text
GET /health
GET /version
```

#### AGENT-003

HTTP 层必须处理：

* 请求体大小限制；
* JSON 解析错误；
* 参数校验；
* 请求超时；
* 请求取消；
* 错误状态码转换。

---

### 14.2 AG-UI 接口

#### AGENT-004

UI Compiler Agent 必须提供 AG-UI 兼容入口。

#### AGENT-005

AG-UI Run 至少应包含：

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

---

### 14.3 独立运行

#### AGENT-008

UI Compiler Agent 必须能够独立启动。

#### AGENT-009

UI Compiler Agent 不得依赖：

* Interaction Gateway；
* 前端应用；
* Copilot Runtime；
* 真实业务 Agent。

#### AGENT-010

必须提供独立 Dockerfile。

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
* 权威审批状态。

### 15.2 Agent 状态

UI Compiler Agent 可以维护当前请求的临时 Run 上下文。

该上下文仅用于：

* 请求关联；
* 日志追踪；
* 取消；
* 超时；
* AG-UI 生命周期。

请求结束后不得将其视为权威业务状态。

---

## 16. 非功能需求

### 16.1 框架独立性

UI Compiler Core 不得依赖：

* Vue；
* React；
* CopilotKit；
* LangGraph；
* CrewAI；
* 浏览器环境；
* 特定模型供应商。

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

请求超时必须通过配置注入。

启用模型 Adapter 时，模型调用超时和模型重试次数必须通过配置注入。

在对应功能进入阶段验收前，必须根据真实 Fixture、性能测试结果和部署环境约束确定相关默认值。

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

MVP 必须提供以下基础资源限制配置能力：

| 配置项 | 含义 | MVP 默认值确定时间 |
|---|---|---|
| `maxRequestBytes` | HTTP 请求体允许的最大字节数 | 阶段四验收前 |
| `maxDataDepth` | 结构化数据允许的最大嵌套层数 | 阶段二验收前 |
| `maxDataItems` | 单次请求允许处理的最大数据项数量 | 阶段二验收前 |
| `compileTimeoutMs` | 单次编译允许的最长执行时间 | 阶段五验收前 |

启用阶段三的模型 Adapter 时，还必须提供以下配置能力：

| 配置项 | 含义 | 默认值确定时间 |
|---|---|---|
| `modelTimeoutMs` | 单次模型调用允许的最长执行时间 | 阶段三验收前 |
| `modelRetryCount` | 单次编译允许的模型调用重试次数 | 阶段三验收前 |

需求确认阶段不预先规定这些配置的具体数值，也不得将未经验证的示例值直接作为验收标准。

开发环境可以使用相对宽松的配置，以便收集输入规模、执行时间和资源消耗数据。

生产部署不得关闭请求体大小、数据嵌套深度、数据项数量和超时保护。

`maxDataItems` 的统计口径必须在阶段二验收前明确，并在契约测试中保持一致。

统计口径至少需要说明数组元素、对象属性和 UI IR 节点是否分别计数。

资源限制触发后必须返回稳定错误代码，不得依赖错误文本区分原因。

MVP 资源限制错误代码至少包括：

| 错误代码 | 触发条件 | 责任模块 |
|---|---|---|
| `REQUEST_BODY_TOO_LARGE` | HTTP 请求体超过 `maxRequestBytes` | UI Compiler Agent |
| `DATA_DEPTH_EXCEEDED` | 结构化数据嵌套深度超过 `maxDataDepth` | UI Compiler Core |
| `DATA_ITEMS_EXCEEDED` | 数据项数量超过 `maxDataItems` | UI Compiler Core |
| `COMPILE_TIMEOUT` | 编译执行时间超过 `compileTimeoutMs` | UI Compiler Agent |
| `MODEL_TIMEOUT` | 模型调用时间超过 `modelTimeoutMs` | Model Adapter |
| `MODEL_RETRY_EXHAUSTED` | 可重试模型错误超过 `modelRetryCount` | Model Adapter |

未启用模型 Adapter 时，不要求实现模型相关错误代码。

### 16.5 可观测性

每次请求至少记录：

* `requestId`；
* `sourceType`；
* `sourceId`；
* `catalogId`；
* `catalogVersion`；
* `contentType`；
* `presentationIntent`；
* 编译阶段；
* Markdown 解析耗时；
* UI IR 生成耗时；
* A2UI 编译耗时；
* Schema 校验耗时；
* 总耗时；
* 是否重试；
* 是否降级；
* 降级原因；
* 错误代码；
* 编译器版本。

### 16.6 性能

系统应该：

* 缓存 Catalog；
* 缓存重复 Schema；
* 使用确定性 Markdown Parser；
* 本地执行 Schema 校验；
* 记录表格行数、列数和处理耗时；
* 避免不必要的模型调用；
* 为后续增量编译预留接口。

MVP 不规定固定毫秒指标，但必须记录性能数据。

MVP 不自动截断或摘要大型表格。

开发阶段应通过真实 Fixture 记录表格行数、列数、单元格数量、输入字节数和处理耗时，为后续策略提供依据。

后续引入大型表格截断或摘要前必须形成 ADR。

ADR 必须明确判定维度、阈值配置、处理策略、表头计数方式、最低保留规则以及 Markdown 表格与结构化数据表格的统计口径。

截断或摘要会改变输出内容，因此 ADR 还必须定义结构化通知和结果元数据契约。

系统不得静默截断或摘要表格。

---

## 17. 测试要求

### 17.1 单元测试

必须覆盖：

* Input Validator；
* Markdown Parser；
* Presentation Analyzer；
* Catalog Loader；
* Component Selector；
* UI IR Builder；
* A2UI Compiler；
* Schema Validator；
* Fallback Generator；
* Error Mapper。

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
6. 非法组件降级。
7. 非法 Props 降级。
8. 非法 Action 降级。
9. 编译超时。
10. 请求取消。
11. Markdown 降级。
12. 纯文本错误降级。

### 17.4 Fixture

必须提供：

* 基础 Component Catalog；
* Markdown 示例；
* 结构化状态数据；
* 结构化比较数据；
* 时间线数据；
* 确认操作数据；
* 表单数据；
* 非法 Catalog；
* 非法 Props；
* 超大输入；
* 超时模拟。

超大输入和超时测试必须通过测试配置注入有限阈值，不依赖开发环境的宽松默认值。

---

## 18. MVP 验收标准

### 18.1 工程验收

* Monorepo 可以安装依赖。
* 根目录可以执行构建。
* 根目录可以执行类型检查。
* 根目录可以执行测试。
* `ui-compiler-agent` 可以独立构建。
* `ui-compiler-agent` 可以独立启动。
* `ui-compiler-core` 可以独立导入。
* 共享契约没有重复定义。
* 禁止依赖关系未出现。
* Docker 镜像可以成功构建。

### 18.2 Core 验收

* Markdown 可以转换为 UI IR。
* JSON 可以转换为 UI IR。
* 七类展示意图均有测试用例。
* UI IR 可以转换为 A2UI。
* 未注册组件会被拦截。
* 非法 Props 会被拦截。
* 非法嵌套会被拦截。
* 非法 Action 会被拦截。
* Catalog 不兼容会报错或降级。
* 编译失败会返回降级结果。
* Core 不依赖网络、前端或 Agent 框架。

### 18.3 Agent 验收

* HTTP 可以完成 Markdown 编译。
* HTTP 可以完成结构化数据编译。
* AG-UI 可以完成一次编译 Run。
* AG-UI Run 有明确开始和结束事件。
* A2UI 可以通过 AG-UI 返回。
* 降级结果可以通过 AG-UI 返回。
* `/health` 可用。
* `/version` 可用。
* Agent 可以独立运行。
* Agent 不依赖 Interaction Gateway。

---

## 19. 实施顺序

### 阶段一：工程和契约

完成：

* Monorepo；
* TypeScript 配置；
* Workspace 配置；
* 公共契约；
* 错误模型；
* Catalog Schema；
* 测试框架。

### 阶段二：确定性编译链路

开始本阶段前，必须完成第 23 节中阶段二对应的 ADR。

完成：

* Input Validator；
* Markdown Parser；
* 基础 Catalog；
* 基于规则的 Presentation Analyzer；
* Component Selector；
* UI IR；
* A2UI Compiler；
* Schema Validator；
* Fallback。

阶段目标：

```text
Markdown / JSON
      ↓
UI Compiler Core
      ↓
UICompileResult
```

### 阶段三：可选智能分析

开始本阶段前，必须完成第 23 节中阶段三对应的 ADR。

在确定性链路稳定后，可以增加模型 Adapter，用于：

* 展示意图推断；
* 复杂内容语义分析；
* 组件组合建议；
* 布局规划。

模型输出仍必须转换为 UI IR 并通过 Schema 校验。

### 阶段四：UI Compiler Agent

开始本阶段前，必须完成第 23 节中阶段四对应的 ADR。

完成：

* HTTP Server；
* HTTP 编译接口；
* AG-UI Endpoint；
* Run 生命周期；
* 错误转换；
* 健康检查；
* 版本接口；
* Dockerfile。

### 阶段五：集成验收

完成：

* Contract Test；
* Integration Test；
* E2E Test；
* 超时测试；
* 取消测试；
* 降级测试；
* Docker 构建测试。

---

## 20. Definition of Done

一个功能只有同时满足以下条件才视为完成：

1. 符合模块职责。
2. 未违反依赖规则。
3. 公共类型位于共享契约包。
4. 输入经过 Schema 校验。
5. 输出经过 Schema 校验。
6. 错误使用统一错误代码。
7. 日志包含 `requestId`。
8. 具有单元测试。
9. 具有必要的契约或集成测试。
10. 文档同步更新。
11. 不依赖范围外真实系统。
12. 构建通过。
13. 类型检查通过。
14. 测试通过。

---

## 21. 关键技术决策

| 编号     | 决策                                              |
| ------ | ----------------------------------------------- |
| TD-001 | 当前 MVP 只建设 UI Compiler Core 和 UI Compiler Agent |
| TD-002 | Interaction Gateway 移至后续阶段                      |
| TD-003 | UI Compiler Core 是唯一核心编译能力                      |
| TD-004 | UI Compiler Agent 是 Core 的独立服务封装                |
| TD-005 | 项目采用 Monorepo                                   |
| TD-006 | Core 不依赖网络协议和前端框架                               |
| TD-007 | Markdown 和结构化数据统一进入 UI IR                       |
| TD-008 | UI IR 再编译为 A2UI                                 |
| TD-009 | 组件只能来自 Component Catalog                        |
| TD-010 | 所有 A2UI 必须通过 Schema 校验                          |
| TD-011 | UI Compiler Agent 同时提供 HTTP 和 AG-UI 接口          |
| TD-012 | Action MVP 只生成描述，不实现完整业务回传                      |
| TD-013 | MVP 支持一次性 A2UI，预留增量输出                           |
| TD-014 | 所有失败必须返回明确错误或降级结果                               |
| TD-015 | 业务 Agent、前端和 Runtime 均为外部系统                     |

---

## 22. 后续阶段：Interaction Gateway

当项目出现以下需求时，再启动 Interaction Gateway：

* 前端需要统一连接多个业务 Agent；
* 需要根据 Agent ID 或能力路由请求；
* 需要透传不同业务 Agent 的进度事件；
* 需要维护 Thread、Run 和 Agent 关系；
* 需要将用户 Action 回传给对应业务 Agent；
* 需要处理审批、中断和任务恢复；
* 需要聚合多个 Agent 的业务结果。

届时目录扩展为：

```text
generative-ui-platform/
├─ apps/
│  ├─ ui-compiler-agent/
│  └─ interaction-gateway/
│
└─ packages/
   └─ ui-compiler-core/
```

Interaction Gateway 应优先直接复用 `ui-compiler-core`，不应把 `ui-compiler-agent` 作为代码依赖。

```text
Interaction Gateway
        ↓
UI Compiler Core
```

只有需要独立扩容或故障隔离时，才通过 HTTP 调用 UI Compiler Agent。

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

以下事项可以在开发阶段根据实现和验证结果形成 ADR，但不得晚于相关功能进入阶段验收：

| 待确认事项 | 决策要求 |
|---|---|
| Component Catalog 存储方式 | 在引入持久化实现前完成 |
| 编译结果缓存策略 | 在启用编译结果缓存前完成 |
| 日志和链路追踪方案 | 阶段五验收前完成 |

在没有明确决策前，编码 Agent 不得将具体实现硬编码到 UI Compiler Core。
