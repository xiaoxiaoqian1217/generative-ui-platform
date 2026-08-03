# 平台全链路开发验证环境

## 1. 定位

本环境是 Generative UI Platform 的研发基础设施和集成验证环境。
它不是独立产品，也不是正式业务前端。

它用于开发、联调、诊断、自动化回归和能力演示。

## 2. 验证目标

```text
用户输入
→ Workbench
→ Agent Runtime Host
→ Business Agent Adapter
→ Reference Business Agent
→ AgentContent
→ Embedded Presentation Pipeline
→ UI Plan Candidate
→ UI Compiler Core
→ Markdown / A2UI
→ Browser Renderer
→ Action 回传
→ Business Agent Resume
```

## 3. 组成

- Generative UI Workbench；
- Agent Runtime Host；
- TypeScript LangGraph Reference Business Agent；
- 嵌入 Agent Runtime Host 的 Presentation Pipeline；
- Presentation Model Adapter Fixture 和真实供应商配置；
- Vue A2UI Renderer；
- Component Registry 参考实现；
- Playwright E2E；
- 开发诊断面板。

## 4. 默认开发拓扑

```text
Workbench              http://localhost:5173
Agent Runtime Host     http://localhost:8200
Reference Agent        http://localhost:8300
```

## 5. 开发模式

默认使用确定性的 Fixture 模式。
Fixture 模式不需要模型密钥，不产生模型费用，并作为 CI 的标准验证方式。

真实模型模式只用于 Presentation Model Adapter Smoke Test。
模型供应商、模型名称、Base URL 和认证配置必须通过环境变量提供。
真实 Provider Smoke Test 使用 `pnpm --filter @generative-ui/presentation-pipeline test:provider-smoke` 按需执行。
该命令要求显式提供 `PRESENTATION_PROVIDER_SMOKE_PROVIDER`、`PRESENTATION_PROVIDER_SMOKE_MODEL_NAME` 和 `PRESENTATION_PROVIDER_SMOKE_API_KEY`。
可选的 `PRESENTATION_PROVIDER_SMOKE_BASE_URL` 与 `PRESENTATION_PROVIDER_SMOKE_ENDPOINT_ID` 分别覆盖访问地址和部署 Endpoint，不与模型名或 API Key 合并。
常规测试不会读取这些变量或产生模型费用。

## 6. 统一命令目标

```bash
pnpm dev:platform
pnpm build:platform
pnpm test:e2e:platform
pnpm verify:platform
```

这些命令属于当前阶段的目标接口。
在实现完成前，文档不得声称命令已经可用。

## 7. 验收场景

- 查询设备状态；
- 生成巡逻计划；
- 渲染 Markdown；
- 渲染 A2UI；
- 点击确认操作；
- 恢复 LangGraph 流程；
- 切换 HTTP 和 WebSocket；
- 验证 Presentation Model Adapter Fixture；
- 至少验证一个真实模型供应商；
- 查看完整安全诊断链路。

## 8. 非目标

- 正式业务产品；
- 多 Agent 路由；
- 真实设备控制；
- 生产数据和权限系统；
- 长期会话持久化；
- 完整 A2UI 规范；
- 任意前端代码生成。
