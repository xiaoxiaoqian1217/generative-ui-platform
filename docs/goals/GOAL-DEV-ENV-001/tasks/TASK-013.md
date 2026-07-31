# TASK-013：Presentation Pipeline Package 提取

## 目标

按照 ADR-0019，将原 `apps/ui-compiler-service` 中与 HTTP、CLI 和独立进程生命周期无关的展示应用能力提取为可嵌入的 `packages/presentation-pipeline`。

## 实施前审计

- 盘点 UI Compiler Service 中的 Sanitizer、结构化数据校验、Catalog、Presentation Router、Model Adapter、Compiler Core 组装、降级和 Observability。
- 区分可迁移的应用能力与应删除的独立 HTTP / CLI 宿主能力。
- 确认现有测试对应的契约和安全边界。

## 工作项

- 创建 `packages/presentation-pipeline`。
- 提取 PresentationRequest 到 PresentationResult 的应用用例。
- 保留 Markdown Sanitizer、Structured Data Validator / Serializer、Catalog Repository、Presentation Router 和 Model Adapter 接口。
- 保留 UI Plan Candidate 校验、UI Compiler Core 调用和安全 Markdown 降级。
- 提供供应商无关的 Observability Port。
- 将运行配置改为由组合根注入，不读取 Runtime Host 或前端状态。
- 迁移单元、契约和集成测试。
- 更新依赖边界检查。
- 在 Runtime Host 完成接入和验证前，按迁移计划处理旧 `apps/ui-compiler-service`，不得同时维护 Embedded / Remote 双模式作为终局。

## 架构限制

- Package 不依赖任何 App。
- Presentation Pipeline 不依赖具体 Business Agent、LangGraph 或 Web。
- UI Compiler Core 不调用模型、网络或 Runtime Host。
- Runtime Host 不复制 Sanitizer、Catalog、Router、Model Adapter 或编译规则。
- 当前目标不保留独立 UI Compiler HTTP Service 或 UI Compiler Client。

## 验收

- 原 UI Compiler 主路径测试在 Package 边界下继续通过。
- Presentation Pipeline 可以由普通 TypeScript 测试进程直接组装。
- Fixture Model Adapter 可以生成 Markdown 或 generative-ui PresentationResult。
- 模型、路由或编译失败时保留安全降级语义。
- `pnpm check:boundaries`、typecheck、test 和 build 通过。
