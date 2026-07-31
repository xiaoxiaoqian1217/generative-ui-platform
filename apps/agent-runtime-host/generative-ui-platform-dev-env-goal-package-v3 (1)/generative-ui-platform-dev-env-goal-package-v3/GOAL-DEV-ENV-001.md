# GOAL-DEV-ENV-001：生成式 UI 平台全链路开发验证环境建设

## 0. 文档用途

本任务包用于指导开发团队或编码 Agent，在现有 Generative UI Platform 仓库中建设一套完整的开发、联调、诊断、自动化测试和演示环境。

本 Goal 不是一个独立产品，也不是新的业务系统。

它是生成式 UI 平台项目中的一项阶段性工程建设任务，定位为：

> 平台研发基础设施与全链路集成验证环境。

---

## 1. 所属平台项目背景

Generative UI Platform 是一个生成式 UI 编译与交互运行平台。

它的核心职责是：

```text
Business Agent 输出
→ Markdown 或结构化业务数据
→ UI Compiler Service
→ 展示分析
→ UI Plan Candidate
→ 受控编译
→ A2UI
→ 浏览器渲染
→ 用户 Action 回传
```

平台希望解决以下核心问题：

1. Business Agent 不应承担前端 UI 生成职责；
2. Business Agent 不需要理解 A2UI、组件协议或 Vue 实现；
3. 大模型不能直接生成可信的 HTML、前端代码或可执行 UI；
4. UI 必须受 Component Catalog、Schema 和 Policy 约束；
5. 用户在生成界面中的操作必须经过校验后回传业务 Agent；
6. 不同 Business Agent 应能够通过 Adapter 接入同一平台。

平台本身是长期建设对象。

当前 Goal 只负责为该平台搭建完整的开发验证环境。

---

## 2. 当前建设背景

当前仓库已经具备部分基础模块：

- UI Compiler Core；
- UI Compiler Service；
- Presentation Contract；
- Component Catalog Schema；
- Agent Runtime Host；
- HTTP / WebSocket Mock；
- 独立 Compiler 测试；
- Monorepo 构建、测试与 CI。

但是各能力仍以局部验证为主。

当前主要存在两条相互分离的链路：

```text
Web Demo
→ Runtime Host Mock
```

以及：

```text
Markdown / Structured Data
→ UI Compiler Service
→ PresentationResult / A2UI
```

尚不能从浏览器完整验证：

```text
用户输入
→ Runtime Host
→ Business Agent
→ 业务内容
→ UI Compiler
→ Model Adapter
→ UI Plan Candidate
→ A2UI
→ 浏览器渲染
→ 用户 Action
→ Business Agent 状态恢复
```

因此需要建设一套统一的全链路开发验证环境。

---

## 3. 建设目标

本 Goal 的目标是：

> 建立一套覆盖 Business Agent、Business Agent Adapter、Agent Runtime Host、UI Compiler Service、Model Adapter、A2UI Renderer 和 Action 回传的完整开发验证环境。

建设完成后，开发人员应能够：

1. 一条命令启动完整环境；
2. 从 Web 输入业务请求；
3. 调用简易 LangGraph Business Agent；
4. 获取 Markdown 或结构化业务数据；
5. 调用 UI Compiler Service；
6. 使用 Fixture 或真实模型生成 UI Plan Candidate；
7. 由 UI Compiler Core 编译 A2UI；
8. 在 Vue 浏览器中受控渲染；
9. 点击生成界面中的 Action；
10. 将 Action 回传并恢复 LangGraph；
11. 查看新的业务结果与界面；
12. 通过自动化 E2E 重复验证完整链路。

---

## 4. 环境定位

本 Goal 交付的是：

```text
Generative UI Platform Full-Chain Development Validation Environment
```

中文名称：

```text
生成式 UI 平台全链路开发验证环境
```

它的定位包括：

- 平台开发环境；
- 模块集成联调环境；
- Business Agent 接入验证环境；
- UI Compiler 多模型测试环境；
- A2UI Renderer 开发环境；
- Action 回传验证环境；
- 自动化回归环境；
- 架构能力演示环境；
- 测试环境发布基础。

它不是：

- 独立业务产品；
- 正式生产系统；
- 企业级业务应用；
- 商业化演示站；
- 最终用户产品。

---

## 5. 使用对象

## 5.1 平台开发人员

需要解决：

- 模块只能单独测试；
- 缺少完整链路；
- 缺少统一启动方式；
- 改动后无法快速验证整体影响；
- 缺少链路诊断。

## 5.2 Business Agent 开发人员

需要解决：

- 不清楚接入契约；
- 不希望理解 UI Plan、A2UI 或前端组件；
- 无法看到业务输出最终如何展示；
- 不同 Agent 接入方式不统一。

## 5.3 UI Compiler 开发人员

需要解决：

- 缺少真实 Business Agent 输出样本；
- 缺少多模型 Provider 验证；
- 缺少从 UI Plan Candidate 到浏览器的完整回归；
- 缺少错误、降级和安全验证环境。

## 5.4 前端与智能交互开发人员

需要解决：

- 缺少稳定 A2UI 输入源；
- 缺少 Component Registry 验证；
- 缺少 Action 回传闭环；
- 难以区分 Renderer、Runtime 和 Compiler 问题。

## 5.5 测试和架构评审人员

需要解决：

- 无法重复验证整个平台；
- 只能看到模块，无法验证架构闭环；
- 缺少可演示的真实集成链路；
- 缺少明确验收标准。

---

## 6. 需要解决的工程问题

当前环境需要解决：

1. Business Agent 尚未接入；
2. 缺少简易 LangGraph Business Agent MVP；
3. 缺少 Business Agent Adapter；
4. Runtime Host 尚未完成业务 Agent 与 UI Compiler 的编排；
5. UI Compiler Service 的 Model Adapter 尚未完成真实模型接入验证；
6. Web 尚未接入 UI Compiler 返回结果；
7. 缺少标准 Vue A2UI Renderer；
8. 缺少 Component Registry 和受控渲染；
9. 缺少用户 Action 回传；
10. 缺少 LangGraph 暂停和恢复；
11. 缺少完整 HTTP / WebSocket E2E；
12. 缺少一键启动和环境检查；
13. 缺少跨服务诊断与可观测性；
14. 当前静态 Demo 不适合作为长期联调环境。

---

## 7. 正确架构

```text
┌──────────────────────────────┐
│ Vue Web Workbench            │
│                              │
│ - Input / Chat               │
│ - Markdown Renderer          │
│ - A2UI Renderer              │
│ - Component Registry         │
│ - Diagnostics                │
└──────────────┬───────────────┘
               │
               │ HTTP / WebSocket
               ▼
┌──────────────────────────────┐
│ Agent Runtime Host           │
│                              │
│ - Transport                  │
│ - Run Orchestrator           │
│ - Action Orchestrator        │
│ - Business Agent Adapter     │
│ - UI Compiler Client         │
│ - Surface Context            │
└───────┬────────────────┬─────┘
        │                │
        │                │ PresentationRequest
        │                ▼
        │       ┌──────────────────────────────┐
        │       │ UI Compiler Service          │
        │       │                              │
        │       │ - Input Sanitization         │
        │       │ - Presentation Decision      │
        │       │ - Model Adapter              │
        │       │ - UI Plan Candidate          │
        │       │ - Validation / Policy        │
        │       │ - UI Compiler Core           │
        │       │ - A2UI                       │
        │       └──────────────────────────────┘
        │
        │ Business Agent Contract
        ▼
┌──────────────────────────────┐
│ LangGraph Business Agent MVP │
│                              │
│ - Business State             │
│ - Business Tools             │
│ - Task Draft                 │
│ - Confirmation / Resume      │
│ - AgentContent Output        │
└──────────────────────────────┘
```

---

## 8. 架构边界

## 8.1 Web 只连接 Runtime Host

允许：

```text
Web → Runtime Host
```

禁止：

```text
Web → Business Agent
Web → UI Compiler Service
Web → Model Provider
```

## 8.2 Business Agent 只处理业务

Business Agent 可以：

- 理解业务请求；
- 调用业务工具；
- 查询业务数据；
- 生成任务草稿；
- 管理业务状态；
- 暂停和恢复流程；
- 输出 Markdown 或结构化数据。

Business Agent 不可以：

- 输出 UI Plan Candidate；
- 输出 A2UI；
- 选择前端组件；
- 生成 HTML、Vue 或任意前端代码；
- 使用 UI Compiler Model Adapter；
- 决定最终界面结构。

Business Agent 输出：

```ts
type AgentContent =
  | {
      contentType: "markdown";
      markdown: string;
    }
  | {
      contentType: "structured-data";
      data: unknown;
      fallbackMarkdown?: string;
    };
```

## 8.3 Model Adapter 位于 UI Compiler Service

正确链路：

```text
AgentContent
+ Presentation Intent
+ Component Catalog Context
+ Policy Context
→ UI Compiler Model Adapter
→ UI Plan Candidate
```

Model Adapter 的用途是：

> 处理 Business Agent 输出的内容，为 UI Compiler 生成不可信的 UI Plan Candidate。

Model Adapter 不负责：

- Business Agent 业务推理；
- Business Agent 工具调用；
- 业务任务状态；
- Action 执行；
- 直接生成可信 A2UI。

## 8.4 UI Compiler Core 是唯一 A2UI 生产者

禁止：

```text
Business Agent → A2UI
Runtime Host → A2UI
Model Provider → 可信 A2UI
Web → 自行拼装 A2UI
```

允许：

```text
UI Plan Candidate
→ Validation
→ UI Compiler Core
→ A2UI
```

## 8.5 UI Plan Candidate 不可信

必须经过：

- Schema 校验；
- Component Catalog 校验；
- Props 校验；
- Action 校验；
- 数据绑定校验；
- Policy 校验；
- 降级策略；
- 确定性编译。

---

## 9. Model Adapter 验证范围

执行前必须先审计 UI Compiler Service 已有 Model Adapter：

- 当前接口；
- 测试实现；
- Prompt；
- UI Plan Candidate Schema；
- Structured Output；
- Timeout；
- Retry；
- AbortSignal；
- 错误映射；
- 日志与诊断。

优先扩展现有实现，不创建平行体系。

需要支持配置：

```text
fixture
Kimi
豆包
GLM
通义千问
```

模型名称、Base URL、Endpoint ID 和 API Key 必须配置化。

建议配置：

```bash
UI_COMPILER_MODEL_PROVIDER=fixture
UI_COMPILER_MODEL_NAME=
UI_COMPILER_MODEL_BASE_URL=
UI_COMPILER_MODEL_API_KEY=
UI_COMPILER_MODEL_TIMEOUT_MS=60000
UI_COMPILER_MODEL_MAX_RETRIES=1
```

默认开发和 CI：

```bash
UI_COMPILER_MODEL_PROVIDER=fixture
```

默认 Fixture 必须：

- 无 API Key；
- 无调用费用；
- 输出确定性 UI Plan Candidate；
- 支持模拟超时；
- 支持模拟限流；
- 支持模拟非法 Schema；
- 支持模拟降级。

真实模型只验证：

- AgentContent 能否转换为有效 UI Plan Candidate；
- 是否遵守 Component Catalog；
- 是否满足结构化 Schema；
- 是否正确处理错误和降级；
- 最终 A2UI 是否可渲染。

---

## 10. 参考验证场景

开发环境使用：

```text
智能安防空地多智能体巡逻
```

作为参考领域。

平台核心仍保持业务无关。

## 场景一：查询设备状态

```text
用户输入
→ Business Agent 查询 Fixture 设备
→ 输出结构化设备数据
→ UI Compiler 生成 UI Plan Candidate
→ UI Compiler Core 编译 Card / Badge / List
→ Web 渲染
```

## 场景二：生成巡逻计划

```text
用户输入
→ Business Agent 生成任务草稿
→ 输出步骤、设备、时间、风险和待确认状态
→ UI Compiler 编译 Timeline / Card / Button
→ Web 渲染确认界面
```

## 场景三：确认任务

```text
用户点击确认
→ Web Action Event
→ Runtime Host 校验
→ Business Agent Adapter
→ LangGraph Resume
→ 业务状态变更
→ 新 AgentContent
→ UI Compiler 再编译
→ Web 更新
```

---

## 11. 子任务

## TASK-001：平台集成契约

目标：

建立 Business Agent、Runtime Host、UI Compiler 和 Web 之间的公共契约。

工作项：

- 定义 Business Agent Run Request / Result；
- 定义 Action Request / Result；
- 复用 AgentContent；
- 复用 PresentationRequest / PresentationResult；
- 定义 Runtime 消息；
- 定义统一错误；
- 提供运行时 Schema 校验；
- 删除重复消息类型。

验收：

- 公共契约可独立构建；
- 非法消息稳定拒绝；
- Business Agent Contract 不包含 UI Plan Candidate；
- Business Agent Contract 不包含 A2UI；
- Runtime Result 可携带 PresentationResult。

---

## TASK-002：TypeScript LangGraph Business Agent MVP

目标：

建立一个用于链路验证的确定性简易 Business Agent。

工作项：

- 创建 `apps/business-agent-langgraph`；
- 使用 TypeScript LangGraph；
- 实现 `/health`；
- 实现 Run API；
- 实现 Action Resume API；
- 实现内存 Checkpoint；
- 实现设备状态 Fixture；
- 实现巡逻计划 Fixture；
- 实现任务确认；
- 输出 AgentContent；
- 增加测试。

约束：

- 不使用 UI Compiler Model Adapter；
- 不输出 UI Plan Candidate；
- 不输出 A2UI；
- 默认不需要模型 API Key。

验收：

- 三个参考场景通过；
- 支持暂停和恢复；
- 输出满足契约；
- 无 API Key 可运行。

---

## TASK-003：Business Agent Adapter

目标：

Runtime Host 通过统一接口调用 LangGraph Business Agent。

工作项：

- 定义 `BusinessAgentAdapter`；
- 实现 LangGraph HTTP Adapter；
- 保留 Mock Adapter；
- 支持 Run；
- 支持 Resume Action；
- 支持 Timeout；
- 支持 AbortSignal；
- 支持 Schema 校验；
- 支持错误归一化；
- 透传 requestId、threadId、runId；
- 增加 Contract Test。

验收：

- Runtime Host 不直接依赖 LangGraph SDK；
- Agent 实现可替换；
- Adapter 不处理 UI；
- 故障返回稳定错误。

---

## TASK-004：UI Compiler Model Adapter 多模型接入

目标：

扩展 UI Compiler Service 已有 Model Adapter，把 Business Agent 输出转换为 UI Plan Candidate。

工作项：

- 审计现有 Model Adapter；
- 优先扩展现有接口；
- 完善 Fixture Model Adapter；
- 实现或完善 OpenAI-compatible 基础适配；
- 接入 Kimi 配置；
- 接入豆包配置；
- 接入 GLM 配置；
- 接入通义千问配置；
- 支持 Provider Registry；
- 支持 Timeout、Abort 和有限 Retry；
- 统一错误；
- 统一 Usage 和安全诊断；
- 强制 UI Plan Candidate Schema；
- 增加 Provider Contract Test；
- 增加真实 Provider Smoke Test。

输入：

```text
Sanitized AgentContent
Presentation Intent
Catalog Context
Policy Context
```

输出：

```text
UI Plan Candidate
```

禁止：

- 用于 Business Agent 业务推理；
- 处理业务工具；
- 直接生成可信 A2UI；
- 输出 HTML、Vue 或任意代码。

验收：

- Fixture 确定性通过；
- 至少一个真实 Provider Smoke 通过；
- Kimi、豆包、GLM、通义千问均可配置；
- 更换 Provider 不修改 UI Compiler Core；
- 所有模型结果通过 UI Plan Candidate Schema；
- API Key 不进入浏览器和日志。

---

## TASK-005：Runtime Host 平台编排

目标：

串联 Business Agent 与 UI Compiler。

工作项：

- 实现 RunOrchestrator；
- 实现 ActionOrchestrator；
- 实现 UICompilerClient；
- 实现 SurfaceContextStore；
- 实现 DependencyHealthService；
- 提供 `/api/runs`；
- 提供 `/api/actions`；
- 提供 `/health/dependencies`；
- 提供 `/ws/runs`。

Run 流程：

```text
用户请求
→ Business Agent Adapter
→ AgentContent
→ PresentationRequest
→ UI Compiler Service
→ PresentationResult
→ Web
```

验收：

- HTTP / WebSocket 共用应用层；
- Runtime Host 不生成 A2UI；
- Runtime Host 不直接调用模型；
- Compiler 失败支持安全降级；
- 链路 ID 贯穿所有服务。

---

## TASK-006：Web Workbench 工程化

目标：

将静态 Demo 升级为长期可用的 Vue 开发工作台。

工作项：

- 创建 `apps/web-workbench`；
- 使用 Vue 3 + Vite + TypeScript；
- 移除公共 CDN；
- 实现 HTTP Transport；
- 实现 WebSocket Transport；
- 实现 Markdown Renderer；
- 实现 PresentationResult Viewer；
- 实现 A2UI Raw Viewer；
- 实现场景快捷输入；
- 实现环境和版本 Banner；
- 实现诊断面板；
- 输出可部署静态构建。

验收：

- Web 只访问 Runtime Host；
- 不硬编码 localhost；
- HTTP / WebSocket 可切换；
- 页面刷新正常；
- 可用于开发、联调和演示；
- 构建产物可发布。

---

## TASK-007：Vue A2UI Renderer

目标：

在浏览器安全渲染 UI Compiler 输出。

工作项：

- Operation Reducer；
- Surface Store；
- Data Model；
- JSON Pointer；
- Component Registry；
- 递归渲染；
- Props 校验；
- 未注册组件降级；
- 非法 Operation 拒绝；
- Action Event；
- Surface 更新和销毁。

首批组件：

```text
Card
Text
Badge
Column
Row
List
Table
Button
Timeline
```

验收：

- 只渲染注册组件；
- 不执行任意 HTML / JavaScript；
- 数据绑定正确；
- 非法 A2UI 被拒绝；
- Button 产生结构化 Action Event。

---

## TASK-008：Action 回传闭环

目标：

完成浏览器用户操作到 Business Agent 状态恢复的闭环。

流程：

```text
A2UI Action
→ Web
→ Runtime Host
→ Action 校验
→ Business Agent Adapter
→ LangGraph Resume
→ 新 AgentContent
→ UI Compiler
→ 新 PresentationResult
→ Web 更新
```

安全要求：

- Action Payload 不可信；
- 校验 surfaceId、runId、actionId；
- 校验 Catalog Action；
- 不允许前端构造任意业务工具调用；
- destructive / requiresApproval 必须显式确认。

验收：

```text
生成巡逻计划
→ 渲染确认按钮
→ 点击确认
→ LangGraph 恢复
→ 业务状态变为 confirmed
→ 页面更新
```

---

## TASK-009：完整平台 E2E

目标：

通过真实进程和真实浏览器验证完整链路。

Playwright 覆盖：

1. 设备状态；
2. 巡逻计划；
3. 任务确认；
4. Markdown 路径；
5. A2UI 路径；
6. HTTP；
7. WebSocket；
8. Business Agent 不可用；
9. UI Compiler 不可用；
10. Model Adapter 超时；
11. Model Adapter 非法 UI Plan Candidate；
12. 非法 A2UI；
13. 非法 Action；
14. 安全降级。

真实模型 Smoke 只断言：

- UI Plan Candidate Schema；
- Catalog 约束；
- Compiler 成功或正确降级；
- A2UI 可渲染；
- 不断言固定自然语言。

验收：

- Fixture 全链路在 CI 稳定通过；
- 至少一个真实 UI Compiler Model Provider Smoke 通过；
- 测试进程正确清理；
- 错误有明确诊断。

---

## TASK-010：一键开发环境

目标：

让新开发人员快速安装、启动、构建和验证。

根命令：

```bash
pnpm dev:platform
pnpm build:platform
pnpm test:e2e:platform
pnpm verify:platform
```

默认端口：

```text
Web Workbench       :5173
Runtime Host        :8200
Business Agent      :8300
UI Compiler         :3000
```

环境检查脚本：

```text
scripts/check-platform-environment.mjs
```

检查：

- Node；
- pnpm；
- 环境变量；
- 端口占用；
- 四个服务；
- Runtime 到 Agent；
- Runtime 到 Compiler；
- UI Compiler Model Provider；
- Component Catalog；
- Web Runtime 地址。

验收：

- 全新克隆后冻结安装成功；
- 默认 Fixture 无 API Key 可运行；
- 一个命令启动四个服务；
- 依赖健康状态可见。

---

## TASK-011：诊断与可观测性

目标：

快速定位 Business Agent、Runtime、Model Adapter、Compiler、Renderer 和 Action 问题。

字段：

```text
requestId
threadId
runId
agentId
presentationRequestId
modelProvider
modelName
modelLatencyMs
modelUsage
uiPlanValidationStatus
compilerLatencyMs
presentationMode
surfaceId
actionId
normalizedErrorCode
```

Workbench 诊断面板显示：

- 用户请求；
- Business Agent Result；
- AgentContent；
- PresentationRequest；
- Model Adapter 安全摘要；
- UI Plan Candidate 校验状态；
- PresentationResult；
- A2UI Operations；
- Action Event；
- 阶段耗时；
- 错误与降级。

禁止记录：

- API Key；
- Authorization；
- 模型隐藏推理；
- 未脱敏敏感数据；
- 不必要的完整 Prompt。

验收：

- 一次请求可通过 requestId 查看完整安全链路；
- UI Plan 校验和降级原因可见；
- 日志不泄露敏感信息。

---

## TASK-012：文档与演示

目标：

形成可交接、可接入、可评审的开发环境文档。

文档包括：

- 所属平台项目背景；
- 当前环境建设背景；
- 环境定位；
- 架构边界；
- Business Agent 接入；
- Business Agent Adapter；
- UI Compiler Model Adapter；
- Provider 配置；
- Component Catalog；
- A2UI Renderer；
- Action 安全；
- 一键启动；
- E2E；
- 故障排查。

演示流程：

```text
1. 查询设备状态
2. Business Agent 返回结构化数据
3. UI Compiler Model Adapter 生成 UI Plan Candidate
4. UI Compiler Core 编译 A2UI
5. Web 渲染
6. 生成巡逻计划
7. 点击确认
8. Business Agent 恢复并更新状态
9. 切换 HTTP / WebSocket
10. 切换 Fixture / 真实 UI Compiler 模型
11. 查看诊断面板
```

验收：

- 新开发人员可按文档启动环境；
- 评审人员可完成完整链路演示；
- 文档明确验证环境不是独立产品；
- 文档明确 Model Adapter 位于 UI Compiler Service。

---

## 12. 推荐执行顺序

```text
TASK-001 平台契约
├── TASK-002 LangGraph Business Agent
└── TASK-004 UI Compiler Model Adapter
      ↓
TASK-003 Business Agent Adapter
      ↓
TASK-005 Runtime 编排
├── TASK-006 Web Workbench
└── TASK-011 诊断基础
      ↓
TASK-007 A2UI Renderer
      ↓
TASK-008 Action 闭环
      ↓
TASK-009 完整 E2E
      ↓
TASK-010 一键环境
      ↓
TASK-012 文档与演示
```

可并行：

```text
TASK-002 与 TASK-004
TASK-003 与 TASK-006
TASK-007 与 TASK-011
```

---

## 13. Definition of Done

- [ ] 全新克隆后冻结锁文件安装成功；
- [ ] 一条命令启动四个服务；
- [ ] Business Agent 使用 TypeScript LangGraph；
- [ ] Business Agent 不输出 UI Plan Candidate；
- [ ] Business Agent 不输出 A2UI；
- [ ] Business Agent Adapter 可替换；
- [ ] Model Adapter 位于 UI Compiler Service；
- [ ] Model Adapter 处理 Business Agent 输出；
- [ ] Model Adapter 输出 UI Plan Candidate；
- [ ] 支持 Fixture；
- [ ] 支持配置 Kimi；
- [ ] 支持配置豆包；
- [ ] 支持配置 GLM；
- [ ] 支持配置通义千问；
- [ ] 至少一个真实 Provider Smoke 通过；
- [ ] UI Plan Candidate 必须校验；
- [ ] UI Compiler Core 是唯一 A2UI 生产者；
- [ ] Web 只连接 Runtime Host；
- [ ] Markdown 可渲染；
- [ ] A2UI 可渲染；
- [ ] Action 可回传；
- [ ] LangGraph 可恢复；
- [ ] HTTP 全链路通过；
- [ ] WebSocket 全链路通过；
- [ ] Fixture Playwright E2E 通过；
- [ ] Model Adapter 错误可诊断和降级；
- [ ] API Key 不进入浏览器和日志；
- [ ] Web 可部署为测试与演示环境；
- [ ] 文档完整。

---

## 14. 非目标

- 将当前验证环境包装成独立产品；
- Business Agent 多模型平台化；
- Business Agent 与 UI Compiler 共用 Model Adapter；
- 多 Business Agent 路由；
- 多 Agent 自主协作；
- 真实设备控制；
- 生产数据库；
- 权限、计费；
- 长期持久化；
- Token Streaming；
- 任意代码生成；
- 完整 A2UI 全规范；
- 正式业务产品。

---

## 15. 最终验收链路

```text
用户输入
→ Web Workbench
→ Runtime Host
→ Business Agent Adapter
→ LangGraph Business Agent
→ Markdown / Structured Data
→ UI Compiler Service
→ Model Adapter
→ UI Plan Candidate
→ Validation
→ UI Compiler Core
→ A2UI
→ Vue Renderer
→ 用户 Action
→ Runtime Host
→ LangGraph Resume
→ 新业务内容
→ 再次编译与更新
```

Fixture 模式和至少一个真实 UI Compiler 模型供应商模式均通过时，本 Goal 验收完成。
