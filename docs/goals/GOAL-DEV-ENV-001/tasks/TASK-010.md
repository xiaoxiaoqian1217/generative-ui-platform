# TASK-010：一键开发环境

## 目标

让新开发人员能够快速安装、启动、构建和验证完整环境，并为完整 E2E 提供稳定启动基础。

## 根命令

```bash
pnpm dev:platform
pnpm build:platform
pnpm test:e2e:platform
pnpm verify:platform
```

其中本任务负责统一命令、进程编排和 E2E 启动基础；完整 Playwright 场景由 TASK-009 实现。

## 默认运行服务

```text
Web Workbench                              :5173
Agent Runtime Host + Presentation Pipeline :8200
Reference Business Agent                  :8300
```

Presentation Pipeline 是 Package，不占用独立端口，也不作为第四个服务执行健康检查。

## 工作项

- 增加统一的三进程开发启动命令。
- 增加构建、验证和进程清理命令。
- 新增 `scripts/check-platform-environment.mjs`。
- 检查 Node、pnpm、端口、环境变量和构建产物。
- 检查三个运行服务的健康状态。
- 检查 Runtime 到 Agent 和 Web 到 Runtime 的配置。
- 检查 Runtime 内 Embedded Presentation Pipeline、Fixture / Model Provider 和 Component Catalog 的能力就绪状态。
- 明确区分远程服务不可达、进程内能力未配置和进程内能力初始化失败。
- 支持 Windows PowerShell 和 WSL 的明确运行说明。

## 架构限制

- 默认使用 Fixture，无 API Key 也必须可运行。
- 不启动独立 UI Compiler HTTP Service。
- 不提供 Embedded / Remote 双模式。
- 不分配 UI Compiler 端口，不检查 UI Compiler Service 健康状态。
- 启动脚本不得把密钥写入命令行输出或前端环境变量。
- 进程退出时必须清理子进程和占用端口。

## 验收

- 全新克隆可以使用冻结锁文件安装。
- 一个命令启动三个服务。
- Runtime 健康端点能够报告 Business Agent 远程依赖状态，以及 Presentation Pipeline、Model Provider 和 Catalog 的进程内就绪状态。
- 环境检查中不存在 UI Compiler URL、独立端口或第四服务。
- 停止命令或父进程退出后不残留子进程。
- TASK-009 的完整 E2E 可以复用同一套启动机制。
