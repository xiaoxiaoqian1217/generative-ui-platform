# 平台系统架构

本文描述 Generative UI Platform 的跨子系统关系。

## 主链路

```text
Workbench
→ Agent Runtime Host
→ Business Agent Adapter
→ Reference Business Agent
→ AgentContent
→ Embedded Presentation Pipeline
→ Model Adapter
→ untrusted PresentationDecision Candidate
   ├── markdown
   └── generative-ui + UI Plan Candidate → UI Compiler Core
→ PresentationResult
→ Frontend Runtime
```

## 职责边界

- Workbench 只连接 Agent Runtime Host。
- Business Agent 只输出 Markdown 或结构化数据。
- Model Adapter 位于 Presentation Pipeline，输出不可信的 PresentationDecision Candidate；仅 `generative-ui` 分支包含 UI Plan Candidate。
- Runtime Host 不生成 A2UI。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- Frontend Runtime 负责 Markdown 和 A2UI 渲染。

## 交互回传

```text
Frontend Runtime
→ Action Event
→ Agent Runtime Host
→ Business Agent Adapter
→ Business Agent Resume
→ New AgentContent
→ Embedded Presentation Pipeline
→ New PresentationResult
```

## 当前范围

当前阶段使用单一 Reference Business Agent 验证完整链路。
Interaction Gateway、多 Agent 自动路由和多 Agent 协作仍属于未来范围。
