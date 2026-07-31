# 平台全链路开发验证环境

## 1. 定位

本环境是 Generative UI Platform 的研发基础设施和集成验证环境。

它不是独立产品，也不是正式业务系统。

它用于：

- 开发。
- 联调。
- 诊断。
- 自动化回归。
- Business Agent 接入验证。
- UI Compiler 多模型验证。
- A2UI Renderer 验证。
- Action 回传验证。
- 平台能力演示。

## 2. 环境组成

```text
apps/web-workbench
apps/agent-runtime-host
apps/business-agent-langgraph
apps/ui-compiler-service
```

共享能力包括：

- Business Agent Contract。
- Runtime Contract。
- Presentation Contract。
- Component Catalog。
- A2UI Renderer。
- Fixture 场景。
- E2E 与诊断脚本。

## 3. 默认运行模式

默认使用确定性 Fixture：

```bash
UI_COMPILER_MODEL_PROVIDER=fixture
```

默认模式必须：

- 不需要模型 API Key。
- 不产生模型调用费用。
- 可以在 CI 稳定重复。
- 支持模拟模型超时、限流、非法输出和降级。

真实模型模式用于手动或受控 Smoke Test。

## 4. 模型验证范围

UI Compiler Model Adapter 应支持可配置接入：

- Kimi。
- 豆包。
- GLM。
- 通义千问。

模型供应商只参与 UI Plan Candidate 生成。

模型不得直接生成可信 A2UI，也不得承担 Business Agent 业务推理。

## 5. 参考场景

开发环境使用智慧安防巡逻作为参考场景：

- 查询设备状态。
- 生成巡逻计划。
- 展示风险和步骤。
- 用户确认任务。
- LangGraph 恢复业务流程。
- 页面更新任务状态。

参考场景用于验证平台，不代表平台绑定智慧安防领域。

## 6. 目标命令

```bash
pnpm dev:platform
pnpm build:platform
pnpm test:e2e:platform
pnpm verify:platform
```

默认端口：

```text
Web Workbench       5173
Agent Runtime Host  8200
Business Agent      8300
UI Compiler Service 3000
```

## 7. 验证范围

必须验证：

- HTTP 完整链路。
- WebSocket 完整链路。
- Markdown 展示。
- A2UI 展示。
- Action 回传。
- Business Agent 暂停和恢复。
- Model Adapter Fixture。
- 至少一个真实模型 Smoke Test。
- Business Agent 不可用。
- UI Compiler 不可用。
- 模型超时或非法 UI Plan Candidate。
- 非法 A2UI。
- 非法 Action。

## 8. 完成条件

```text
用户输入
-> Runtime Host
-> Business Agent Adapter
-> LangGraph Business Agent
-> AgentContent
-> UI Compiler Service
-> Model Adapter
-> UI Plan Candidate
-> UI Compiler Core
-> A2UI
-> Vue Renderer
-> Action
-> LangGraph Resume
-> 新 PresentationResult
```

以上链路在 Fixture 模式和至少一个真实 UI Compiler 模型模式下均可完成时，开发验证环境才算准备完成。
