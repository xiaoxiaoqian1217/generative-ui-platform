# Generative UI Platform 平台需求

**文档状态：** 当前平台级规范

**适用范围：** 整个 Generative UI Platform 仓库

## 1. 建设背景

仓库最初以 Generative UI Compiler MVP 为当前交付重点。

随着 Agent Runtime Host、Web Workbench 和完整链路验证需求出现，仓库当前范围已经扩展为一个包含多个子系统的平台工程。

原 Compiler MVP 需求继续有效，但只约束 UI Compiler 子系统。

## 2. 平台定位

Generative UI Platform 是面向 Agent 应用的生成式 UI 编译与交互运行基础设施。

平台接收 Business Agent 输出的 Markdown 或结构化业务数据，并将其转换为安全 Markdown 或受控 A2UI。

平台不允许模型直接生成并执行任意 HTML、JavaScript、Vue 或 React 代码。

## 3. 需要解决的问题

平台必须解决：

- Business Agent 与前端展示协议解耦。
- 不同 Business Agent 通过统一 Adapter 接入。
- Agent 输出的展示模式由 UI Compiler 决定。
- 模型输出作为不可信 UI Plan Candidate 处理。
- Component Catalog、Props、Action 和数据绑定得到统一校验。
- A2UI 在浏览器中通过受控 Component Registry 渲染。
- 用户 Action 经过 Runtime Host 校验后回传 Business Agent。
- 完整链路可以开发、联调、诊断和自动回归。

## 4. 当前平台组成

当前平台包括：

- UI Compiler Core。
- UI Compiler Service。
- Presentation Router。
- UI Compiler Model Adapter。
- Agent Runtime Host。
- Business Agent Adapter。
- Reference Business Agent。
- Generative UI Workbench。
- A2UI Renderer。
- Component Catalog 和 Component Registry。
- 平台端到端测试与诊断能力。

## 5. 核心输入与输出

Business Agent 只需要输出：

```ts
type AgentContent =
  | {
      contentType: "markdown";
      markdown: string;
    }
  | {
      contentType: "structured-data";
      data: unknown;
      fallbackMarkdown?: string;
    };
```

UI Compiler Service 的规范输入是 `PresentationRequest`。

UI Compiler Service 的规范输出是 `PresentationResult`。

UI Compiler Core 是唯一可信 A2UI 生产者。

## 6. 强制架构边界

### 6.1 Web 入口

Web 必须只连接 Agent Runtime Host。

Web 禁止直接调用 Business Agent、UI Compiler Service 或模型供应商。

### 6.2 Business Agent

Business Agent 负责业务推理、业务工具、业务状态和工作流。

Business Agent 禁止输出 UI Plan Candidate 或 A2UI。

Business Agent 不需要支持 AG-UI、CopilotKit 或前端私有协议。

### 6.3 Business Agent Adapter

Business Agent Adapter 负责协议适配、请求转换、结果规范化、超时、取消和错误映射。

Runtime Host 不得直接依赖具体 Business Agent 框架。

### 6.4 UI Compiler Model Adapter

Model Adapter 属于 UI Compiler Service。

Model Adapter 负责根据 AgentContent、Catalog 和展示上下文生成不可信 UI Plan Candidate。

Model Adapter 不负责 Business Agent 的业务推理和工具调用。

### 6.5 UI Compiler Core

Core 必须保持框架、网络协议、Agent 框架和模型供应商无关。

Core 不决定展示模式，也不调用模型。

### 6.6 A2UI Renderer

Renderer 只能渲染 Component Registry 中注册的组件。

Renderer 禁止执行模型生成的任意代码。

### 6.7 Action

Action Payload 必须视为不可信输入。

Runtime Host 必须校验 Surface、Run、Action 和权限上下文。

前端不得通过 Action 任意调用后端业务工具。

## 7. 当前阶段建设范围

当前阶段允许并要求建设：

- TypeScript LangGraph Reference Business Agent。
- Business Agent Adapter。
- Runtime Host Run 和 Action 编排。
- UI Compiler Model Adapter 的 Fixture 与真实模型验证。
- Vue Web Workbench。
- Markdown Renderer。
- A2UI Renderer。
- Component Registry。
- Action 回传闭环。
- HTTP 和 WebSocket 双链路。
- 一键启动和平台 E2E。

## 8. 当前阶段非目标

当前阶段不建设：

- Interaction Gateway。
- 多 Business Agent 动态路由。
- 多 Agent 自主协作。
- 生产业务数据库。
- 用户权限和计费系统。
- 真实设备控制。
- 任意代码生成。
- 完整 A2UI 全规范。
- 正式业务生产应用。

## 9. 完成标准

平台开发验证环境完成时必须满足：

- 全新克隆后可以冻结安装依赖。
- 一条命令可以启动 Web、Runtime Host、Reference Business Agent 和 UI Compiler Service。
- Fixture 模式不需要模型 API Key。
- 至少一个真实 UI Compiler 模型供应商通过 Smoke Test。
- HTTP 和 WebSocket 完整链路通过。
- Markdown 和 A2UI 均可在浏览器展示。
- Action 可以回传并恢复 Business Agent 流程。
- Playwright E2E 在 CI 中稳定通过。
- API Key 不进入浏览器、日志或版本库。
