# Generative UI Platform 需求规格说明书

**文档版本：** 1.0
**项目阶段：** MVP

## 项目目标

构建独立的 UI Compiler Agent 能力，将业务 Agent 输出转换为标准化交互协议和前端可渲染 UI。

## 核心边界

- UI Compiler Core 独立于业务 Agent。
- 前端只连接统一交互层，不直接依赖业务 Agent。
- 业务 Agent 负责领域推理。
- Compiler 负责 UI 编译和交互协议转换。

## 架构方向

```text
Frontend
   |
AG-UI / Interaction Protocol
   |
UI Compiler Agent
   |
Business Agents
```

## MVP 范围

1. UI IR 定义
2. Markdown / Structured Data 编译
3. Component Registry
4. AG-UI 事件输出
5. Agent 调用接口

## 非目标

- 本阶段不实现完整业务 Agent。
- 本阶段不绑定 CopilotKit Runtime。
- 本阶段不实现复杂前端应用。

详细设计后续维护于 docs/。
