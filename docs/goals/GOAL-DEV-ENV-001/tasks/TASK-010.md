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

## 默认端口

```text
Web Workbench       :5173
Runtime Host        :8200
Reference Agent     :8300
UI Compiler         :3000
```

## 工作项

- 增加统一的多进程开发启动命令。
- 增加构建、验证和进程清理命令。
- 新增 `scripts/check-platform-environment.mjs`。
- 检查 Node、pnpm、端口、环境变量和构建产物。
- 检查四个服务的健康状态。
- 检查 Runtime 到 Agent、Runtime 到 Compiler 和 Web 到 Runtime 的配置。
- 检查 UI Compiler Model Provider 与 Component Catalog 配置状态。
- 支持 Windows PowerShell 和 WSL 的明确运行说明。

## 架构限制

- 默认使用 Fixture，无 API Key 也必须可运行。
- 启动脚本不得把密钥写入命令行输出或前端环境变量。
- 进程退出时必须清理子进程和占用端口。

## 验收

- 全新克隆可以使用冻结锁文件安装。
- 一个命令启动四个服务。
- 健康检查能区分未配置、不可达和运行异常。
- 停止命令或父进程退出后不残留子进程。
- 完整 E2E 可以复用同一套启动机制。
