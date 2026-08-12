<!-- cspell:ignore doubao qwen -->

# 平台开发验证环境

## 定位和边界

本环境是 Generative UI Platform 的开发、联调、诊断、自动化回归和能力演示基础设施。
本环境不是正式业务产品，也不控制真实设备、生产数据、生产身份权限或生产级长期业务会话。
Reference Business Agent 是全链路验证参考实现，不是正式业务 Agent。
旧 Compiler MVP 文档仍是 Compiler 子系统的历史基线。
ADR-0019 已将其中“独立 UI Compiler Service”的目标部署结论替换为 Runtime Host 内嵌的 Presentation Pipeline Package。

Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 应用协议。
当前参考 Transport 为 CopilotKit Runtime 的 HTTP POST + SSE 路径。
Runtime Host 与 Business Agent 之间的 HTTP + SSE / WebSocket 则属于 Business Agent Adapter 私有 Transport，两者不能混为一层。
Frontend Tool 的本地开发、自动化测试和演示可以通过显式配置让 Workbench 直接连接 AGUIMock。
该开发分支仍使用 AG-UI over HTTP POST + SSE，并且只允许无业务副作用的浏览器本地工具。

```text
Generative UI Workbench :5173
        │
        │ AG-UI
        │ over HTTP POST + SSE
        ▼
Agent Runtime Host :8200
        ├── Embedded CopilotKit Runtime
        ├── PlatformRunService / Runtime Kernel
        │     └── Runtime Repository
        ├── Business Agent Adapter
        │     │ private HTTP+SSE / WebSocket
        │     ▼
        │   Reference Business Agent :8300
        └── Embedded Presentation Pipeline Package
                ├── Sanitizer / Validator / Catalog
                ├── Presentation Router / Model Adapter
                └── UI Compiler Core ──► PresentationResult
```

正式模式下 Workbench 只能连接 Agent Runtime Host。
显式开发配置可以连接 AGUIMock，但 AGUIMock 不拥有 Runtime Truth、不执行 Command 或真实业务副作用，也不是 Runtime Host 的替代品。
浏览器不配置或访问 Business Agent 私有地址、Presentation Pipeline、UI Compiler Core、Model Provider 或 API Key。
Presentation Pipeline 是 `packages/presentation-pipeline`，运行在 Runtime Host 进程内，不启动独立端口。
不存在当前目标内的 UI Compiler HTTP Service、UI Compiler Client、`UI_COMPILER_URL` 或 Embedded / Remote 双模式。

Model Adapter 属于展示决策子系统，只接收清理后的 AgentContent、展示上下文和 Catalog 摘要。
Model Adapter 不参与 Business Agent 推理、工具调用、业务状态或 Resume。
它输出的 PresentationDecision 仍不可信，只有选择 `generative-ui` 时才包含 UI Plan Candidate。
UI Compiler Core 是唯一可信 A2UI 生产者。

## 安装和启动

### Runtime 与调试会话开发数据

Runtime Host 默认将用户可见的调试线程、轮次、Operation、Surface 生命周期和已验证 Presentation Snapshot 等 Runtime 交互事实写入本地开发 Runtime Repository。
当前开发数据文件使用 `.platform/runtime-threads.sqlite`。
该文件已被 Git 忽略，不能复制进镜像、构建产物或日志。
可通过 `RUNTIME_THREAD_DATABASE_PATH` 指定隔离的数据文件；自动化测试必须使用临时目录。

Runtime Host 不保存 Provider 原始响应、密钥、未验证 UI Plan、UI IR、未清理业务数据或 Business Agent 私有 Checkpoint。
Business Agent 的工作流 Checkpoint 使用独立数据存储，只通过 shared `threadId` 等安全关联标识与 Runtime 历史关联。

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
| Generative UI Workbench | `http://127.0.0.1:5173` | Frontend Runtime 参考实现、Conversation、Presentation、Action 和 Inspect。 |
| Agent Runtime Host | `http://127.0.0.1:8200` | AG-UI 入口、Runtime Truth、Command Admission、Business Agent 适配和进程内 Presentation Pipeline 组装。 |
| Reference Business Agent | `http://127.0.0.1:8300` | 参考业务逻辑、公开事件、独立 Checkpoint 与最终 AgentContent。 |

启动器会等待 Workbench、Runtime Host、Reference Business Agent 及 Runtime 依赖健康检查均成功。
使用 `pnpm dev:platform -- --background` 时，健康检查成功后启动器返回并保留三个后台服务。
按 Ctrl+C 会停止并清理启动器创建的子进程。
如果启动终端意外关闭，请运行 `pnpm stop:platform`。
不要在 Windows 与 WSL 中同时为同一工作树启动平台，因为它们会争用 5173、8200 和 8300 端口。

只验证 Frontend Tool 时，可以省略真实 Business Agent 并单独启动 AGUIMock:

```powershell
pnpm --filter @generative-ui/ag-ui-mock build
pnpm --filter @generative-ui/ag-ui-mock start -- --port 4800 --scenario locate-device
$env:VITE_AG_UI_MOCK_URL = "http://127.0.0.1:4800"
pnpm dev:web-workbench
```

`VITE_AG_UI_MOCK_URL` 只允许出现在本地开发、自动化测试或演示配置中。

运行中的环境可用下列命令复查。

```bash
node scripts/check-platform-environment.mjs --require-running --require-build
```

`http://127.0.0.1:8200/health/dependencies` 会检查远程 Reference Business Agent，并报告 Presentation Pipeline、Model Provider 和 Catalog 的进程内状态。
健康响应和 Workbench 诊断不会包含 API Key、完整私有业务状态、Provider 原始响应或未脱敏 Action Payload。

## 真实 Presentation Model 与测试替身

Workbench 的日常开发运行要求配置真实 Presentation Model。
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
Workbench 通过 AG-UI 连接 Runtime Host；当前底层使用 HTTP POST + SSE。

1. 点击“设备状态”或输入“查看当前可用的无人机和无人车”。
2. Runtime Host 接受用户输入并创建对应 Runtime Operation。
3. Reference Business Agent 发布允许公开的过程事件，并最终返回结构化设备业务数据，而不是 UI Plan 或 A2UI。
4. 过程事件通过 PlatformRuntimeEvent 投影为 AG-UI 实时事件；最终 AgentContent 才进入 Embedded Presentation Pipeline。
5. Model Adapter 通过已配置的真实 Provider 生成不可信的 PresentationDecision 候选。
6. `generative-ui` 候选中的 UI Plan Candidate 经过 Schema、Policy、Catalog、Props、Action 和绑定校验。
7. UI Compiler Core 编译已验证候选为 A2UI，Workbench 的受控 Component Registry 渲染 Surface。
8. 在 Conversation / Inspect 中核对 `threadId`、`turnId`、`operationId`、`surfaceId` 等 Runtime 关联信息。
9. 迁移期如果仍显示 `requestId`、`runId` 或 `presentationRequestId`，它们只作为兼容或外部关联 ID，不是 Runtime Domain 权威主键。
10. 点击“巡防方案”或输入“使用一架无人机和两台无人车巡查 A 区域”。
11. 在生成的界面点击“Confirm patrol plan”，并在需要时显式批准。
12. Workbench 提交受控 Command；Runtime Host 根据 `surfaceId`、revision 和 Runtime Repository 校验当前 Surface 与 Command Admission。
13. Command 被正式接纳后，Runtime Host 通过 Business Agent Adapter 恢复对应 Business Agent 工作流。
14. Resume 结果再次经过同一个 Embedded Presentation Pipeline，并形成新的可信 Presentation / Surface。

点击“Markdown 摘要”可以演示安全 Markdown 路径。
原始 HTML 和危险链接会被安全展示层处理，而不是执行。
A2UI Raw Operations 只用于显式只读诊断，不是 Runtime Truth 来源。

## 协议、Transport 与验证

### Workbench ↔ Runtime Host

Workbench 的规范 Agent 入口是：

```text
http://127.0.0.1:8200/api/copilotkit
```

该 Endpoint 提供 AG-UI Agent 交互，当前由 HTTP POST + SSE 承载。
AG-UI 是应用协议；HTTP、SSE 和未来可能的 WebSocket 只是 Transport。

如果未来实现 `AG-UI over WebSocket`，只能替换 Transport Adapter，不得形成第二套 Runtime Kernel 或 Agent 业务状态机。

### Workbench -> AGUIMock

显式开发配置可以使用:

```text
http://127.0.0.1:4800/api/copilotkit
```

Workbench 构建还必须显式设置 `VITE_ALLOW_AG_UI_MOCK=true`。
该构建期保险丝默认关闭，生产构建会拒绝运行时注入的 `agUiMockUrl`。

该 Endpoint 只提供确定性的 AG-UI 场景。
`locate-device` 场景调用浏览器注册的 `locateDevice({ deviceId })`，并根据 Tool Result 返回最终消息。
这条路径不得用于生产、真实设备控制、业务写入、Command Admission 或 Runtime 恢复。

### Runtime Host ↔ Business Agent

Business Agent Adapter 当前可以使用：

```text
HTTP + SSE
WebSocket
```

这个选择由 `BUSINESS_AGENT_TRANSPORT` 控制，只影响 Runtime Host 内部 Business Agent 接入，不暴露给 Workbench。
Business Agent 不要求原生实现 AG-UI。

### Compatibility / Debug 端点

迁移期代码如果仍保留：

```text
POST /api/runs
POST /api/actions
ws://127.0.0.1:8200/ws/runs
```

这些端点只作为 compatibility / debug adapter。
它们不是与 AG-UI 并列的 Workbench Agent 协议，也不应继续作为新增 Workbench 功能的接入基础。

### 验证命令

```bash
pnpm build:platform
pnpm test:e2e:platform
pnpm verify:platform
pnpm docs:check
```

`pnpm test:e2e:platform` 会启动受控的测试服务器。
该测试使用真实 Chromium 和进程内测试替身，覆盖 Workbench 的 Conversation、AG-UI 事件消费、Markdown / A2UI 展示、安全降级和受控 Action 行为。
底层 compatibility Transport 可以保留独立自动化覆盖，但这些测试不代表平台存在多套 Agent 应用协议。
测试不启动真实 Provider，也不将可运行的 Fixture Provider 作为测试依赖。
`pnpm verify:platform` 依次构建、检查环境并执行同一套平台 E2E。

## 排障

| 现象 | 首先检查 | 处理 |
| --- | --- | --- |
| 启动失败或端口被占用 | `pnpm check:platform-environment` 的端口错误。 | 执行 `pnpm stop:platform`，确认 5173、8200、8300 已释放后重试。 |
| Workbench 显示 Runtime Host 不可用 | `http://127.0.0.1:8200/health`。 | 确认 `pnpm dev:platform` 仍在运行，并检查 Runtime Host 启动输出。 |
| AG-UI 会话无法运行 | `/api/copilotkit` 与浏览器连接状态。 | 确认 Workbench 只配置 Runtime Host 地址，并检查 Runtime Host 的 CopilotKit / AG-UI Adapter。 |
| AGUIMock Frontend Tool 未执行 | `http://127.0.0.1:4800/health`、`VITE_ALLOW_AG_UI_MOCK` 与 `VITE_AG_UI_MOCK_URL`。 | 确认构建期保险丝已启用、使用 `locate-device` 场景，并检查浏览器中 `locateDevice` 的活动状态。 |
| Business Agent 依赖健康检查失败 | `http://127.0.0.1:8200/health/dependencies`。 | `BUSINESS_AGENT_UNREACHABLE` 表示 8300 不可达，`BUSINESS_AGENT_UNHEALTHY` 表示 Agent 响应异常。 |
| 真实 Provider 无法启动 | Runtime Host 服务端环境变量。 | 核对 Provider、模型名、API Key、可选 Base URL 与 Endpoint ID，且不要把密钥写入前端变量。 |
| 展示降级为 Markdown | Workbench Presentation 与 Inspect。 | Provider、候选校验或编译失败会保留有效业务结果并安全降级；Presentation fallback 不改变 Operation Outcome。 |
| Command / Action 被拒绝 | `commandId`、`surfaceId`、`actionId`、`expectedRevision`、输入与确认状态。 | 刷新 Runtime Snapshot，从当前 `actionable` Surface 重新发起受控 Command；不要复用已消费 Surface 或旧 `runId`。 |
| 诊断时间线不完整 | Inspect 中的 diagnostic completeness。 | 先以 Runtime Repository Snapshot 为当前真相；Diagnostic Event 缺口只影响时间线完整性。 |

## 相关文档

- [平台需求](./REQUIREMENTS.md)
- [平台架构](./ARCHITECTURE.md)
- [平台一键开发环境实现说明](./PLATFORM_DEVELOPMENT.md)
- [ADR-0019](../adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [ADR-0024](../adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0027](../adr/0027-allow-direct-ag-ui-mock-for-workbench-development.md)
- [ADR-0026](../adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
- [Presentation Pipeline Package](../../packages/presentation-pipeline/README.md)
- [Runtime Host](../../apps/agent-runtime-host/README.md)
- [Reference Business Agent](../../apps/business-agent-langgraph/README.md)
- [Workbench](../../apps/web-workbench/README.md)
