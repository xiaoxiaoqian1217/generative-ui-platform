# GOAL-DEV-EXPERIENCE-001：可复现开发启动、全链路调试与浏览器 E2E

本 Goal 为 Generative UI Platform 建立从干净克隆到 Fixture 全链路验证的确定性开发体验。

它交付统一环境变量契约、快速初始化、单应用与三服务启动入口、doctor、真实 Provider smoke、浏览器调试说明和自包含 Playwright E2E。

Fixture 是默认模式，且不读取或依赖模型密钥。

真实 Provider 只通过显式 `--provider=real` 或 `pnpm test:provider-smoke` 启用。

本 Goal 不新增独立 Presentation Pipeline 或 UI Compiler Service，不实现 Interaction Gateway 或多 Agent 路由。

生产交付仅限安全配置契约、构建入口和启动前校验。

它不声明 Runtime Host 或 Reference Business Agent 已具备公网生产部署能力。
