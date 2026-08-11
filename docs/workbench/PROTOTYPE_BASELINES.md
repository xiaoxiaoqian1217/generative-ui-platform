# Workbench 已接受原型基线

本文冻结当前 Workbench 已经完成评审的交互原型成果，避免在进入实现阶段后重复讨论已经验证过的 UI / IA 方向。

当前实现默认继承以下两个原型 Resolution。
除非出现新的业务证据、可用性问题或与当前有效 ADR 的明确冲突，否则不得重新开启同类方案选型。

## Issue #174：Conversation-first Workbench Shell

来源：<https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/174>

当前直接采用：

- Conversation-first 外壳；
- 顶部工具导航；
- 左侧 Conversation 列表区域；
- 主区保持纯自然语言对话流；
- Generative UI / Business Surface 内联于 Assistant 消息；
- completed 状态不制造额外视觉噪音，异常状态按需显示；
- Presentation / A2UI / 调试信息通过按需 Inspect 入口查看；
- Inspect 使用独立页面 / 深链接，而不是把完整诊断长期堆在主对话区。

ADR-0024 对 Historical Surface 的后续澄清继续有效：

> Historical Presentation 可以继续查看；Historical Action Authority 不可直接重放。

以下 #174 能力当前不作为实现 Release Gate：

- long-term Runtime-owned Conversation History；
- Rename / Archive / Delete / Clear-all；
- Runtime Host restart recovery；
- 为长期会话管理而建设完整 Runtime Repository 产品能力。

这些能力属于 Deferred Runtime Platform，不否定 #174 已接受的 Conversation-first UI / IA。

## Issue #179：Presentation / Execution Inspect

来源：<https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/179>

当前直接采用最终 Resolution：

- 变体 B：泳道时间线；
- 定位层展示稳定职责边界、sequence、status、duration、errorCode 等开发诊断元数据；
- Detail 层对契约边界 Artifact 使用 JSON 直通、按需展开，不在 Workbench 重新解释业务 payload；
- Inspect 采用 Artifact 粒度，而不是一个节点只有一份聚合 JSON；
- 只有真实存在请求 / 返回语义的 Artifact 才显示配对关系；
- 纯过程事件必须明确区分为“没有契约 Artifact”，不能伪造成缺失 JSON；
- AgentContent、Presentation Decision、UI Plan Candidate、Validation Result、UI IR、A2UI 等 Presentation 链路对象可逐项查看。

当前实现优先接入与 Presentation-first 主线直接相关的 Inspect 数据：

```text
Business Agent public activity
→ Final AgentContent
→ Presentation Request / Decision
→ UI Plan Candidate
→ Validation Result
→ UI IR
→ A2UI
→ Rendered Presentation
```

以下 #179 能力当前不作为实现 Release Gate：

- Runtime persisted / observed sequence recovery；
- Runtime Repository 重建；
- Action Resume 的完整 Runtime Diagnostics；
- Command Admission / Surface Lifecycle 产品化诊断；
- 为完整 Runtime Platform 建设的历史 Operation 重建。

原型中的这些场景和代码资产可以保留，后续重新激活 Agent Runtime Integration 时继续复用。

## 实现规则

后续 Workbench 实现默认按以下组合推进：

```text
#174
Conversation-first Shell
+ Inline Generated UI
+ on-demand Inspect

        ↓

#179
Swimlane Timeline
+ Artifact JSON pass-through
+ Presentation / Compiler Detail
```

不得因为 ADR-0027 的 Scope Reset 重新设计 Conversation Shell、Inline Business Surface、Inspect 信息架构或 Execution Map 方案。

当前需要解决的是“把已接受原型接到真实链路”，而不是再次进行原型选型：

```text
Natural Language
→ Business Agent
→ Final AgentContent
→ Presentation Router
→ Presentation Decision
→ UI Plan Candidate
→ UI Compiler Core
→ trusted A2UI
→ Workbench Renderer / Inspect
```
