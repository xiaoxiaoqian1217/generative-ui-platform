# 退役可运行的 Fixture Provider 模式

## 状态

已接受。

Workbench 的日常联调和可部署运行只使用真实 Business Model 与真实 Presentation Model Provider。
仓库不再保留可通过运行配置启用的 Fixture Provider、Fixture 应用模式或额外 Fixture 服务；自动化测试改为在测试进程内构造固定契约对象或注入内存 Stub。
这避免将一个难以理解且与真实链路不同的运行环境固化为平台依赖，同时仍保留对成功、校验失败和安全降级路径的确定性验证。

## 考虑的方案

- 保留可运行的 Fixture Provider，并将其作为默认联调和 E2E 模式。
- 只调用真实模型，且不保留任何确定性测试替身。
- 日常联调调用真实模型；测试在进程内使用契约对象和内存 Stub。

## 后果

- 新 Goal 必须移除 `PRESENTATION_MODEL_PROVIDER=fixture` 及相关可运行 Provider 配置、文档和应用入口。
- 单元、集成和浏览器 E2E 测试必须通过进程内依赖注入或受控测试服务获得确定性输入，不能依赖真实模型的文本或 UI 选择完全一致。
- 真实模型联调必须有清晰的依赖就绪、失败、成本和限流反馈，不能静默回退到 Fixture。
- 不设独立的真实模型 Smoke Test，也不将外部模型可用性作为 CI 或合并门槛。
- 真实模型仅在开发环境由开发人员通过 Workbench 实际联调。
- 本 ADR 取代平台规范中将 Fixture 作为日常运行、CI 或完整 E2E 的标准模式的结论。
