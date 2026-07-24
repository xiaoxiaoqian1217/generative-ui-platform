# Generative UI Platform

本上下文定义 Generative UI Platform 及其当前产品的统一领域语言。

## Language

**Generative UI Platform**:
承载生成式 UI 编译能力及未来平台能力的长期产品和仓库边界。
_Avoid_: 使用 Generative UI Compiler 指代完整的长期平台

**Generative UI Compiler MVP**:
当前交付和验收的产品范围，仅包含 UI Compiler Core 和 UI Compiler Agent。
_Avoid_: Generative UI Platform MVP、Interaction Gateway MVP

**UI Compiler Core**:
将展示输入确定性地编译为受控 UI 描述的框架无关核心能力。
_Avoid_: Renderer、Business Agent、Gateway

**UI Compiler Agent**:
通过网络协议暴露 UI Compiler Core 的适配服务，不承担业务推理或 Agent 编排。
_Avoid_: Business Agent、Interaction Gateway

**Presentation Contract**:
业务 Agent 或其他调用方提交给 Generative UI Compiler 的展示输入契约。
_Avoid_: UI IR、A2UI、Presentation UI Schema

**UI IR**:
Generative UI Compiler 内部使用的框架无关中间表示。
_Avoid_: Presentation Contract、A2UI

**A2UI**:
Generative UI Compiler 当前默认输出的声明式 UI 协议。
_Avoid_: Presentation Contract、UI IR、Presentation UI Schema

**Component Catalog**:
声明 Compiler 可以选择的组件类型、语义、Schema、约束和版本。
_Avoid_: Component Registry、组件实现

**Component Registry**:
外部 Frontend Runtime 中从组件类型映射到真实组件实现的能力。
_Avoid_: Component Catalog、Compiler 组件库

**Interaction Gateway**:
未来用于统一连接前端和多个业务 Agent 的平台能力，不属于 Generative UI Compiler MVP。
_Avoid_: UI Compiler Agent、MVP Gateway
