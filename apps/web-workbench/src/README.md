# Source Boundaries

Workbench 源码按职责拆分。

| 目录 | 职责 |
|---|---|
| `app/` | 应用组合、运行控制和快捷场景 |
| `runtime/` | 只面向 Agent Runtime Host 的 HTTP、WebSocket、健康探测和错误边界 |
| `renderer/` | 安全 Markdown、PresentationResult 和受控 A2UI Raw Viewer |
| `diagnostics/` | 关联 ID 和 Runtime Host 安全阶段摘要 |
| `settings/` | 单一 Runtime Host 与环境配置 |

`runtime/` 不得连接 Business Agent、Presentation Pipeline、UI Compiler Core 或模型供应商。
`renderer/` 不得执行声明式数据中的任意代码。
A2UI Raw Viewer 只显示通过 Runtime Contract 校验后的只读文本，并默认隐藏。
真实 Component Registry 和 A2UI Renderer 在 TASK-007 中接入。
Action Registry 和回传闭环在 TASK-008 中接入。
