# Workbench 通过 Runtime 只读契约与 CopilotKit Headless 集成

## 状态

已接受。

Generative UI Workbench 采用 CopilotKit Headless 作为前端 Agent Runtime 集成层，并且只能连接 Agent Runtime Host。
Workbench 所需的 Catalog 摘要、已加载场景元数据和运行状态必须由 Runtime Host 的 Schema 校验只读 Runtime Contract 提供。
该选择让 CopilotKit 的运行与现有 HTTP、WebSocket 使用同一 RunOrchestrator，同时避免浏览器直接读取 Business Agent、Presentation Pipeline、Component Catalog 内部包或模型供应商配置。

## 考虑的方案

- Workbench 直接调用 Business Agent、Presentation Pipeline 或读取内部 Package。
- Workbench 只使用自定义 HTTP 与 WebSocket Client。
- Workbench 通过 CopilotKit Headless 和 Runtime Host，并从 Runtime Contract 获取只读查询数据。

## 后果

- Runtime Host 必须为 Catalog 摘要和场景元数据定义稳定、只读、脱敏且经 Schema 校验的 Runtime Contract。
- CopilotKit Headless Adapter 必须调用与 HTTP 和 WebSocket 相同的 RunOrchestrator，且不得绕过 Presentation Pipeline。
- Component Action 继续通过 Runtime Host 的 Action 契约回传。
- 浏览器不接收模型密钥、令牌、设备凭证或 Provider 原始响应。
