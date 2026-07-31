# GOAL-DEV-ENV-001：生成式 UI 平台全链路开发验证环境建设

## 1. Goal

为 Generative UI Platform 建立可开发、可联调、可诊断、可回归和可演示的完整验证环境。

本 Goal 不是建设新的独立产品。
它是平台项目的阶段性工程建设任务。

## 2. 目标链路

```text
Workbench
→ Runtime Host
→ Business Agent Adapter
→ TypeScript LangGraph Reference Agent
→ Markdown / Structured Data
→ UI Compiler Service
→ Model Adapter
→ UI Plan Candidate
→ UI Compiler Core
→ A2UI
→ Vue Renderer
→ Action 回传
→ LangGraph Resume
```

## 3. 子任务

1. 平台公共契约；
2. TypeScript LangGraph Reference Business Agent；
3. Business Agent Adapter；
4. UI Compiler Model Adapter 多模型接入；
5. Runtime Host 平台编排；
6. Web Workbench 工程化；
7. Vue A2UI Renderer；
8. Action 回传闭环；
9. 完整平台 E2E；
10. 开发环境一键运行；
11. 诊断与可观测性；
12. 文档与演示。

## 4. 关键边界

- Business Agent 只输出 Markdown 或结构化数据；
- Model Adapter 位于 UI Compiler Service；
- Model Adapter 输出 UI Plan Candidate；
- UI Compiler Core 是唯一可信 A2UI 生产者；
- Web 只连接 Agent Runtime Host；
- Runtime Host 不承担 UI 规划和编译；
- Interaction Gateway 不属于本 Goal。

## 5. 完成条件

- 新克隆仓库可以冻结安装；
- 一个命令启动四个服务；
- Fixture 模式不需要模型密钥；
- HTTP 和 WebSocket 全链路通过；
- Markdown 和 A2UI 浏览器渲染通过；
- Action 回传和 LangGraph Resume 通过；
- 至少一个真实 UI Compiler 模型供应商通过 Smoke Test；
- Playwright E2E 在 CI 稳定通过；
- 关键阶段可以通过关联 ID 诊断；
- 文档明确区分平台、Compiler 子系统和开发验证环境。

## 6. 详细规范

- 平台需求：`docs/platform/REQUIREMENTS.md`；
- 平台架构：`docs/platform/SYSTEM_ARCHITECTURE.md`；
- 开发环境：`docs/platform/DEVELOPMENT_ENVIRONMENT.md`；
- Compiler MVP 需求：`docs/REQUIREMENTS.md`；
- Compiler MVP 架构：`docs/ARCHITECTURE.md`；
- Compiler 设计：`docs/Generative_UI_Compiler_Design.md`。
