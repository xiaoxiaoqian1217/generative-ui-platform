# Generative UI Platform 需求规格说明书

**文档版本：** 1.0
**项目阶段：** MVP
**目标读者：** 产品负责人、架构师、开发人员、测试人员、Codex、Claude Code 等编码 Agent

## 1. 文档约定

- **必须（MUST）**：不可省略。
- **应该（SHOULD）**：原则上实现，除非有明确技术原因。
- **可以（MAY）**：可选能力。
- **禁止（MUST NOT）**：不得实现或不得形成该依赖。

编码 Agent 必须遵守：

1. 不得擅自扩大需求范围。
2. 不得将前端、Copilot Runtime 或真实业务 Agent 纳入本期实现。
3. 不得绕过共享契约重复定义类型。
4. 不得让 `ui-compiler-core` 依赖网络服务、前端框架或 Agent 框架。
5. 冲突时以“系统边界”和“关键技术决策”为准。
6. 未明确的细节优先采用简单、可测试、可替换的实现。

## 2. 项目概述

### 2.1 背景

不同业务 Agent 可能采用不同框架、协议、消息格式、状态结构和展示方式。前端逐个适配会导致强耦合、重复建设、状态不一致，以及操作无法准确回传。

### 2.2 项目定位

本项目是**面向多智能体应用的生成式 UI 编译与统一交互平台**，包含：

1. **UI Compiler Core**：框架和协议无关的编译核心。
2. **UI Compiler Agent**：将 Core 封装为可独立部署的 HTTP / AG-UI 服务。
3. **Interaction Gateway**：面向前端提供统一 AG-UI 接口，协调业务 Agent 并调用 Core。

## 3. 建设目标

系统必须：

1. 将 Markdown 和结构化数据转换为受控声明式 UI。
2. 生成独立 UI IR，并编译为 A2UI。
3. 只生成 Component Catalog 中注册的组件和 Action。
4. 对输入、UI IR 和输出执行 Schema 校验。
5. 编译失败时返回模板、Markdown 或纯文本降级结果。
6. 使 UI Compiler Core 可独立运行和复用。
7. 使 UI Compiler Agent 可独立部署。
8. 使 Interaction Gateway 通过 AG-UI 与前端通信。
9. 使前端不直接依赖具体业务 Agent。
10. 支持多个业务 Agent Adapter。
11. 支持用户操作经 Gateway 回传原业务 Agent。
12. 使各应用和共享包可独立构建、测试和发布。

### 3.1 非目标

MVP 不建设：

- 前端应用、A2UI Renderer、Vue/React 组件；
- Copilot Runtime；
- 真实业务 Agent；
- 通用 Agent 开发框架；
- 多 Agent 自主规划、并行协作和分布式工作流；
- 长期用户记忆和业务数据库；
- 业务权限系统；
- 低代码编辑器；
- 任意 HTML、CSS、JavaScript、Vue 或 React 代码生成。

## 4. 系统范围

### 4.1 本期交付

- `ui-compiler-core`；
- `ui-compiler-agent`；
- `interaction-gateway`；
- 共享契约和 Component Catalog Schema；
- UI IR 和 A2UI 编译；
- AG-UI 适配和 HTTP 编译接口；
- Business Agent Adapter 机制；
- Run、Action、Surface 关联；
- 错误、超时和降级；
- 基础日志和可观测性；
- 单元、契约和集成测试；
- Docker 构建能力。

### 4.2 范围外系统

#### 前端

前端负责发送和接收 AG-UI、渲染 A2UI、实现组件、发送 Action 和渲染降级内容。本项目不实现这些能力。

#### Copilot Runtime

Runtime 是可选代理层：

```text
Frontend → AG-UI → Copilot Runtime → AG-UI → Interaction Gateway
```

不使用 Runtime 时：

```text
Frontend → AG-UI → Interaction Gateway
```

#### 业务 Agent

业务 Agent 负责业务推理、工具调用、权威业务状态、Checkpoint、权限和长期业务记忆。本项目只定义 Adapter 和输出契约。

## 5. 总体架构

```text
Frontend（范围外）
       │ AG-UI
       ▼
Copilot Runtime（可选、范围外）
       │ AG-UI
       ▼
Interaction Gateway
       ├─ Agent Registry / Router / Adapters
       ├─ Run Manager / Action Router / Surface Registry
       ├─ Presentation Normalizer / Event Aggregator
       └─ Compiler Adapter
              │
              ▼
       UI Compiler Core
       ├─ Markdown Parser
       ├─ Presentation Analyzer
       ├─ Catalog Selector
       ├─ UI IR Builder
       ├─ A2UI Compiler
       ├─ Schema Validator
       └─ Fallback
```

独立编译模式：

```text
外部调用方 → HTTP / AG-UI → UI Compiler Agent → UI Compiler Core
```

## 6. Monorepo 结构

```text
generative-ui-platform/
├─ apps/
│  ├─ ui-compiler-agent/
│  └─ interaction-gateway/
├─ packages/
│  ├─ ui-compiler-core/
│  ├─ presentation-contract/
│  ├─ component-catalog-schema/
│  ├─ compiler-contract/
│  ├─ gateway-contract/
│  ├─ ag-ui-adapter/
│  └─ shared-types/
└─ tests/
   ├─ fixtures/
   ├─ contract/
   ├─ integration/
   └─ e2e/
```

## 7. 模块依赖规则

允许：

```text
ui-compiler-agent → ui-compiler-core + shared contracts + ag-ui-adapter
interaction-gateway → ui-compiler-core + shared contracts + ag-ui-adapter
ui-compiler-core → shared contracts only
```

禁止：

```text
ui-compiler-core → apps/*
ui-compiler-agent → interaction-gateway
interaction-gateway → ui-compiler-agent（代码依赖）
```

独立部署时，Gateway 可以通过 HTTP 调用 UI Compiler Agent；这是运行时调用，不是代码依赖。

## 8. 模块职责

### 8.1 UI Compiler Core

负责：输入校验、Markdown AST、结构化数据理解、展示意图、Catalog 选择、布局规划、UI IR、A2UI、Schema 校验、降级和诊断。

禁止：启动 HTTP 服务、管理 AG-UI Run、路由业务 Agent、调用业务工具、保存权威业务状态、依赖前端或 Agent 框架。

### 8.2 UI Compiler Agent

负责：HTTP/AG-UI 接口、外部请求校验、Core 调用、协议响应、超时取消、健康检查、版本和日志。

### 8.3 Interaction Gateway

负责：统一 AG-UI Endpoint、业务 Agent 注册和显式路由、事件透传、最终结果标准化、Core 调用、A2UI 事件封装、Run/Action/Surface 关联和 Action 回传。

禁止：业务推理、权威业务状态、复杂自主规划、长期业务记忆、UI 组件选择和布局规划。

## 9. 核心数据契约

所有契约必须位于共享包。

### 9.1 业务展示结果

```ts
export type PresentationIntent =
  | "summary"
  | "status"
  | "comparison"
  | "timeline"
  | "confirmation"
  | "form"
  | "detail";

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

约束：Markdown 必须包含 `content`；结构化数据必须包含 `data`。

### 9.2 Action

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

Action ID 在 Surface 内唯一；交互 Action 应携带 owner；破坏性和审批操作必须显式标记。

### 9.3 编译请求

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
  catalog: { catalogId: string; catalogVersion: string };
  context?: {
    locale?: string;
    theme?: string;
    viewport?: { width: number; height: number };
    userPreferences?: Record<string, unknown>;
  };
}
```

### 9.4 编译结果

```ts
export interface UICompileResult {
  requestId: string;
  success: boolean;
  surfaceId?: string;
  operations?: A2UIOperation[];
  fallback?: {
    type: "template" | "markdown" | "text";
    content: unknown;
  };
  metadata: {
    catalogId: string;
    catalogVersion: string;
    compilerVersion: string;
    compileDurationMs: number;
    degraded: boolean;
  };
  errors?: CompileError[];
}
```

错误必须包含稳定错误代码、处理阶段和 `retryable`。

## 10. Component Catalog

Catalog 至少包含：ID、版本和组件定义。组件定义至少包括名称、语义描述、Props Schema、允许子组件、允许 Action、领域和降级组件。

MVP 基础组件：`Text`、`Markdown`、`Card`、`List`、`Table`、`Alert`、`Button`、`Form`、`Steps`、`Timeline`。

UI Compiler 必须禁止未注册组件、未注册 Action、任意代码和任意浏览器调用。

## 11. UI IR

A2UI 前必须生成可序列化、无可执行代码、无 DOM、无组件实例、无 Store、无前端 Hook 的独立 UI IR。A2UI 是当前默认目标，但 IR 应允许未来扩展其他输出协议。

## 12. 功能需求

### 12.1 Markdown

- 使用确定性 Parser 生成 AST。
- 支持标题、段落、列表、表格、引用、代码块、图片、链接和分隔线。
- 不得完全依赖大模型识别语法。
- 必须过滤 Script、内联 JavaScript、危险 URL、不支持 HTML、过深嵌套和超限内容。

### 12.2 结构化数据

根据展示意图、字段结构、数据数量、层级、领域、Catalog 和 Actions 选择展示。

MVP 支持：summary、status、comparison、timeline、confirmation、form、detail。

### 12.3 UI IR 和 A2UI

- A2UI 前必须生成并校验 UI IR。
- 支持 Surface 创建、组件创建/更新、数据模型更新、Action 绑定、Surface 替换和删除。
- MVP 可一次性生成，但必须预留增量 Operations。

### 12.4 Schema 校验

必须校验组件类型、Props、必填字段、嵌套关系、引用、数据绑定、Action、Catalog ID 和版本。校验不可关闭。

Catalog 不兼容时依次：兼容版本 → 基础组件 → 固定模板 → Markdown/文本。

### 12.5 UI Compiler Agent

必须提供：

```text
POST /api/ui-compiler/compile
POST /ag-ui
GET /health
GET /version
```

### 12.6 Interaction Gateway

- 提供统一 AG-UI Endpoint。
- 前端不需要业务 Agent 真实地址。
- MVP 使用显式 `targetAgentId`。
- 支持至少一种 Adapter，并预留 AG-UI、HTTP、MCP 和 SDK。
- 尽量实时透传文本、进度、工具、状态、错误和中断。
- 最终结果标准化为 `AgentPresentationResult`。
- MVP 默认直接调用 Core。
- 每个 Run 必须进入完成、失败、中断、等待输入或等待审批之一。

## 13. Action 和 Surface 路由

Gateway 必须维护：

```text
actionId → ownerAgentId/threadId/runId/resourceId/surfaceId
surfaceId → requestId/sourceAgentId/resultId/catalogId/catalogVersion
```

Gateway 只负责关联和转发，不负责真实业务操作。

## 14. 状态所有权

- 权威业务状态、Checkpoint、长期业务记忆：业务 Agent 或业务系统。
- Run、目标 Agent、Action 路由、Surface 关联：Interaction Gateway。
- Catalog、AST 和编译缓存：UI Compiler。
- 真实 UI 渲染状态：前端。

Gateway 禁止复制完整设备状态、任务状态、工作流数据、权威审批结果和用户完整画像。

## 15. 降级策略

```text
动态 A2UI → 固定模板 → 原始 Markdown → 纯文本错误
```

降级结果必须包含类型、原因、稳定错误代码、安全的原始内容或摘要，并设置 `degraded = true`。

## 16. 非功能需求

### 16.1 独立性

Core 不依赖 CopilotKit、Vue、React、LangGraph、CrewAI、浏览器和具体模型供应商。模型通过可替换 Adapter 调用。

### 16.2 可靠性

必须设置外部请求、模型和业务 Agent 超时；限制重试；区分可重试错误；保证 Run 明确结束；支持取消和健康检查。

重要 Action 和 Surface 关联不得只存在内存。MVP 可提供内存实现，但必须抽象持久化接口。

### 16.3 安全性

禁止执行模型代码；清理危险 Markdown；校验 Props/Action；限制请求体、数据量和嵌套深度；日志不得输出敏感原文；预留权限扩展点；不得向前端暴露业务 Agent 地址。

### 16.4 可观测性

记录 requestId、threadId、runId、Agent、resultId、surfaceId、actionId、Catalog、阶段、各阶段耗时、重试、降级、错误代码和编译器版本。

### 16.5 性能

缓存 Catalog 和 Schema；使用确定性 Markdown Parser；本地校验；流式透传业务进度；大表格执行截断、分页或摘要；预留增量编译。

## 17. 测试要求

### 17.1 单元测试

覆盖 Parser、Analyzer、Catalog Selector、UI IR、A2UI Compiler、Validator、Fallback、Action Router、Surface Registry 和错误转换。

### 17.2 契约测试

覆盖 Presentation、Compile Request/Result、Catalog、Agent Registration、AG-UI 封装和路由结构。

### 17.3 集成测试

必须验证 Markdown 和 JSON 编译、HTTP/AG-UI Agent、Gateway 到 Mock Agent、Action 回传、Catalog 不兼容、降级、超时和错误。

### 17.4 Mock

提供 Mock Frontend、至少两个 Mock Business Agent、基础 Mock Catalog、Markdown/JSON/Error/Timeout Fixtures。

## 18. MVP 验收

- 两个应用独立构建和启动。
- Core 独立导入，不依赖网络和 Agent 框架。
- 共享契约无重复定义，禁止依赖未出现。
- Markdown/JSON 可转换为 UI IR 和 A2UI。
- 七类展示意图可处理。
- 非法组件、Props、嵌套和 Action 被拦截。
- Catalog 不兼容可报错或降级。
- UI Compiler Agent 的 HTTP、AG-UI、health、version 可用。
- Gateway 可路由至少两个 Mock Agent、透传进度、返回 A2UI、接收和转发 Action。
- 每个 Run 有明确状态。
- Gateway 不保存完整业务状态。

## 19. 实施顺序

1. Monorepo、契约、错误模型、Catalog Schema 和测试框架。
2. UI Compiler Core。
3. UI Compiler Agent。
4. Interaction Gateway。
5. Mock、契约、集成和 E2E 验收。

## 20. Definition of Done

功能完成必须同时满足：职责和依赖正确、公共类型位于共享包、输入输出均校验、错误代码稳定、日志含关联 ID、测试和文档同步、无真实范围外系统依赖、构建/类型检查/测试通过。

## 21. 关键技术决策

| 编号 | 决策 |
|---|---|
| TD-001 | Monorepo |
| TD-002 | 两个应用入口：UI Compiler Agent、Interaction Gateway |
| TD-003 | UI Compiler Core 为唯一编译核心 |
| TD-004 | Gateway MVP 直接调用 Core |
| TD-005 | UI Compiler Agent 不是 Gateway 的代码依赖 |
| TD-006 | 前端与 Gateway 使用 AG-UI |
| TD-007 | A2UI 作为 AG-UI 事件载荷 |
| TD-008 | MVP 使用显式 targetAgentId |
| TD-009 | Gateway 只保存交互和路由状态 |
| TD-010 | 权威业务状态归业务系统 |
| TD-011 | 组件只能来自 Catalog |
| TD-012 | 真实组件归前端 |
| TD-013 | MVP 一次性 A2UI，预留增量输出 |
| TD-014 | 所有失败必须有错误或降级结果 |

## 22. 待确认事项

AG-UI/A2UI 版本、Node HTTP 框架、Markdown Parser、Schema 库、模型 Adapter、Gateway 持久化、链路追踪、Catalog 存储、增量事件格式、Runtime 正式集成和首批领域 Catalog，应通过 ADR 决策，禁止硬编码进 Core。
