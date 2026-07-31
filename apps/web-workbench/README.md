# Generative UI Workbench

`apps/web-workbench` 是 Generative UI Platform 的生成式 UI 开发、联调、诊断和验收工作台目录。

当前提交只初始化工作目录和职责边界，不引入前端依赖，不修改 `pnpm-lock.yaml`，也不影响现有 `apps/web-demo` 的构建和测试。

## 产品职责

Workbench 负责：

- 连接 Agent Runtime Host；
- 发送用户输入并展示运行状态；
- 渲染安全 Markdown 和 A2UI；
- 维护前端 Component Registry；
- 维护前端 Action Registry；
- 展示 Runtime Host 提供的诊断信息；
- 展示人工确认界面；
- 将用户选择和 Action 结果回传 Runtime Host；
- 加载前端场景包并执行验收案例。

Workbench 不负责：

- 直接连接 Business Agent；
- 实现 Business Agent Adapter；
- 编排 Agent Run；
- 调用后端业务工具；
- 维护权威业务任务状态；
- 代替 UI Compiler 生成或编译 UI。

正式运行链路为：

```text
Generative UI Workbench
          │
          ▼
Agent Runtime Host
          ├── Business Agent Adapter ──> Business Agent
          └── UI Compiler Service
          │
          ▼
Generative UI Workbench
```

## 计划目录

```text
apps/web-workbench/
├── src/
│   ├── app/
│   ├── runtime/
│   ├── renderer/
│   ├── registries/
│   ├── diagnostics/
│   ├── cases/
│   ├── scenarios/
│   └── settings/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── README.md
```

目录职责见 `src/README.md` 和 `tests/README.md`。

## 初始化策略

正式工程初始化时应遵守：

1. 优先复用仓库现有 pnpm、TypeScript、Vitest、Biome 和 Turbo 工具链。
2. 前端框架和 Renderer 依赖必须经过单独技术决策后再写入锁文件。
3. 不得复制 `apps/web-demo` 的单文件实现作为长期架构。
4. 不得在浏览器端增加 Business Agent 私有协议适配器。
5. 不得将智慧安防领域类型写入通用 Runtime Client、Renderer 或 Registry 核心。
6. 第一阶段以 `docs/WEB_WORKBENCH_SRS.md` 为需求基线。

## 当前状态

- [x] 建立 Workbench 需求规格说明书；
- [x] 初始化工作目录；
- [x] 明确 Workbench 与 Runtime Host 的职责边界；
- [ ] 确定正式前端技术栈和包依赖；
- [ ] 初始化可运行应用；
- [ ] 接入 Runtime Host；
- [ ] 接入 Markdown Renderer 和 A2UI Renderer；
- [ ] 建立智慧安防参考场景。
