# Generative UI Platform 平台架构

**文档状态：** 当前平台级架构规范

## 1. 系统上下文

```text
用户
  |
  v
Generative UI Workbench
  |
  | HTTP / WebSocket
  v
Agent Runtime Host
  |                    \
  |                     \ PresentationRequest
  v                      v
Business Agent Adapter   UI Compiler Service
  |                      |
  v                      v
Reference / Real         Presentation Router
Business Agent           |
  |                      v
  | Markdown / JSON      Model Adapter
  +--------------------> UI Plan Candidate
                         |
                         v
                   UI Compiler Core
                         |
                         v
                   PresentationResult
                         |
                         v
                Workbench Renderer
                         |
                         v
                     Action Event
                         |
                         v
                Agent Runtime Host
```

## 2. 子系统职责

### 2.1 Generative UI Workbench

- 作为 Frontend Runtime 参考实现。
- 只连接 Agent Runtime Host。
- 展示 Markdown 和 A2UI。
- 承载 Component Registry。
- 发送结构化 Action Event。
- 提供开发诊断和验收场景。

### 2.2 Agent Runtime Host

- 提供 Web 的统一入口。
- 管理 Run 和 Action 生命周期。
- 调用 Business Agent Adapter。
- 将 AgentContent 包装为 PresentationRequest。
- 调用 UI Compiler Service。
- 将 PresentationResult 返回 Web。
- 维护最小 Surface 和 Action 上下文。
- 不承担展示规划和 A2UI 编译。

### 2.3 Business Agent Adapter

- 隔离 Runtime Host 与具体 Agent 框架。
- 适配 Agent 原生 HTTP 或其他协议。
- 规范化 Markdown 或结构化业务结果。
- 处理超时、取消和错误映射。
- 不生成 UI Plan Candidate 或 A2UI。

### 2.4 Reference Business Agent

- 使用 TypeScript LangGraph 提供开发验证场景。
- 负责业务意图、工具、状态、暂停和恢复。
- 输出 AgentContent。
- 不依赖 A2UI、Component Catalog 或 UI Compiler Model Adapter。

### 2.5 UI Compiler Service

- 接收 PresentationRequest。
- 清洗 Markdown 和校验结构化数据。
- 加载并校验 Component Catalog。
- 执行 Presentation Router。
- 组装具体 Model Adapter。
- 调用 UI Compiler Core。
- 返回 PresentationResult。

### 2.6 Model Adapter

- 位于 UI Compiler Service 内部。
- 处理 Business Agent 输出的内容和展示上下文。
- 返回符合 Schema 的 UI Plan Candidate 候选。
- 隔离 Kimi、豆包、GLM、通义千问等供应商差异。
- 不直接产生可信 A2UI。

### 2.7 UI Compiler Core

- 将 UI Plan Candidate 视为不可信输入。
- 根据 Catalog 校验组件、Props、Action 和结构。
- Lowering 为可信 UI IR。
- 编译 A2UI。
- 产生确定性错误和降级诊断。

### 2.8 A2UI Renderer

- 消费 PresentationResult 的 generative-ui 分支。
- 应用 A2UI Operations。
- 通过 Component Registry 渲染真实 Vue 组件。
- 校验数据绑定和 Action。
- 对非法或未知组件受控降级。

## 3. 主运行链路

```text
1. Web 发送 Run Request。
2. Runtime Host 创建 requestId、threadId 和 runId。
3. Runtime Host 调用 Business Agent Adapter。
4. Business Agent 返回 Markdown 或结构化数据。
5. Runtime Host 构造 PresentationRequest。
6. UI Compiler Service 执行展示路由和编译。
7. Runtime Host 返回 PresentationResult。
8. Web 渲染 Markdown 或 A2UI。
9. 用户触发 Action。
10. Runtime Host 校验并恢复 Business Agent。
11. 新业务结果再次进入 UI Compiler。
12. Web 更新 Surface。
```

## 4. 协议边界

- Business Agent Contract 描述业务调用和业务结果。
- Presentation Contract 描述展示编译输入和输出。
- A2UI 描述浏览器可渲染的声明式 Surface。
- HTTP 和 WebSocket 是 Web 与 Runtime Host 的传输选择。
- AG-UI 可以作为未来或可选传输适配，但不是 Business Agent 的强制协议。

## 5. 依赖方向

```text
apps/web-workbench
  -> runtime-contract
  -> presentation-contract
  -> renderer packages

apps/agent-runtime-host
  -> business-agent-contract
  -> presentation-contract
  -> Business Agent Adapter
  -> UI Compiler HTTP Client

apps/business-agent-langgraph
  -> business-agent-contract

apps/ui-compiler-service
  -> presentation-contract
  -> component-catalog-schema
  -> model adapter
  -> ui-compiler-core

packages/ui-compiler-core
  -> contract packages only
```

禁止方向：

- packages 依赖 apps。
- UI Compiler Core 依赖 Runtime Host、前端、Agent 框架或模型 SDK。
- Business Agent 依赖 A2UI Renderer。
- Web 直接依赖 Business Agent 私有协议。

## 6. 部署边界

开发环境默认包含四个进程：

```text
Web Workbench       :5173
Agent Runtime Host  :8200
Business Agent      :8300
UI Compiler Service :3000
```

这些进程可以独立部署和替换。

当前阶段优先保证本地开发和 CI 可重复运行，不要求形成生产级高可用部署。

## 7. 与旧 Compiler 架构的关系

`docs/ARCHITECTURE.md` 描述 UI Compiler MVP 的内部架构和历史集成边界。

该文档继续作为 Compiler 子系统基线。

本文件在平台范围、Runtime Host、Workbench、Reference Business Agent 和完整链路方面具有更高优先级。

Compiler 内部职责未被推翻，只是从仓库顶层架构调整为平台核心子系统架构。
