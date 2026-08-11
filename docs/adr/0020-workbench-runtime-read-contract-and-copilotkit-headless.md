# Workbench 通过 Runtime 只读契约与 CopilotKit Headless 集成

## 状态

**部分被 ADR-0026 取代。**

Generative UI Workbench 采用 CopilotKit Headless 作为前端 Agent Runtime 集成层，并且只能连接 Agent Runtime Host。
Workbench 所需的 Catalog 摘要、已加载场景元数据和运行状态必须由 Runtime Host 的 Schema 校验只读 Runtime Contract 提供。
该决定避免浏览器直接读取 Business Agent、Presentation Pipeline、Component Catalog 内部 Package 或模型供应商配置。

## 原始决策背景

本 ADR 形成时，平台同时存在 CopilotKit Headless、HTTP Run 和 WebSocket Run 验证入口。
因此原文曾把 CopilotKit、HTTP 和 WebSocket 描述为映射到同一 RunOrchestrator 的并列运行入口。

ADR-0026 已明确取代这一协议层级表述。
当前规范是：Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 应用协议，当前参考 Transport 为 HTTP POST + SSE；HTTP、SSE 和 WebSocket 不与 AG-UI 作为并列业务协议。
迁移期仍存在的自定义 HTTP / WebSocket Run 端点只能作为 compatibility / debug adapter，不再构成新的 Workbench Agent 规范入口。

## 考虑的方案

- Workbench 直接调用 Business Agent、Presentation Pipeline 或读取内部 Package；
- Workbench 只使用自定义 HTTP 与 WebSocket Client；
- Workbench 通过 CopilotKit Headless 和 Runtime Host，并从 Runtime Contract 获取只读查询数据。

最终采用第三种方案。
其中“通过 CopilotKit Headless 参与 Agent 交互”和“从 Runtime Host 获取只读查询数据”的核心决定继续有效。

## 继续有效的决定

- Workbench 只能连接 Agent Runtime Host；
- Workbench 使用受控 CopilotKit Headless 集成，而不是直接连接 Business Agent；
- Runtime Host 必须为 Catalog 摘要、场景元数据和 Runtime Snapshot 等非 Agent 数据提供稳定、只读、脱敏且经 Schema 校验的契约；
- CopilotKit 接入不得绕过 Presentation Pipeline、Runtime Kernel 或 Runtime Truth 边界；
- Component Action 必须继续通过 Runtime Host 的受控 Command / Action Admission 边界；
- 浏览器不接收模型密钥、令牌、设备凭证或 Provider 原始响应。

## 被 ADR-0026 取代的部分

以下旧表述不再作为当前架构依据：

- CopilotKit、HTTP 和 WebSocket 是三个并列的 Workbench Agent 运行入口；
- Workbench 需要在自定义 HTTP Run Contract 与 WebSocket Run Contract 之间切换；
- 以是否共享同一个 RunOrchestrator 作为三种入口等价性的主要架构保证。

当前应使用以下分层理解：

```text
Workbench
   │ AG-UI
   │ over HTTP POST + SSE
   ▼
Embedded CopilotKit Runtime
   ▼
PlatformRunService
   ▼
Runtime Kernel
```

具体协议与 Transport 边界以 ADR-0026 为准。
Runtime Truth 与安全 Command Admission 以 ADR-0024 为准。
