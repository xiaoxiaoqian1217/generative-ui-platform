# 文档导航

当前仓库只激活一条纵向链路：

```text
Business Agent or AGUIMock
-> AG-UI
-> CopilotKit
-> Web Workbench
-> Controlled UI or Frontend Tool
```

第一条场景是 `locateDevice`。
当前阶段先用真实场景验证 Agent 调用浏览器 Frontend Tool，再根据后续场景决定是否抽象公共平台能力。

## 状态词

阅读本仓库文档时必须区分四种状态。

| 状态 | 含义 | 处理规则 |
|---|---|---|
| Active | 当前 Release Gate 的组成部分 | 可以围绕真实纵向场景继续实现 |
| Frozen | 为后续阶段保留，但当前不扩建 | 不得当作迁移债务删除，不得重新依赖旧 contracts |
| Removed | 实现已经移除 | 未经新的阶段决策不得恢复 |
| Historical | 保留的决策或设计记录 | 不作为当前代码布局、接口或 Release Gate 的事实来源 |

Frozen 不等于废弃。
Removed 也不表示应该删除历史文档。

## 当前权威入口

以下文档描述当前代码与范围：

- [根 README](../README.md)：产品主链路、模块状态与开发原则；
- [AGENTS.md](../AGENTS.md)：编码 Agent 必须遵守的范围与依赖规则；
- [CONTEXT.md](../CONTEXT.md)：当前目标、仓库结构与延期能力；
- [ADR-0028](./adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md)：当前阶段决策以及 Active、Frozen、Removed、Historical 的正式定义；
- [Web Workbench 手册](../apps/web-workbench/README.md)：当前运行、配置、交互边界与验证命令；
- [AG-UI Mock 手册](../packages/ag-ui-mock/README.md)：测试服务与 `locate-device` 场景。

发生冲突时，以 ADR-0028、根 `AGENTS.md` 和当前代码为准。

## Active

当前 Active 模块：

```text
apps/web-workbench
packages/ag-ui-mock
packages/ag-ui-adapter
packages/shared-types
```

Workbench 直接使用 CopilotKit 与原生 AG-UI 消息。
AG-UI Adapter 只承载协议边界辅助能力，并以 `@ag-ui/core` 为事实来源。

## Frozen

以下 Workbench 资产继续保留：

- Playground / Inspect / Cases / Catalog / Scenarios / Settings 路由；
- 本地 A2UI reducer、受控 renderer、raw viewer 与 component registry；
- [已接受的 Workbench 原型基线](./workbench/PROTOTYPE_BASELINES.md)；
- case library 与 inspection 支持。

[旧 Workbench SRS](./WEB_WORKBENCH_SRS.md) 与 [Workbench 文档索引](./workbench/README.md) 记录了上一阶段更大的产品设想。
它们现在属于 Frozen / Historical 输入，不是当前 Release Gate。

## Removed

以下兼容 contract 包已经删除：

```text
packages/compiler-contract
packages/presentation-contract
packages/runtime-contract
```

以下上一阶段实现也保持删除状态：

- Agent Runtime Host；
- Reference Business Agent；
- Business Agent Adapter；
- Presentation Pipeline；
- UI Compiler Core；
- Component Catalog Schema；
- Runtime Platform 配套脚本与 workspace architecture tests。

旧代码恢复点为 `archive/pre-scope-reset-2026-08-13` 和提交 `c33504db91614420c2ccdf26a8c707f61d659065`。
恢复点只用于历史调查，不能替代新的阶段决策。

## Historical

以下目录和文档保留历史设计价值，但不描述当前实现：

- [Compiler MVP 需求](./REQUIREMENTS.md)；
- [Compiler MVP 架构](./ARCHITECTURE.md)；
- [Compiler 系统设计](./Generative_UI_Compiler_Design.md)；
- [旧数据契约](./CONTRACTS.md)；
- [旧 Platform 文档](./platform/README.md)；
- [旧 Compiler 操作资料](./operations/)；
- [ADR-0001 至 ADR-0027](./adr/README.md)。

历史文档中的模块路径、命令、端口、环境变量、Contract 和 Release Gate 可能已经失效。
除非 ADR-0028 或当前权威入口明确保留某条规则，否则不要从历史资料恢复代码。

## 文档维护规则

- 当前行为变化时，优先就地更新当前权威入口。
- 冻结能力重新进入 Active 前，必须由真实场景和新的 ADR 明确开启。
- 历史文档保留原始语境，只增加状态说明，不静默重写旧决策。
- 不手工修改 `CHANGELOG.md` 或任何自动生成文件。
