# Test Scope

本目录用于承载 Generative UI Workbench 的测试。

建议测试结构：

| 目录 | 测试内容 |
|---|---|
| `unit/` | Runtime 事件转换、Registry、Schema 校验和状态管理 |
| `integration/` | Runtime Client、Renderer、Action 回传和场景加载 |
| `e2e/` | 用户输入、结果渲染、用户确认和错误降级完整流程 |

## MVP 必测边界

- Workbench 只连接 Agent Runtime Host。
- 非法组件不能进入真实组件渲染。
- 非法 Props 和 Action 参数必须被拒绝。
- 高风险操作必须经过用户确认。
- 重复确认必须被阻止。
- UI 编译或组件渲染失败后必须保留有效业务内容。
- 智慧安防场景移除后，通用工作台测试仍能运行。

详细验收案例见 `docs/WEB_WORKBENCH_SRS.md`。
