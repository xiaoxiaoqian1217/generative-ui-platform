# Workbench 已接受原型基线

本文保留已经完成评审、仍有产品价值的 Workbench UI / IA 结论。

这里冻结的是**交互设计方向**，不是某一版 Runtime / Presentation / Compiler 架构。
后续实现应把这些交互原则映射到当时真实存在的系统边界和协议事实。

## Issue #174：Conversation-first Workbench Shell

来源：<https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/174>

继续保留的产品结论：

- Conversation-first 外壳；
- 顶部工具导航；
- 左侧 Conversation 列表区域；
- 主区保持自然语言对话流；
- Business Surface / Generative UI 可以内联于 Assistant 消息；
- completed 状态不制造额外视觉噪音，异常状态按需显示；
- 调试信息通过按需 Inspect 入口查看；
- Inspect 使用独立页面 / 深链接，而不是把完整诊断长期堆在主对话区。

以下能力不因为原型存在就自动进入当前 Release Gate：

- long-term Runtime-owned Conversation History；
- Rename / Archive / Delete / Clear-all；
- Runtime Host restart recovery；
- 完整 Runtime Repository 产品能力。

这些属于 Deferred Runtime Platform。

## Issue #179：Inspect 信息架构

来源：<https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/179>

继续保留的交互与信息表达结论：

- 使用泳道时间线表达真实发生的职责边界和事件顺序；
- 展示 sequence、status、duration、errorCode 等诊断元数据；
- 对真实契约 Artifact 使用 JSON 直通、按需展开；
- Inspect 采用 Artifact / Event 粒度，不把所有信息压成单个聚合 JSON；
- 只有真实存在请求 / 返回语义的 Artifact 才显示配对关系；
- 纯过程事件必须明确表示“没有契约 Artifact”，不能伪造缺失 JSON；
- Detail 只展示系统真实可观察事实，不虚构未暴露的服务端步骤。

### 当前阶段如何解释泳道

旧原型曾围绕 Runtime Host、Presentation Pipeline、UI Compiler 等固定节点组织泳道。
这些节点不再是当前产品模型。

当前实现必须遵循：

> **真实发生了什么，就 Inspect 什么。**

例如当前或近期可能观察到：

```text
Workbench
  ↓
CopilotKit Frontend
  ↓
CopilotKit Runtime（#207 完成后）
  ↓
AGUIMock / single-agent-chat-server
  ↓
AG-UI Events
  ↓
Workbench UI
```

Frontend Tool 场景可以出现：

```text
AG-UI Tool Call
  ↓
Frontend Tool
  ↓
Browser Capability
  ↓
Tool Result / continuation
```

A2UI 进入实现后，可以自然增加 A2UI event / artifact / renderer 相关事实，但不得为了匹配旧原型恢复 Presentation Pipeline 或 UI Compiler。

## 使用规则

后续 Workbench 实现默认继承：

```text
Conversation-first Shell
+ Inline Business / Generated UI
+ on-demand Inspect
+ Swimlane Timeline
+ JSON pass-through for real artifacts
```

但以下内容必须由当前架构决定，而不是由原型决定：

- 泳道有哪些参与者；
- 哪些事件存在；
- 哪些 Artifact 可以观察；
- 是否存在 Tool Call；
- 是否存在 A2UI；
- 是否存在 Runtime 中间层。

因此，本文件是**产品交互基线**，不是架构恢复点。

当前架构以 [docs/ARCHITECTURE.md](../ARCHITECTURE.md) 和 [ADR-0029](../adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md) 为准。
