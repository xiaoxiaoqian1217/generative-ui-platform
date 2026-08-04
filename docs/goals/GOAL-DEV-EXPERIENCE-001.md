# GOAL-DEV-EXPERIENCE-001：可复现开发启动、全链路调试与浏览器 E2E

本 Goal 为 Generative UI Platform 建立从干净克隆到真实 Provider 联调和确定性浏览器验证的可复现开发体验。

它交付统一环境变量契约、快速初始化、单应用与三服务启动入口、doctor、真实 Provider 联调说明、浏览器调试说明和自包含 Playwright E2E。

日常三服务启动使用显式配置的真实 Presentation Model Provider。

浏览器 E2E 使用测试进程内的确定性替身或受控测试服务，且不读取或依赖模型密钥。

真实 Provider 通过标准 `pnpm dev:platform` 服务端配置启用。

真实 Provider 仅通过 Workbench 进行开发人员联调，不属于 CI 或合并门槛。

本 Goal 不新增独立 Presentation Pipeline 或 UI Compiler Service，不实现 Interaction Gateway 或多 Agent 路由。

生产交付仅限安全配置契约、构建入口和启动前校验。

它不声明 Runtime Host 或 Reference Business Agent 已具备公网生产部署能力。

## 与 ADR-0021 的关系

本 Goal 遵循 ADR-0021。

它不恢复可通过运行配置启用的 Fixture Provider、Fixture 应用模式或额外 Fixture 服务。

确定性验证的边界是测试进程内注入的契约对象和受控测试服务。
