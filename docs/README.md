# 文档导航

本目录按“平台级规范、子系统基线、阶段 Goal、架构决策”组织。

旧文档继续保留，不删除、不覆盖其历史背景。

## 1. 规范优先级

发生范围或架构冲突时，按以下顺序判断：

1. 已接受的 ADR。
2. `docs/platform/REQUIREMENTS.md`。
3. `docs/platform/ARCHITECTURE.md`。
4. 当前已批准的 Goal。
5. 对应子系统的需求、架构和设计文档。
6. Roadmap 和说明性文档。

## 2. 平台级文档

- [平台需求](./platform/REQUIREMENTS.md)
- [平台架构](./platform/ARCHITECTURE.md)
- [开发验证环境](./platform/DEVELOPMENT_ENVIRONMENT.md)

平台级文档描述整个 Generative UI Platform 仓库的当前边界。

## 3. 当前阶段 Goal

- [GOAL-DEV-ENV-001 全链路开发验证环境建设](./goals/GOAL-DEV-ENV-001.md)

Goal 是阶段性交付范围，不是独立产品定义。

## 4. UI Compiler 子系统基线

- [Compiler 文档索引](./compiler/README.md)
- [原 Compiler MVP 需求](./REQUIREMENTS.md)
- [原 Compiler MVP 架构](./ARCHITECTURE.md)
- [原 Compiler MVP 设计](./Generative_UI_Compiler_Design.md)

这些旧文档继续作为 UI Compiler 子系统的历史需求与设计基线。

其中“当前产品”“当前 MVP”等表述应理解为文档形成时的 Compiler MVP 阶段，不再代表整个仓库的当前交付范围。

## 5. Workbench 文档

- [Generative UI Workbench SRS](./WEB_WORKBENCH_SRS.md)

Workbench 是平台的 Frontend Runtime 参考实现和开发验收环境，不是独立企业业务产品。

## 6. 契约和决策

- [数据契约](./CONTRACTS.md)
- [ADR 目录](./adr/)

## 7. 旧文档保留原则

- 不因平台范围变化删除旧需求、架构或设计文档。
- 不通过静默改写历史文档掩盖原阶段决策。
- 使用新平台级文档声明当前规范。
- 使用 ADR 记录范围变化及原因。
- 子系统实现仍应遵守对应子系统文档中未被新平台规范明确替代的约束。
