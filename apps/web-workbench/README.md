# Generative UI Workbench

`apps/web-workbench` 是 Generative UI Platform 的生成式 UI 开发、联调、诊断、验收和回归工作台目录。

当前提交只初始化工作目录和职责边界，不引入前端依赖，不修改 `pnpm-lock.yaml`，也不影响现有 `apps/web-demo` 的构建和测试。

## 产品背景

公司正在建设智慧安防、空地多智能体协同巡防指挥等 Agent 应用。

这类应用不仅返回文本，还需要展示设备状态、多个候选方案、地图路线、任务草稿、风险提示、人工确认和执行状态。现有最小 Web Demo 只能验证基础 HTTP/WebSocket 通信，不能长期承担完整链路联调、问题诊断、场景验收和版本回归。

因此，Workbench 被建设为可发布、可持续维护的 Frontend Runtime 参考实现和开发验收环境。

## 产品定位

> 面向 Generative UI Platform 开发者和接入团队的、可发布的生成式 UI 开发与验收工作台。

其核心价值是：

> 让生成式 UI 从“各模块能够独立运行”，变成“完整链路可联调、问题可定位、能力可验收、版本可回归”。

产品采用：

```text
通用 Workbench 核心
        +
智慧安防场景包
        +
空地多智能体巡防指挥参考实现
```

Workbench 不是完整智慧安防生产系统，也不是一次性演示 Demo。

## 目标用户与问题

| 用户 | 主要问题 | Workbench 提供的能力 |
|---|---|---|
| 平台开发者 | Runtime、Compiler、Renderer 分别可测，但完整链路和错误阶段难以判断 | 完整运行状态、中间结果、错误和降级诊断 |
| Business Agent 开发者 | 经 Runtime Host 接入后缺少统一联调页面，不清楚最终展示和操作回传结果 | 统一运行入口、结果渲染和 Action 回传验证 |
| 前端组件开发者 | 缺少 Catalog、Props、边界数据和 Action 的统一验证环境 | Component Registry、预览、Schema 和 Action 验证 |
| 测试人员 | 验收依赖人工输入，缺少可重放案例和预期结果 | 案例保存、重放、比较和回归 |
| 架构与技术负责人 | 难以判断平台是否形成真实闭环以及职责边界是否被遵守 | 端到端验收证据和边界验证 |
| 业务场景团队 | 难以证明生成式 UI 是否改善方案比较、地图协同和人工确认 | 智慧安防参考场景 |

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
          └── Embedded Presentation Pipeline
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
- [x] 明确产品背景、目的、定位和目标用户；
- [x] 明确 Workbench 与 Runtime Host 的职责边界；
- [ ] 确定正式前端技术栈和包依赖；
- [ ] 初始化可运行应用；
- [ ] 接入 Runtime Host；
- [ ] 接入 Markdown Renderer 和 A2UI Renderer；
- [ ] 建立智慧安防参考场景。
