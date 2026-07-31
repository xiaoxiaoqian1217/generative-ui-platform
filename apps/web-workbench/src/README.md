# Source Boundaries

本目录用于承载 Generative UI Workbench 的前端源码。

正式初始化应用时，建议按以下职责组织：

| 目录 | 职责 |
|---|---|
| `app/` | 应用入口、路由、布局和全局错误边界 |
| `runtime/` | 只面向 Agent Runtime Host 的客户端和事件适配 |
| `renderer/` | Markdown Renderer、A2UI Renderer 和渲染错误边界 |
| `registries/` | Component Registry 和前端 Action Registry |
| `diagnostics/` | 运行阶段、编译诊断、错误和降级信息展示 |
| `cases/` | 内置案例、执行结果和差异比较 |
| `scenarios/` | 前端场景包加载与场景元数据 |
| `settings/` | Runtime Host 地址、通信模式和调试选项 |

## 强制边界

- `runtime/` 只连接 Agent Runtime Host，不得直接连接 Business Agent。
- `runtime/` 不得实现 Business Agent Adapter。
- `renderer/` 不得执行声明式数据中的任意代码。
- `registries/` 只能执行已注册组件和 Action。
- `scenarios/` 可以注册领域组件、前端 Action 和案例，但不得实现后端业务工具。
- 智慧安防领域类型不得进入通用 Runtime Client 和 Renderer 核心。

需求基线见 `docs/WEB_WORKBENCH_SRS.md`。
