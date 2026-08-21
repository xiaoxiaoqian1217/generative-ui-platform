# ADR-0031：将 Scenario Fixture Authoring 与 Secondary Presentation LLM 分离

- **状态：** Accepted
- **日期：** 2026-08-19
- **范围：** Issue #213 Scenario Lab、本地 fixture authoring、Secondary Presentation LLM 职责

## 背景

Issue #213 允许 Workbench 在现有 Scenarios 路由内编辑仓库中的 Scenario JSON，并通过真实 Secondary Presentation LLM 运行 Dynamic A2UI evaluation。
自然语言辅助起草 Scenario fixture 可以降低本地实验的编辑成本。
但是草稿模型产生的是合成业务内容，而 ADR-0030 中的 Secondary Presentation LLM 只允许决定如何展示既有业务事实。
如果直接复用 `A2UI_SECONDARY_LLM_*` 和 `secondary-llm.ts`，Presentation 角色会静默扩张为业务内容作者。
同时，Scenario Lab 具有仓库文件写入和可计费模型调用能力，仅使用 `/dev` URL 前缀不足以保证它只在本地启用。

## 决策

### 1. 建立独立的 Scenario Fixture Authoring module

Runtime 内允许存在一个仅服务 dev-only Scenario Lab 的 Scenario Fixture Authoring module。
该 module 的 interface 只接收自然语言描述并返回经过约束的合成 JSON fixture 内容。
它不参与 Presentation Policy、A2UI component 选择、Allowed Actions 或 Business Agent output projection。

Scenario Fixture Authoring 与 Secondary Presentation LLM 可以显式选择同一供应商或模型，但不得共享角色名称、环境变量或错误语义。
Presentation 继续使用 `A2UI_SECONDARY_LLM_*`。
Fixture authoring 使用独立的 `SCENARIO_DRAFT_LLM_*`。

### 2. Scenario Lab 必须显式启用

Scenario Lab 默认不挂载。
只有 `SCENARIO_LAB_ENABLED=true` 时，Runtime 才注册 list、save、run 和 draft 端点。
生产或 Internet-facing 部署不得仅依赖 `/dev` 路径作为访问控制。

### 3. 草稿不是业务事实来源

模型返回值只进入未保存的编辑 buffer。
自由生成预览不要求用户提供 expected facts。
只有保存为可复用评估场景时，Workbench 才要求人工核对 AI 草稿并手写 evaluation oracle。
服务端必须拒绝 evaluation oracle 为空的评估场景保存请求。
草稿不得声称来自 SACS、AGUIMock 或其他真实 Business Agent。

### 4. Authoring adapter 必须约束输入与输出

模型规则使用独立 system message，自然语言描述只作为 user content。
调用必须设置结构化 JSON schema、输出 token 上限和超时。
Runtime 必须再次校验顶层字段数量、嵌套深度、数组长度、字符串长度和总体大小。
无效输出不得进入 editor buffer。

### 5. 生成与评估必须使用独立接口

Scenario Lab 使用 source-neutral 的 `/api/dev/scenario-lab` 边界，不把 dev tooling 伪装成 `/api/copilotkit` 下的 Agent protocol 能力。
`POST /generations` 只接收 `presentationInput`，并执行一次自由 Dynamic A2UI 生成。
`POST /evaluations` 接收相同的 `presentationInput` 和独立的 `evaluationOracle`，在生成完成后执行事实保留检查。
`evaluationOracle` 不得进入 Secondary Presentation LLM prompt，也不得约束组件、布局或视觉表达。
Workbench 默认展示自由生成，高级评估和 oracle 编辑默认折叠。

## 与 ADR-0030 的关系

本 ADR 不扩展 ADR-0030 的 Secondary Presentation LLM 职责白名单。
它新增的是 dev-only Scenario fixture authoring 能力，并要求该能力保持独立配置和独立 module。
Dynamic A2UI 的 presentation chain、Final Catalog validation 和 SACS 接入顺序不变。

## 影响

- `secondary-llm.ts` 继续只承载 Secondary Presentation LLM adapter；
- Scenario fixture authoring 在 Runtime 内拥有独立 module 和测试；
- Scenario Lab 从默认挂载改为显式启用；
- 草稿生成失败使用 `SCENARIO_DRAFT_*` 错误语义，不再冒充 A2UI generation failure；
- CI 使用独立 deterministic fixture authoring adapter，不调用在线模型；
- 未来若 authoring 需要版本管理、协作或持久化能力，必须另行决策，不得扩张为通用 Prompt 或 Scenario Platform。
