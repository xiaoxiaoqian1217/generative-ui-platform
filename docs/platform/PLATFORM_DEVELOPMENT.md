<!-- cspell:ignore unconfigured taskkill -->

# 平台一键开发环境

TASK-010 提供 Workbench、Agent Runtime Host 和 Reference Business Agent 的三服务本地开发拓扑。
Presentation Pipeline、Model Provider 与 Component Catalog 都嵌入 Runtime Host 进程。
它们不是独立服务，不使用独立端口，也不存在 UI Compiler URL 或 UI Compiler HTTP Service。

## 前置条件

需要 Node.js 24 或更高版本和 pnpm 10.13.1。

新克隆仓库请使用冻结锁文件安装。

```bash
pnpm install --frozen-lockfile
```

默认使用 Fixture Model Adapter，不需要 API Key。

## 统一命令

```bash
pnpm dev:platform
pnpm stop:platform
pnpm build:platform
pnpm check:platform-environment
pnpm test:e2e:platform
pnpm verify:platform
```

`dev:platform` 在一个父进程下启动以下三个服务。

| 服务 | 地址 |
| --- | --- |
| Generative UI Workbench | `http://127.0.0.1:5173` |
| Agent Runtime Host | `http://127.0.0.1:8200` |
| Reference Business Agent | `http://127.0.0.1:8300` |

按 Ctrl+C 会终止并清理该父进程启动的子进程。
如果启动终端意外退出，请执行 `pnpm stop:platform` 清理记录的进程树。
进程状态仅存放在被 Git 忽略的 `.platform/processes.json` 中。

`check:platform-environment` 验证 Node、pnpm、禁止的 Compiler 配置、浏览器环境变量和端口可用性。
向该命令传入 `--require-build` 时还会验证三个构建产物。
`test:e2e:platform` 复用 `dev:platform --background` 和 `stop:platform` 管理生命周期，然后执行完整三服务浏览器 E2E。
该 E2E 覆盖 HTTP 与 WebSocket、Markdown 与 A2UI、Action Resume 和 Fixture 故障下的安全降级。

运行中的服务可使用下列命令进行额外检查。

```bash
node scripts/check-platform-environment.mjs --require-running --require-build
```

Runtime 的 `/health/dependencies` 实际探测远程 Business Agent 并单独报告 Pipeline、Model Provider 与 Catalog 的进程内状态。
远程服务不可达使用 `BUSINESS_AGENT_UNREACHABLE`。
远程服务响应异常使用 `BUSINESS_AGENT_UNHEALTHY`。
进程内能力的 `unconfigured` 和 `initialization-failed` 状态与上述远程错误保持语义区分。
健康响应、启动输出和 Workbench 环境变量均不输出或传递 API Key。

## Windows PowerShell

```powershell
pnpm install --frozen-lockfile
pnpm dev:platform
```

在另一个 PowerShell 窗口中使用 `pnpm stop:platform`。
Windows 使用 `taskkill /T` 清理由启动器记录的整个子进程树。

## WSL 或 Linux

```bash
pnpm install --frozen-lockfile
pnpm dev:platform
```

在另一个终端中使用 `pnpm stop:platform`。
Linux 和 WSL 使用独立进程组处理 SIGTERM。
不要在 Windows 和 WSL 中同时运行同一份工作树，否则它们会竞争 5173、8200 和 8300 端口。
