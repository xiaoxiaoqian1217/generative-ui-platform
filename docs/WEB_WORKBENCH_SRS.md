# Generative UI Workbench Specification

**文档版本：** 0.6

**项目阶段：** Presentation-first MVP

**所属项目：** Generative UI Platform

**产品名称：** Generative UI Workbench

**中文名称：** 生成式 UI 开发与验证工作台

> 本文定义 Workbench 当前产品行为和 MVP Release Gate。
> 当前阶段范围以 ADR-0027 为准。
> Runtime Truth 和 Agent Runtime Integration 继续由 ADR-0024 / ADR-0025 定义，但不再属于当前 Workbench MVP Release Gate。

## 0. 产品定位

Generative UI Workbench 当前定位为：

> **Generative UI Lab / 可视化开发调试工作台。**

Workbench 的首要任务不是管理 Agent Runtime。
它的首要任务是让开发者能够回答：

> 给定一份 AgentContent，平台为什么生成了这个 UI，这个 UI 是否正确、漂亮、稳定、主题一致且受控？

Workbench 是开发者产品，不是最终业务生产前端。

## 1. 为什么需要 Workbench

Generative UI 的主要风险不只在“能不能生成”。
更重要的是：

- 模型是否正确理解业务内容；
- 是否选择了合理的信息层级；
- 是否使用了存在且允许的组件；
- Props 和 Binding 是否正确；
- 是否生成了不应该存在的 Action；
- UI Plan 是否可以通过 Compiler；
- fallback 是否明确；
- 同一输入多次生成是否稳定；
- Theme 改变后业务语义是否保持一致；
- 最终 Renderer 是否稳定。

如果这些信息只能从日志、接口返回和浏览器页面分散查看，就很难持续改进 Generative UI 质量。

Workbench 因此必须把完整 Presentation 过程可视化。

## 2. 当前核心用户

Workbench 当前主要服务：

- Presentation Pipeline 开发者；
- UI Compiler Core 开发者；
- Component Catalog / Renderer 开发者；
- Theme / Design System 开发者；
- Presentation Model / Prompt 调试人员；
- 测试人员；
- Business Agent 集成人员；
- 架构师和产品负责人。

## 3. 当前核心用户任务

Workbench MVP 必须支持以下核心任务。

### T1 输入 AgentContent

用户可以：

- 输入 Markdown；
- 输入 structured business data；
- 选择 Reference Scenario；
- 查看规范化后的最终 AgentContent。

Workbench 必须明确区分：

```text
Business Content
≠
UI Plan
≠
A2UI
```

Business Agent 的最终输入不得包含 UI Plan Candidate、A2UI、HTML 或前端代码。

### T2 触发 Presentation

用户可以触发当前 Presentation Pipeline。

Workbench 必须展示：

- Presentation mode；
- Markdown / Generative UI 路由结果；
- 成功、失败或 fallback；
- 使用的 Presentation Context 摘要；
- 使用的 Theme / Catalog 标识；
- 生成耗时等必要开发信息。

Workbench 不负责自己生成 UI Plan。

### T3 查看 UI Plan Candidate

当选择 Generative UI 路径时，用户必须能够查看模型返回的 UI Plan Candidate。

Workbench 必须明确标记：

> UI Plan Candidate is untrusted.

用户应能够理解：

- 模型选择了哪些组件能力；
- 主要布局结构是什么；
- 数据绑定目标是什么；
- 是否包含 Action Descriptor；
- 哪些字段来自 Presentation Context。

### T4 查看 Compiler / Validation

Workbench 必须能够查看：

- Schema Validation；
- Catalog Validation；
- Props Validation；
- Binding Validation；
- Action / Policy Validation；
- Compiler failure / fallback reason；
- 最终可信输出状态。

模型候选被拒绝时，Workbench 必须显示明确原因。

Workbench 不得把 Compiler rejection 隐藏成普通空白页面。

### T5 查看 trusted A2UI

用户必须能够查看最终 trusted A2UI。

A2UI Raw Viewer 应作为开发工具存在。

Raw Viewer 必须：

- 只读；
- 有长度和性能保护；
- 不执行其中的任意代码；
- 清楚区分 trusted A2UI 与原始 UI Plan Candidate。

### T6 查看最终 Rendered UI

Workbench 必须提供受控 Renderer 预览。

Renderer 只能使用 Component Registry 中注册的组件。

Renderer MUST NOT：

- 执行模型生成 JavaScript；
- 执行任意 HTML；
- 动态加载模型指定的未知远程组件；
- 绕过 Component Catalog / Registry。

### T7 Theme / Presentation Context 调试

Workbench 必须把 Theme 作为当前主线开发能力。

用户应能够在不改变 AgentContent 的前提下切换受控 Theme / Presentation Context。

至少需要能够验证：

- light / dark 或项目定义的主题变体；
- density；
- component variants；
- viewport / device context；
- Catalog 版本或能力摘要。

Theme 改变后：

- Business Truth 必须保持一致；
- Compiler 安全边界不得变化；
- 不得因为 Theme 自动获得新的业务 Action 权限。

### T8 Compare

Workbench SHOULD 支持把同一 AgentContent 在不同条件下进行比较。

比较维度可以包括：

- 不同 Theme；
- 不同 Presentation Model；
- 不同 Prompt / Model Config；
- 不同 Catalog；
- 不同 Viewport；
- 同一配置的重复生成。

Compare 的目标是定位 Presentation 质量变化，而不是建设完整实验管理平台。

### T9 Reliability

Workbench MUST 能够验证至少以下可靠性场景：

- 合法 UI Plan；
- 非法 Component；
- 非法 Props；
- 无效 Binding；
- 不允许的 Action；
- Model timeout / invalid output；
- Compiler rejection；
- Markdown fallback；
- Renderer failure boundary；
- 同一输入重复生成。

具体评分体系可以后续扩展。

## 4. MVP 信息架构

当前推荐的信息架构围绕 Presentation 调试，而不是 Conversation-first。

```text
Workbench
├── Input / Scenario
├── Presentation
│   ├── Rendered UI
│   ├── Decision
│   ├── UI Plan
│   ├── Validation
│   └── A2UI
├── Theme / Context
├── Catalog
└── Compare / Reliability
```

具体布局可以调整。
但用户必须能够从最终 UI 快速追溯到 AgentContent、Decision、UI Plan、Compiler 和 A2UI。

## 5. 当前不再作为 MVP Release Gate 的能力

ADR-0027 之后，以下能力不再决定 Workbench MVP 是否完成：

- Conversation-first；
- Runtime-owned Conversation History；
- Conversation Rename / Archive / Delete；
- Runtime Thread / Turn / Operation 浏览；
- Runtime Host 重启后的会话恢复；
- Surface Lifecycle 产品化；
- Command Admission 产品化；
- Reconcile；
- `indeterminate` Runtime UX；
- 完整逐 Operation Runtime Diagnostics；
- Diagnostic Bundle 产品化；
- 完整 Case / Regression Management。

这些能力的已有实现可以暂时保留。
本次 Scope Reset 不要求立即删除。

但是当前不得继续以“完善这些能力”为理由扩大 Workbench 产品范围。

## 6. Supporting Agent Integration

Workbench MAY 保留当前 CopilotKit / AG-UI 参考集成，用于从真实 Business Agent 链路获取 AgentContent。

参考链路可以是：

```text
Reference Business Agent
        ↓
Business Agent Adapter
        ↓
Agent Runtime Host
        ↓
AG-UI / current integration
        ↓
Workbench
```

这条链路是 Supporting Integration。

Workbench 核心产品价值不能依赖以下前提：

- Business Agent 必须支持 AG-UI；
- 平台必须拥有完整 Runtime Thread；
- 平台必须拥有 Conversation History；
- 平台必须采用 CopilotKit。

未来替换 CopilotKit 时，Workbench 的 Presentation 调试心智不应变化。

## 7. Workbench 与 Core 的职责边界

Workbench 可以：

- 选择输入；
- 选择 Theme / Context；
- 触发 Presentation；
- 展示开发诊断信息；
- 渲染 trusted Presentation；
- 比较结果。

Workbench MUST NOT：

- 重新解释 Business Truth；
- 自己调用模型产生另一份 UI Plan；
- 绕过 Presentation Pipeline；
- 绕过 UI Compiler Core；
- 把原始 UI Plan 当作 trusted A2UI；
- 动态执行模型生成代码；
- 持有 Presentation Model Provider 密钥。

## 8. Supporting Developer Tools

以下能力 MAY 建设，并且属于当前方向：

- Component Catalog Browser；
- Component Playground；
- Theme Editor；
- Theme Preview；
- Viewport Preview；
- Reference Scenarios；
- Prompt / Model Config 开发预览；
- Generation timing；
- Token / cost 摘要；
- Snapshot compare；
- Presentation Result export；
- Compiler error explorer。

这些能力的共同准入条件是：

> 直接提高 Generative UI 的质量、可靠性或开发效率。

## 9. 非目标

Workbench 当前不是：

- Business Agent；
- Agent Runtime Platform；
- 多 Agent Gateway；
- Business Agent 私有状态管理器；
- Runtime Repository 管理台；
- 完整 Observability Platform；
- 正式业务生产前端；
- 任意前端代码生成器；
- 完整实验平台；
- 完整回归测试管理系统。

## 10. MVP Release Gate

Workbench MVP 只看以下六类能力。

### G1 Input

- 可以输入或选择最终 AgentContent；
- 可以清楚看到业务内容原始形态。

### G2 Presentation Trace

- 可以查看 Presentation mode；
- 可以查看 UI Plan Candidate；
- 可以查看 Validation / Compiler Result；
- 可以查看 trusted A2UI。

### G3 Render

- 可以安全展示 Markdown；
- 可以使用受控组件稳定渲染 trusted A2UI；
- fallback / error 状态清楚。

### G4 Theme

- 可以切换受控 Theme / Presentation Context；
- 可以验证同一 AgentContent 在不同主题下的 UI；
- 主题不改变 Business Truth 或安全边界。

### G5 Reliability

- 可以复现至少一组合法、非法、fallback 和重复生成场景；
- 可以定位问题发生在 Model、UI Plan、Compiler 还是 Renderer。

### G6 Framework Independence

- Workbench 的核心 Presentation 调试模型不依赖完整 Agent Runtime；
- CopilotKit / AG-UI 只作为当前参考 Agent Integration。

## 11. 迁移原则

当前代码已经包含 Conversation、Inspect、Cases、Runtime 状态和兼容路径。

迁移顺序是：

1. 先停止新增 Runtime-first Workbench 功能；
2. 保持现有主链路可运行；
3. 将默认开发注意力转向 Presentation Lab；
4. 建立 Theme / Compare / Reliability 能力；
5. 后续通过独立 Issue 判断旧 Runtime 页面保留、隐藏还是删除。

本 SRS 不要求本次文档 PR 同时完成代码重构。
