# TASK-012：文档与演示

## 目标

形成可交接、可接入、可评审的开发验证环境文档，并清除实现完成后的过期说明。

## 文档内容

- 所属平台项目背景和当前 Goal 定位。
- ADR-0018 与 ADR-0019 的架构关系。
- Reference Business Agent 和 Business Agent Adapter 接入方式。
- Embedded Presentation Pipeline 的 Package 边界和 Runtime 组合方式。
- Presentation Model Adapter、Provider 配置和安全规则。
- Component Catalog、Component Registry 和 A2UI Renderer。
- Action 契约、安全校验和 Resume 流程。
- 三服务一键启动、环境变量、E2E 和故障排查。
- Fixture 能力、真实模型能力和尚未实现能力的清晰区分。

## 演示流程

```text
1. 查询设备状态
2. Reference Business Agent 返回结构化数据
3. Runtime Host 调用 Embedded Presentation Pipeline
4. Model Adapter 生成 PresentationDecision 候选
5. generative-ui 模式产生 UI Plan Candidate
6. UI Compiler Core 编译 A2UI
7. Web Workbench 渲染
8. 生成巡逻计划并点击确认
9. LangGraph Resume 并更新业务状态
10. 切换 HTTP / WebSocket
11. 切换 Fixture / 真实 Presentation Model
12. 查看诊断面板
```

## 架构限制

- 文档必须明确当前交付物是开发验证环境，不是独立产品。
- 文档必须明确 Presentation Pipeline 是 Package，并嵌入 Runtime Host。
- 文档不得描述独立 UI Compiler HTTP Service、UI Compiler Client 或 Remote 双模式为当前目标。
- 文档必须明确 Model Adapter 属于展示决策子系统，不用于 Business Agent 推理。
- 文档不得把 Model Adapter 简化为始终输出 UI Plan Candidate。
- 文档不得把 Reference Business Agent 描述为正式业务 Agent。
- 旧 Compiler MVP 文档继续保留，并明确被 ADR-0019 调整的部署结论。

## 验收

- 新开发人员可以按文档完成冻结安装和三服务一键启动。
- 评审人员可以完成完整编译与 Action 回传演示。
- 所有命令、端口、路径和能力状态与代码一致。
- README、平台文档、ADR、Goal 和子任务之间不存在冲突引用。
