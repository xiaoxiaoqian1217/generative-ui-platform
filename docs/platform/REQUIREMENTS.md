# Generative UI Platform 平台级需求

**适用范围：** 整个仓库。

**文档关系：** 本文新增平台级范围，不替代或删除现有 Compiler MVP 文档。
`docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 继续作为 Generative UI Compiler 子系统基线。

## 1. 建设背景

仓库当前已不再只验证 UI Compiler Core 和独立 UI Compiler Service 的历史 MVP。
Agent Runtime Host 和 Generative UI Workbench 已进入仓库，当前阶段需要验证 Business Agent 接入、嵌入式 Presentation Pipeline、浏览器 A2UI 渲染和 Action 回传的完整链路。

```text
用户输入
→ Workbench
→ Agent Runtime Host
→ Business Agent Adapter
→ Reference Business Agent
→ Markdown / Structured Data
→ Embedded Presentation Pipeline
→ untrusted PresentationDecision Candidate
   ├── markdown
   └── generative-ui + UI Plan Candidate → UI Compiler Core
→ Markdown / A2UI
→ Frontend Runtime
→ Action 回传
```

## 2. 平台定位

Generative UI Platform 是面向 Agent 应用的生成式 UI 编译与交互运行基础设施。
平台把 Business Agent 输出的 Markdown 或结构化业务数据转换为受 Schema、Policy 和 Component Catalog 约束的展示结果。
平台不是任意前端代码生成器，也不要求 Business Agent 理解 A2UI 或前端组件。

## 3. 当前阶段目标

当前平台开发验证阶段必须支持：

- Web 只连接 Agent Runtime Host；
- Runtime Host 通过可替换 Adapter 调用协议无关的 Business Agent；
- Business Agent 只输出 Markdown 或结构化业务数据；
- Runtime Host 在进程内组装 Presentation Pipeline；
- Presentation Pipeline 通过 Model Adapter 产生不可信的 PresentationDecision Candidate，仅 `generative-ui` 分支包含 UI Plan Candidate；
- UI Compiler Core 是唯一可信 A2UI 生产者；
- Frontend Runtime 渲染 Markdown 和 A2UI；
- 用户 Action 经 Runtime Host 校验后回传 Business Agent；
- HTTP 和 WebSocket 共用同一应用层编排；
- 浏览器 E2E 使用进程内确定性替身或受控测试服务，不依赖模型密钥；
- 真实 Presentation Model Provider 可由开发人员通过 Workbench 显式联调；
- 开发环境支持统一启动、构建、验证和诊断。

## 4. 当前允许建设

- TypeScript LangGraph Reference Business Agent；
- Business Agent Contract 与 Adapter；
- Runtime Host Run 和 Action 编排；
- Presentation Pipeline Package；
- Presentation Model Adapter 多供应商验证；
- Generative UI Workbench；
- Markdown Renderer 和 Vue A2UI Renderer；
- Component Registry 参考实现；
- Action 回传和 LangGraph Resume；
- HTTP / WebSocket 双链路；
- Playwright 全链路 E2E；
- 平台级诊断和一键开发环境。

## 5. 当前非目标

- Interaction Gateway；
- 多 Business Agent 自动路由；
- 多 Agent 自主协同；
- 真实设备控制；
- 生产数据库、权限和计费；
- 长期会话持久化；
- 任意 HTML、JavaScript、Vue 或 React 代码生成；
- 完整 A2UI 全规范；
- 正式业务产品前端。

## 6. 强制边界

### Web

只允许 `Web → Agent Runtime Host`。
Web 不得直接调用 Business Agent、Presentation Pipeline、UI Compiler Core 或模型供应商。

### Business Agent

Business Agent 负责业务推理、工具、状态和工作流恢复。
Business Agent 不得输出 UI Plan Candidate、A2UI、HTML、Vue 或组件选择结果。

### Model Adapter

平台当前所称 Model Adapter 属于 Presentation Pipeline。
它把清洗后的 AgentContent 和展示上下文转换为受 Schema 约束但仍不可信的 PresentationDecision Candidate；仅 `generative-ui` 分支包含 UI Plan Candidate。
它不用于 Business Agent 业务推理，也不得直接产生可信 A2UI。

### Compiler Core

UI Compiler Core 必须保持框架、传输、Agent 框架和模型供应商中立。

## 7. 文档优先级

- 跨子系统关系和平台范围以本文及 `docs/platform/ARCHITECTURE.md` 为准。
- Compiler 子系统内部行为继续以原 Compiler MVP 文档为准。
- 当前阶段执行范围以已批准的 Goal 或 Issue 为准。
- Roadmap 不自动授权实现。

## 8. 完成标准

- 新克隆仓库可冻结安装；
- 一个命令启动 Workbench、Runtime Host 和 Reference Business Agent，并在 Runtime Host 内嵌入 Presentation Pipeline；
- 进程内确定性测试替身和受控测试服务不需要模型密钥；
- HTTP 和 WebSocket 全链路通过；
- Markdown 和 A2UI 均可在浏览器展示；
- Action 可回传并恢复业务流程；
- 真实 UI Compiler 模型供应商不作为 CI 或合并门槛；
- Playwright E2E 在 CI 稳定通过；
- 关键阶段可通过关联 ID 诊断；
- 敏感配置不进入浏览器或日志。
