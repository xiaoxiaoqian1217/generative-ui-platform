# TASK-010：一键开发环境

## 目标

让新开发人员快速安装、启动、构建和验证完整环境。

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
Business Agent      :8300
UI Compiler         :3000
```

## 环境检查

新增：

```text
scripts/check-platform-environment.mjs
```

检查：

- Node；
- pnpm；
- 端口；
- 环境变量；
- 四个服务健康状态；
- Runtime 到 Agent；
- Runtime 到 Compiler；
- UI Compiler Model Provider；
- Component Catalog；
- Web Runtime 地址。

## 验收

- 全新克隆冻结安装成功；
- 默认 Fixture 无 API Key 可运行；
- 一个命令启动四个服务；
- 依赖健康状态可见。
