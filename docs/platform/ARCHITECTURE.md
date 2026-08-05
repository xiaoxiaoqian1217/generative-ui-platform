# Generative UI Platform 平台级架构

本文描述整个仓库的跨子系统关系。
Compiler 内部架构继续以 `docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 为准。

## 1. 平台链路

```text
Generative UI Workbench
        │
        │ AG-UI
        ▼
Agent Runtime Host
├── Embedded CopilotKit Runtime
├── PlatformRunService
├── Business Agent Adapter ──> Business Agent
│                              ├── 公开消息 / 活动 / 工具调用 / 状态 / Interrupt
│                              └── 最终 AgentContent
├── Embedded Presentation Pipeline
│   ├── Markdown AgentContent
│   │     └── Markdown PresentationResult
│   └── Structured AgentContent
│         └── Presentation Router / Model Adapter
│               └── UI Plan Candidate
│                     └── UI Compiler Core
│                           └── UI IR / A2UI PresentationResult
├── Platform Runtime Event Bus
│   ├── AG-UI Projection ──> Workbench
│   └── Diagnostic Projection ──> Diagnostic Recorder
└── Debug Conversation / Artifact Query API
        │
        ▼
Frontend Runtime
├── Conversation Surface
├── Markdown Renderer
├── A2UI Renderer
├── Component Registry
└── Frontend Action Registry
        │
        └── Action / Confirm / Resume ──> Agent Runtime Host
```

## 2. 子系统职责

### 2.1 Generative UI Workbench

- 是 Frontend Runtime 参考实现，只连接 Agent Runtime Host；
- 使用 AG-UI 参与 Agent 交互；
- 展示 Business Agent 主动公开的消息、工具调用、状态、进度和 Interrupt；
- 渲染 Markdown 或 A2UI PresentationResult；
- 展示 Debug Conversation、逐 Turn Inspect 和 Diagnostic Artifact；
- 执行已注册的前端 Action，并将结果回传 Runtime Host；
- 不拥有 Business Agent 私有工作流状态，不生成 UI Plan 或 A2UI。

### 2.2 Agent Runtime Host

- 是平台前端统一入口和 CopilotKit Runtime 宿主应用；
- 通过 PlatformRunService 协调 Agent 调用、最终展示、Action 和 Resume；
- 将公开运行事件规范化为 PlatformRuntimeEvent；
- 同时向 AG-UI 实时流和 Diagnostic Recorder 投影同一事件；
- 在进程内组装 Presentation Pipeline；
- 提供 Catalog、Scenarios、Health、Debug Conversation、Turn Details、Artifact 和 Diagnostic Bundle 等普通 REST 查询能力；
- 不保存或复制 Business Agent 私有 Checkpoint。

### 2.3 CopilotKit Runtime

- 嵌入 Agent Runtime Host，不是并列部署的第二个 Runtime；
- 提供 AG-UI 入口和标准运行时能力；
- 通过自定义 Agent Adapter 调用 PlatformRunService；
- 不直接注册 Business Agent，避免绕过 Presentation Pipeline。

### 2.4 PlatformRunService

- 是统一应用级执行服务；
- 调用 Business Agent Adapter；
- 转发 Business Agent 公开过程事件；
- 将最终 AgentContent 交给 Presentation Pipeline；
- 协调 Action、确认和恢复；
- 产生或转发 PlatformRuntimeEvent；
- 不按 HTTP、WebSocket 或 AG-UI 分裂为多套业务编排。

### 2.5 Business Agent Adapter

- 隔离 Runtime Host 与具体 Business Agent 协议；
- 校验公共事件契约；
- 补充 threadId、runId、turnId、eventId、sequence、toolCallId 等关联标识；
- 将 Agent 私有协议事件映射为 PlatformRuntimeEvent；
- 不总结、改写、重新解释业务内容；
- 不负责诊断持久化。

### 2.6 Business Agent

- 负责业务推理、后端工具、权威业务状态和工作流恢复；
- 可以主动发布消息、活动、进度、状态、公开工具调用与结果、Interrupt 和最终 AgentContent；
- 对公开内容和可见范围负责；
- 不输出 UI Plan Candidate、A2UI 或前端组件选择结果；
- 私有 State、Checkpoint、系统提示词和未公开内部事件不进入平台诊断。

### 2.7 Presentation Pipeline

- 只处理最终 AgentContent，不处理所有过程事件；
- Markdown AgentContent 直接形成 Markdown PresentationResult；
- Structured AgentContent 进入 Presentation Router；
- 仅 Generative UI 分支调用 Presentation Model 和 UI Compiler Core；
- 不改写 Business Agent 已返回的 Markdown。

### 2.8 UI Compiler Core

- 校验 UI Plan Candidate 和 Component Catalog；
- 构建可信 UI IR；
- 编译 A2UI；
- 是唯一可信 A2UI 生产者；
- 保持框架、传输、Agent 框架和模型供应商中立。

### 2.9 Frontend Runtime

- 消费 PresentationResult；
- 维护 Component Registry 和 Frontend Action Registry；
- 渲染 Markdown 和 A2UI；
- 产生 Renderer 与 Action 诊断；
- 浏览器端只允许追加受控 Renderer/Action 结果，不得覆盖后端阶段诊断。

## 3. 协议与传输边界

### 3.1 Agent 交互

Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 交互协议。
当前参考实现采用 CopilotKit Runtime 的 HTTP POST + SSE 路径。

HTTP、SSE 和 WebSocket 是传输机制：

- HTTP POST + SSE：当前 Workbench 参考实现；
- AG-UI over WebSocket：可以由特定应用自定义实现；
- 业务设备实时 WebSocket：可以独立存在；
- 不得基于 HTTP 或 WebSocket 再维护一套独立 Agent 业务协议。

### 3.2 普通查询接口

以下能力使用普通 REST，不构成第二套 Agent 交互协议：

- Catalog；
- Scenarios；
- Settings；
- Health；
- Debug Conversation 列表与详情；
- TurnDetailsResponse；
- Diagnostic Artifact 延迟、分页或流式读取；
- Diagnostic Bundle Export。

### 3.3 Business Agent 协议

Business Agent 不要求原生实现 AG-UI。
Business Agent Adapter 可以适配其既有 HTTP + SSE、WebSocket、进程内调用或其他私有协议，但这些协议不得暴露给 Workbench。

## 4. 运行事件架构

Runtime Host 内部使用统一 PlatformRuntimeEvent：

```text
Business Agent / Presentation Pipeline / UI Compiler / Renderer
                         │
                         ▼
               PlatformRuntimeEvent
                 ├── eventId
                 ├── sequence
                 ├── threadId / runId / turnId
                 ├── source / type / status
                 ├── visibility
                 ├── summary / metadata
                 └── artifactRef
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       AG-UI Projection      Diagnostic Projection
              │                     │
              ▼                     ▼
         Workbench Live       Diagnostic Recorder
```

同一次工具调用或阶段结果只产生一套平台事件事实，不分别生成互不关联的实时流水和历史流水。

AG-UI 已支持的消息、工具调用、状态、活动和 Interrupt 映射为标准事件。
Presentation Decision、Validation Result、UI IR 等平台专属诊断通过 AG-UI Custom Event 或 Activity 扩展传递给 Inspect。

## 5. 诊断持久化架构

### 5.1 权威数据

只持久化：

1. `DiagnosticEvent`：规范化完整事件流水；
2. `DiagnosticArtifact`：正式公开契约边界上的完整输入输出对象。

不持久化原始 SSE 文本、WebSocket Frame 或 CopilotKit 内部实例。
不单独持久化 TurnTrace。

Workbench 打开 Turn 时：

```text
DiagnosticEvent + Artifact Metadata
                │
                ▼
        Runtime Host Query Aggregation
                │
                ▼
        TurnDetailsResponse
```

`TurnDetailsResponse` 是临时 API 响应，不是数据库实体或第二份权威事实。

### 5.2 Diagnostic Recorder

Diagnostic Recorder 是 Agent Runtime Host 应用内的逻辑模块：

- 订阅 Diagnostic Projection；
- 幂等保存 Event；
- 保存或引用 Artifact；
- 记录 persistence-failed、skipped-by-protection-limit 等状态；
- 不阻塞 Agent 主链路；
- 不自动拆成 workspace package 或独立服务。

公共事件 Schema 和类型可以放入 `packages/runtime-contract`。

### 5.3 Artifact Storage Router

```text
Diagnostic Artifact
        │
        ▼
Artifact Storage Router
├── 小型/中型对象 ──> 诊断数据库内联存储
└── 大型对象       ──> 本地文件或对象存储
                         └── 数据库保存 storageRef / hash / size / status
```

Workbench 对大型 Artifact 使用延迟加载、节点按需展开、数组分页、文本分段或流式读取，避免浏览器和 Runtime Host 一次性加载完整对象。

### 5.4 实时与持久化解耦

```text
PlatformRuntimeEvent
├── 立即 AG-UI Projection → Workbench
└── 异步 Diagnostic Projection → Recorder
```

实时展示不等待诊断持久化。
Artifact 原则上先保存，再保存引用它的 Event；Artifact 保存失败时仍记录事件和失败元数据。
Event 使用固定 eventId 幂等重试，不引入分布式事务。
孤立且长期未被引用的 Artifact 可以由清理机制回收。

任何诊断持久化失败不得导致业务 Turn 失败。

## 6. 事件可靠性

- 每个事件具有唯一 eventId；
- 同一 Turn 内 sequence 单调递增；
- 采用至少一次投递和幂等写入；
- Diagnostic Recorder 按 eventId 去重；
- Workbench 按 sequence 还原时间线；
- 发现 sequence 缺口时明确标记诊断可能不完整；
- 实时连接恢复后可以根据 lastSequence 从历史补齐事件；
- 不建设复杂的 Exactly Once 机制。

## 7. Debug Conversation 与 Agent Checkpoint

```text
Debug Conversation Store               Business Agent Checkpoint Store
├── 公开会话元数据                      ├── 私有工作流状态
├── Diagnostic Events                  ├── 节点状态
├── Diagnostic Artifacts               └── Agent 恢复信息
└── Presentation / Renderer 诊断
                 \                    /
                  \── shared threadId
```

两者通过 threadId 关联，但保持独立数据所有权。
删除、加载或导出 Debug Conversation 不得直接暴露 Business Agent 私有 Checkpoint。

## 8. 数据披露边界

完整诊断指正式公开契约边界上的完整可序列化输入输出，不指进程内全部数据。

可以进入平台诊断的典型对象：

- Business Agent 主动公开的 Tool Call 和 Tool Result；
- AgentContent；
- Presentation Request 和 Presentation Decision；
- UI Plan Candidate；
- Validation Result；
- UI IR；
- A2UI；
- PresentationResult；
- Renderer 和 Action 结果；
- 阶段错误、耗时和关联信息。

永不进入浏览器或平台诊断历史：

- 密钥、Token、密码、Cookie、设备控制凭据；
- 环境变量、数据库连接信息；
- 系统提示词；
- Provider 原始请求和响应；
- Business Agent 私有 State 和 Checkpoint；
- 未主动公开的内部工具调用；
- 模块局部变量、运行时实例和内存转储。

## 9. 默认开发拓扑

```text
Workbench              5173
Agent Runtime Host     8200
Reference Agent        8300
```

CopilotKit Runtime 与 Diagnostic Recorder 默认位于 Agent Runtime Host 进程内，不新增独立端口。

## 10. 安全与控制原则

- 模型输出和 UI Plan Candidate 均不可信；
- 不执行模型生成代码；
- Component Registry 只暴露允许组件；
- Action Payload 视为不可信输入；
- 高风险 Action 必须由 Runtime Host 校验确认；
- 敏感配置和私有 Agent 状态不得进入浏览器或平台诊断；
- 当前不实现 Debug Conversation 的细粒度用户权限，访问边界由部署环境负责。

## 11. 当前导出与未来范围

当前只提供 Diagnostic Bundle Export，用于导出所选 Conversation/Turn 的公开事件、Artifact、错误、耗时和版本信息。

以下仍属于未来范围：

- Interaction Gateway；
- 多 Business Agent 自动路由；
- 多 Agent 协作；
- 完整 Case Definition、导入、重跑、语义断言和回归测试管理；
- 多租户诊断权限和审计；
- 独立 Diagnostic Service；
- PostgreSQL + 对象存储的多实例生产拓扑。
