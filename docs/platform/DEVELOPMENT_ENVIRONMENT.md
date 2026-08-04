<!-- cspell:ignore doubao qwen -->

# 平台开发验证环境

## 定位和边界

本环境是 Generative UI Platform 的开发、联调、诊断、自动化回归和能力演示基础设施。
本环境不是正式业务产品，也不控制真实设备、生产数据、身份权限或长期会话。
Reference Business Agent 只是确定性的全链路验证参考实现，不是正式业务 Agent。
旧 Compiler MVP 文档仍是 Compiler 子系统的历史基线。
ADR-0019 已将其中“独立 UI Compiler Service”的部署结论替换为 Runtime Host 内嵌的 Presentation Pipeline Package。

```text
Generative UI Workbench :5173
        │ HTTP / WebSocket
        ▼
Agent Runtime Host :8200
        ├── Business Agent Adapter ──► Reference Business Agent :8300
        └── Embedded Presentation Pipeline Package
                ├── Sanitizer / Validator / Catalog
                ├── Presentation Router / Model Adapter
                └── UI Compiler Core ──► PresentationResult
```

Workbench 只能连接 Agent Runtime Host。
浏览器不配置或访问 Business Agent 私有地址、Presentation Pipeline、UI Compiler Core、Model Provider 或 API Key。
Presentation Pipeline 是 `packages/presentation-pipeline`，运行在 Runtime Host 进程内，不启动独立端口。
不存在当前目标内的 UI Compiler HTTP Service、UI Compiler Client、`UI_COMPILER_URL` 或 Embedded / Remote 双模式。
Model Adapter 属于展示决策子系统，只接收清理后的 AgentContent、展示上下文和 Catalog 摘要。
Model Adapter 不参与 Business Agent 推理、工具调用、业务状态或 Resume。
它输出的 PresentationDecision 仍不可信，只有选择 `generative-ui` 时才包含 UI Plan Candidate。
UI Compiler Core 是唯一可信的 A2UI 生产者。

## 安装和启动

需要 Node.js 24 或更高版本及 pnpm 10.13.1。
新克隆仓库必须使用冻结锁文件安装。

```bash
pnpm install --frozen-lockfile
pnpm check:platform-environment
pnpm dev:platform
```

`pnpm dev:platform` 在一个父进程下启动下列三个服务。

| 服务 | 地址 | 职责 |
| --- | --- | --- |
| Generative UI Workbench | `http://127.0.0.1:5173` | 浏览器参考运行时和演示界面。 |
| Agent Runtime Host | `http://127.0.0.1:8200` | Run 与 Action 编排，以及进程内 Pipeline 组合根。 |
| Reference Business Agent | `http://127.0.0.1:8300` | 确定性业务 Fixture、内存 Checkpoint 与 Resume。 |

启动器会等待 Workbench、Runtime Host、Reference Business Agent 及 Runtime 依赖健康检查均成功。
使用 `pnpm dev:platform -- --background` 时，健康检查成功后启动器返回并保留三个后台服务。
按 Ctrl+C 会停止并清理启动器创建的子进程。
如果启动终端意外关闭，请运行 `pnpm stop:platform`。
不要在 Windows 与 WSL 中同时为同一工作树启动平台，因为它们会争用 5173、8200 和 8300 端口。

运行中的环境可用下列命令复查。

```bash
node scripts/check-platform-environment.mjs --require-running --require-build
```

`http://127.0.0.1:8200/health/dependencies` 会检查远程 Reference Business Agent，并报告 Presentation Pipeline、Model Provider 和 Catalog 的进程内状态。
健康响应和 Workbench 诊断不会包含 API Key、完整业务内容、Provider 原始响应或未脱敏 Action Payload。

## 真实 Presentation Model 与测试替身

Workbench 的日常运行要求配置真实 Presentation Model。
Runtime Host 支持 `kimi`、`doubao`、`glm`、`qwen` 和 `openai-compatible` Provider。
真实 Provider 只由 Runtime Host 内嵌的 Presentation Pipeline 调用。
单元、集成和浏览器测试在测试进程内注入确定性契约替身，而不启动 Fixture Provider 或依赖外部模型服务。

在启动 Runtime Host 前必须设置服务端环境变量。

```powershell
$env:PRESENTATION_MODEL_PROVIDER = "qwen"
$env:PRESENTATION_MODEL_NAME = "<模型名>"
$env:PRESENTATION_MODEL_API_KEY = "<密钥>"
pnpm dev:platform
```

`openai-compatible` 还必须设置 `PRESENTATION_MODEL_BASE_URL`。
`PRESENTATION_MODEL_ENDPOINT_ID` 是可选部署标识，不能替代模型名或 API Key。
可用 `PRESENTATION_MODEL_TIMEOUT_MS` 和 `PRESENTATION_MODEL_RETRY_COUNT` 控制展示路由的超时和有限重试。
这些变量只能留在服务端环境中，绝不能放进 `VITE_*`、`runtime-config.js`、浏览器诊断或日志。

## 演示流程

先访问 `http://127.0.0.1:5173`。
Workbench 默认使用 HTTP，并在界面左侧显示 Runtime Host 地址与健康状态。

1. 点击“设备状态”或输入“查看当前可用的无人机和无人车”。
2. Reference Business Agent 返回结构化设备业务数据，而不是 UI Plan 或 A2UI。
3. Runtime Host 通过 Business Agent Adapter 接收结果，并调用进程内 Embedded Presentation Pipeline。
4. Model Adapter 通过已配置的真实 Provider 生成不可信的 PresentationDecision 候选。
5. `generative-ui` 候选中的 UI Plan Candidate 经过 Schema、Policy、Catalog、Props、Action 和绑定校验。
6. UI Compiler Core 编译已验证候选为 A2UI，Workbench 的受控 Component Registry 渲染 Surface。
7. 在“诊断摘要”中确认 `requestId`、`runId` 和 `presentationRequestId`。
8. 点击“巡防方案”或输入“使用一架无人机和两台无人车巡查 A 区域”。
9. 在生成的界面点击“Confirm patrol plan”，并在浏览器确认框中显式批准。
10. Runtime Host 校验 surface、Action、Catalog 和 Payload 后恢复同一 `threadId` 与 `runId` 的 Reference Business Agent Checkpoint。
11. Resume 结果会再次经过同一个 Embedded Presentation Pipeline，并替换 Workbench 中的 PresentationResult。

点击“Markdown 摘要”可以演示安全 Markdown 路径。
原始 HTML 和危险链接会被安全展示层处理，而不是执行。
默认不显示 A2UI Raw Operations，用户必须在界面中显式展开只读查看器。

## HTTP、WebSocket 与验证

Workbench 的 HTTP 端点是 `POST http://127.0.0.1:8200/api/runs` 与 `POST http://127.0.0.1:8200/api/actions`。
Workbench 的 WebSocket 端点是 `ws://127.0.0.1:8200/ws/runs`。
使用 CopilotKit Headless 的前端应配置 `http://127.0.0.1:8200/api/copilotkit` 作为 Runtime URL。
该端点通过 Runtime Adapter 使用同一个 RunOrchestrator，并以 AG-UI 事件发送 PresentationResult。
两种传输共享同一个 RunOrchestrator、Runtime Contract、Action 校验和 Presentation Pipeline。
在 Workbench 左侧选择“WebSocket”，再重复“设备状态”和“巡防方案”流程即可验证等价编排。

```bash
pnpm build:platform
pnpm test:e2e:platform
pnpm verify:platform
pnpm docs:check
```

`pnpm test:e2e:platform` 会构建 workspace 依赖并启动受控测试服务。
该测试使用真实 Chromium 和进程内测试替身，覆盖 HTTP Markdown 与 A2UI、WebSocket、Action Resume、相关 ID 诊断及安全 Markdown 降级。
`pnpm verify:platform` 依次构建、检查环境并执行同一套平台 E2E。

## 排障

| 现象 | 首先检查 | 处理 |
| --- | --- | --- |
| 启动失败或端口被占用 | `pnpm check:platform-environment` 的端口错误。 | 执行 `pnpm stop:platform`，确认 5173、8200、8300 已释放后重试。 |
| Workbench 显示 Runtime Host 不可用 | `http://127.0.0.1:8200/health`。 | 确认 `pnpm dev:platform` 仍在运行，并检查 Runtime Host 启动输出。 |
| 依赖健康检查失败 | `http://127.0.0.1:8200/health/dependencies`。 | `BUSINESS_AGENT_UNREACHABLE` 表示 8300 不可达，`BUSINESS_AGENT_UNHEALTHY` 表示 Agent 响应异常。 |
| 真实 Provider 无法启动 | Runtime Host 服务端环境变量。 | 核对 Provider、模型名、API Key、可选 Base URL 与 Endpoint ID，且不要把密钥写入前端变量。 |
| 展示降级为 Markdown | Workbench 的 PresentationResult 与诊断摘要。 | Fixture 故障、Provider、候选校验或编译失败都会保留有效业务结果并安全降级。 |
| Action 被拒绝 | Action 的 `threadId`、`runId`、`surfaceId`、`actionId`、Payload 和审批状态。 | 重新运行生成 Surface，并从当前 Surface 触发 Action；Surface 被消费后不能重放。 |

## 相关文档

- [平台需求](./REQUIREMENTS.md)
- [平台架构](./ARCHITECTURE.md)
- [平台一键开发环境实现说明](./PLATFORM_DEVELOPMENT.md)
- [ADR-0018](../adr/0018-expand-repository-scope-to-platform-validation-environment.md)
- [ADR-0019](../adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [Presentation Pipeline Package](../../packages/presentation-pipeline/README.md)
- [Runtime Host](../../apps/agent-runtime-host/README.md)
- [Reference Business Agent](../../apps/business-agent-langgraph/README.md)
- [Workbench](../../apps/web-workbench/README.md)
