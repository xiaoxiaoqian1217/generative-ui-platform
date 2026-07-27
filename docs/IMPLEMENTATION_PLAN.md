# Generative UI Compiler MVP 实施任务候选清单

## 1. 文档定位

本文把已确认的需求、架构和 ADR 转换为可评审的候选任务及阻塞关系。
本文不是实现授权，也不代表对应 GitHub Issue 已经创建。
任务获批后必须发布到 GitHub Issues，并使用原生依赖关系记录阻塞边。

规划来源：

- [需求规格说明书](./REQUIREMENTS.md)
- [系统设计说明书](./Generative_UI_Compiler_Design.md)
- [架构说明](./ARCHITECTURE.md)
- [数据契约](./CONTRACTS.md)
- [领域语言](../CONTEXT.md)
- [ADR](./adr)

## 2. 执行原则

- 按阻塞关系推进，不按目录批量实现。
- 每个实现任务必须交付一个可验证的纵向行为切片。
- 每个任务必须引用需求章节、测试范围和明确的非目标。
- 阶段前置 ADR 未完成时，不得开始依赖该决策的实现任务。
- 每个实现任务使用 TDD，并在完成前执行规范和需求双轴审查。
- Frontend Runtime、真实业务 Agent、Copilot Runtime、Component Registry 和 Interaction Gateway 始终属于范围外系统。

## 3. 候选任务

### 规划和决策

#### PLAN-000 对齐固定 UI 模板降级范围

- 产出：显式需求变更决定，统一 REQUIREMENTS CORE-024 与系统设计 DD-017。
- 需求映射：第 13.8、20、23 节。
- 设计映射：第 6.4、16.1、26、27、28 节。
- 阻塞：无。
- 阻塞下游：CORE-005、ACCEPTANCE-002、ACCEPTANCE-003。
- 验收：REQUIREMENTS、系统设计、CONTRACTS 和相关 ADR 对降级状态与顺序使用同一规范。

#### PLAN-001 将 A2UI v0.9.1 Profile 固化为 ADR

- 产出：Accepted ADR，记录系统设计选定的 v0.9.1 Profile、支持的 Operation、验证方式和兼容策略。
- 需求映射：第 10.6、13.6、18.2、23 节。
- 设计映射：第 14、24、26、27 节。
- 阻塞：无。
- 阻塞下游：CORE-004、SERVICE-006。

#### PLAN-002 确认 Schema 校验库

- 产出：Accepted ADR，记录边界校验、Schema 复用、错误映射和发布约束。
- 需求映射：第 13.1、13.7、17、23 节。
- 阻塞：无。
- 阻塞下游：FOUNDATION-001、CONTRACT-001、CONTRACT-002、CONTRACT-003。

#### PLAN-003 确认 UI Plan Candidate 和 Model Adapter 接口

- 产出：Accepted ADR 和可执行 Schema 设计，固化系统设计中的 UI Plan Candidate、Presentation Decision、sourceData、derivedData 和一次模型调用接口。
- 需求映射：第 9.3、10.2、14.5、23 节。
- 设计映射：第 8、9、10、26、27 节。
- 阻塞：PLAN-002。
- 阻塞下游：CONTRACT-001、SERVICE-003。

#### PLAN-004 确认 Markdown Sanitizer

- 产出：Accepted ADR，记录安全策略、允许列表、链接处理和降级行为。
- 需求映射：第 14.5、16.3、17、23 节。
- 阻塞：PLAN-002。
- 阻塞下游：SERVICE-001。

#### PLAN-005 确认 Node HTTP 框架

- 产出：Accepted ADR，记录 HTTP 框架、请求体限制、超时、取消和错误映射边界。
- 需求映射：第 14.1、16.4、23 节。
- 阻塞：无。
- 阻塞下游：SERVICE-005。

#### PLAN-006 确认 AG-UI SDK 版本

- 产出：Accepted ADR，记录 SDK 版本、Run 生命周期和协议适配边界。
- 需求映射：第 14.2、18.3、23 节。
- 阻塞：PLAN-001。
- 阻塞下游：PLAN-007、SERVICE-006。

#### PLAN-007 确认 A2UI 自定义事件载荷

- 产出：Accepted ADR，记录 A2UI 结果、降级结果和错误结果的 AG-UI 事件载荷。
- 需求映射：第 14.2、18.3、23 节。
- 阻塞：PLAN-001、PLAN-006。
- 阻塞下游：SERVICE-006。

### 工程和公共契约

#### FOUNDATION-001 创建 MVP workspace 骨架

- 产出：目标 apps 和 packages 的最小目录、构建、类型检查和测试配置。
- 需求映射：第 6、7、8、18.1、19 节阶段一。
- 阻塞：PLAN-002。
- 验收：所有包可独立执行 build、typecheck 和 test，且没有产品行为占位。

#### CONTRACT-001 实现 Presentation 契约

- 产出：AgentContent、PresentationRequest、PresentationDecision、UIPlan、ActionIntent 和 PresentationResult Schema。
- 需求映射：第 10.1、10.2、10.3、10.5、17.2 节。
- 阻塞：FOUNDATION-001、PLAN-003。
- 验收：判别联合拒绝矛盾字段，业务 Agent 输入不包含 Compiler 路由元数据。

#### CONTRACT-002 实现 Component Catalog 契约

- 产出：Catalog、Component、Props、Action 和结构约束 Schema。
- 需求映射：第 11、13.4、17.2 节。
- 阻塞：FOUNDATION-001、PLAN-002。
- 验收：覆盖基础组件和至少一个领域组件声明，不包含真实组件实现。

#### CONTRACT-003 实现 Compiler 契约

- 产出：UICompileRequest、UISurfaceIR、UICompileResult、错误代码和诊断 Schema。
- 需求映射：第 10.4、10.6、10.7、12、17.2 节。
- 阻塞：CONTRACT-001、CONTRACT-002、PLAN-001。
- 验收：编译请求只接受已经选定 generative UI 的 UI Plan Candidate。

### 确定性 Core 纵向链路

#### CORE-001 实现输入和资源限制校验

- 产出：Compile Request、UI Plan Candidate、Catalog、深度和数据项限制校验。
- 需求映射：第 13.1、13.2、16.4 节。
- 阻塞：CONTRACT-003。
- 验收：非法输入使用稳定错误码失败，Core 不依赖网络或 Service。

#### CORE-002 实现 Catalog 解析和组件选择

- 产出：Catalog Loader、兼容性检查、基础与领域组件选择。
- 需求映射：第 11、13.4、18.2 节。
- 阻塞：CORE-001。
- 验收：未注册组件、非法 Props、Action 和结构被拒绝。

#### CORE-003 实现 UI Plan Candidate 到 UI IR

- 产出：确定性规范化、数据绑定、布局约束、Action 意图和 UI IR 校验。
- 需求映射：第 12、13.3、13.5、18.2 节。
- 阻塞：CORE-002。
- 验收：七类展示场景均具有 Candidate 到 UI IR 测试。

#### CORE-004 实现 UI IR 到 A2UI

- 产出：A2UI Compiler 和目标 A2UI Schema 验证。
- 需求映射：第 13.6、13.7、18.2 节。
- 阻塞：CORE-003、PLAN-001。
- 验收：输出只包含目标 A2UI Schema 允许的 Operation。

#### CORE-005 实现确定性降级

- 产出：PLAN-000 确认后的降级链和结构化诊断。
- 需求映射：第 13.8、16.2、18.2 节。
- 设计映射：第 6.4、16、26、28 节。
- 阻塞：CORE-004、PLAN-000。
- 验收：任何生成式 UI 失败都不会返回未经验证的部分 A2UI，且结果状态符合统一后的公共契约。

### 展示路由和 Service 用例

#### SERVICE-001 实现安全 Markdown 和结构化数据表示

- 产出：Markdown Sanitizer、Structured Data Validator 和 Structured Data Serializer。
- 需求映射：第 14.5、16.3、17.1 节。
- 阻塞：CONTRACT-001、PLAN-004。
- 验收：序列化稳定，不执行、不静默截断、不静默总结业务事实。

#### SERVICE-002 实现 Presentation Router 确定性路径

- 产出：Markdown 和 generative UI 判别联合及安全默认降级。
- 需求映射：第 9.3、14.5、18.3 节。
- 阻塞：SERVICE-001。
- 验收：普通 Markdown 不调用 Core。

#### SERVICE-003 实现可替换 Model Adapter

- 产出：Mock Adapter、超时、有限重试、错误映射和结构化输出校验。
- 需求映射：第 9.3、14.5、16.2、17.1 节。
- 阻塞：SERVICE-002、PLAN-003。
- 验收：一次调用同时返回展示决策和可选 UI Plan Candidate。

#### SERVICE-004 实现 Presentation 应用用例

- 产出：PresentationRequest 到 PresentationResult 的应用编排。
- 需求映射：第 9.2、14.5、18.3 节。
- 阻塞：CORE-005、SERVICE-003。
- 验收：Markdown 直出和 generative UI 编译形成同一用例的两个受控分支。

#### SERVICE-005 实现 HTTP 接口

- 产出：`POST /api/ui-compiler/present`、health、version、请求限制、超时、取消和错误状态映射。
- 需求映射：第 14.1、14.3、16.2、16.4、18.3 节。
- 阻塞：SERVICE-004、PLAN-005。
- 验收：请求体大小在反序列化前校验。

#### SERVICE-006 实现 AG-UI 接口

- 产出：AG-UI Run 生命周期、Markdown 结果、A2UI 结果、降级结果和终止事件。
- 需求映射：第 14.2、16.2、18.3 节。
- 阻塞：SERVICE-004、PLAN-006、PLAN-007。
- 验收：每个 Run 都有明确开始和结束，A2UI 只来自已验证编译结果。

### 集成验收

#### ACCEPTANCE-001 建立跨模块 Fixture

- 产出：Markdown、JSON、Catalog、领域组件、非法输入、超限、超时和取消 Fixture。
- 需求映射：第 17.4 节。
- 阻塞：CONTRACT-003。
- 验收：Fixture 不包含真实外部系统或真实领域组件代码。

#### ACCEPTANCE-002 完成 Contract 和 Integration Test

- 产出：需求第 17.2 和 17.3 节要求的契约及 14 条集成链路。
- 需求映射：第 17、18 节。
- 阻塞：SERVICE-005、SERVICE-006、ACCEPTANCE-001。
- 验收：超限数据在 Model Adapter 调用前被拒绝，并验证模型调用次数为零。

#### ACCEPTANCE-003 完成 E2E 和发布验收

- 产出：HTTP、AG-UI、降级、超时、取消、Docker 构建和独立启动验证。
- 需求映射：第 17.3、18、20 节。
- 阻塞：ACCEPTANCE-002。
- 验收：`pnpm validate`、Docker 构建和测试客户端 E2E 全部通过。

## 4. 首批推荐 Frontier

任务发布到 GitHub 后，首批推荐完成以下决策：

- PLAN-000 对齐固定 UI 模板降级范围。
- PLAN-001 将 A2UI v0.9.1 Profile 固化为 ADR。
- PLAN-002 确认 Schema 校验库。

PLAN-005 同样没有技术 blocker，但应推迟到阶段四准备开始时处理，避免过早固定 HTTP 技术选择。
在 PLAN-000、PLAN-001 和 PLAN-002 完成之前，不应创建产品实现代码。
