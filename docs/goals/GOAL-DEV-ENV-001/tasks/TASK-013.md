# TASK-013：Presentation Pipeline Package 提取

## 目标

按照 ADR-0019，将原 `apps/ui-compiler-service` 中与 HTTP、CLI 和独立进程生命周期无关的展示应用能力提取为可嵌入的 `packages/presentation-pipeline`，并完成旧独立服务目标模式的退役。

## 实施前审计

- 盘点 UI Compiler Service 中的 Sanitizer、结构化数据校验、Catalog、Presentation Router、Model Adapter、Compiler Core 组装、降级和 Observability。
- 区分可迁移的应用能力与应删除的独立 HTTP / CLI 宿主能力。
- 盘点根脚本、Workspace、环境变量、Docker、CI、E2E 和文档中对独立服务、端口、Client 或 Remote Mode 的引用。
- 确认现有测试对应的契约和安全边界。

## 工作项

- 创建 `packages/presentation-pipeline`。
- 提取 PresentationRequest 到 PresentationResult 的应用用例。
- 保留 Markdown Sanitizer、Structured Data Validator / Serializer、Catalog Repository、Presentation Router 和 Model Adapter 接口。
- 保留 UI Plan Candidate 校验、UI Compiler Core 调用和安全 Markdown 降级。
- 提供可供 TASK-005 使用的最小确定性 Fixture Model Adapter；真实 Provider 和扩展故障模拟由 TASK-004 完成。
- 提供供应商无关的 Observability Port。
- 将运行配置改为由组合根注入，不读取 Runtime Host 或前端状态。
- 迁移单元、契约、集成、安全、可靠性和性能测试到 Package 或 Runtime Host 合适边界。
- 更新依赖边界检查，禁止 Package 依赖 App 和 App 依赖旧 Compiler App。
- 在 Runtime Host 完成接入和验证后，删除或明确归档旧 `apps/ui-compiler-service` 的运行入口。
- 删除独立 UI Compiler 启动脚本、端口、Client、`UI_COMPILER_URL`、Remote Mode、健康检查、Docker 和 CI 目标引用。
- 更新受影响文档；历史 Compiler MVP 文档可以保留，但必须标明其部署结论已被 ADR-0019 取代。

## 迁移顺序

1. 建立 Package 并迁移纯应用能力。
2. 保持现有契约、安全和降级测试通过。
3. 由 Agent Runtime Host 直接组装 Package。
4. 将 Run 和 Action 恢复路径接入 Embedded Presentation Pipeline。
5. 迁移原独立服务测试到 Package、Runtime 或平台 E2E 边界。
6. 移除独立服务入口、配置、脚本、部署和远程客户端。
7. 执行仓库级引用扫描和完整验证。

迁移期间可以短暂保留旧入口用于对照测试，但不得形成长期双模式、公开兼容承诺或两套组合根。

## 架构限制

- Package 不依赖任何 App。
- Presentation Pipeline 不依赖具体 Business Agent、LangGraph 或 Web。
- UI Compiler Core 不调用模型、网络或 Runtime Host。
- Runtime Host 不复制 Sanitizer、Catalog、Router、Model Adapter 或编译规则。
- 当前目标不保留独立 UI Compiler HTTP Service、UI Compiler Client 或 Remote Mode。
- 不得以“兼容旧测试”为由长期保留第四个运行服务。

## 验收

- 原 UI Compiler 主路径测试在 Package、Runtime Host 或平台 E2E 的正确边界下继续通过。
- Presentation Pipeline 可以由普通 TypeScript 测试进程直接组装。
- 最小 Fixture Model Adapter 可以确定性生成 Markdown 或 generative-ui PresentationResult。
- 模型、路由或编译失败时保留安全降级语义。
- Agent Runtime Host 通过 Package 依赖直接组装 Pipeline，不经过 HTTP Client。
- 目标运行拓扑只有 Workbench、Agent Runtime Host 和 Reference Business Agent 三个服务。
- 仓库当前目标配置中不存在独立 UI Compiler 端口、`UI_COMPILER_URL`、UI Compiler Client 或 Remote Mode。
- 旧 `apps/ui-compiler-service` 不再作为可启动、可部署或 CI 必需应用；若保留历史目录，必须无运行入口并有明确归档说明。
- `pnpm check:boundaries`、lint、typecheck、test、build 和相关 E2E 通过。
