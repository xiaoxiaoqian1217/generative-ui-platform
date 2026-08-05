# Generative UI Workbench 软件需求规格说明书

**文档版本：** 0.3  
**项目阶段：** MVP 规划  
**所属项目：** Generative UI Platform  
**产品名称：** Generative UI Workbench  
**中文名称：** 生成式 UI 开发与诊断工作台  
**首个参考领域：** 智慧安防  
**首个参考场景：** 空地多智能体协同巡防指挥  
**目标读者：** 产品负责人、架构师、平台开发者、Business Agent 开发者、前端组件开发者、测试人员和编码 Agent

---

## 1. 文档约定

本文使用以下约束词：

- **必须（MUST）**：不可省略的强制要求；
- **应该（SHOULD）**：原则上应实现，除非存在明确且记录在案的原因；
- **可以（MAY）**：可选能力，不属于当前阶段强制范围；
- **禁止（MUST NOT）**：不得实现或不得形成该依赖关系。

需求编号约定：

| 前缀 | 含义 |
|---|---|
| BR | 业务需求 |
| UR | 用户需求 |
| FR | 功能需求 |
| IR | 外部接口需求 |
| DR | 数据与契约需求 |
| NFR | 非功能需求 |
| AC | 架构和实现约束 |
| AR | 验收需求 |

发生冲突时，优先级依次为：

1. 系统边界与职责；
2. 安全和控制边界；
3. 已接受的 Decision Issue；
4. 业务需求；
5. 功能需求；
6. 页面与目录结构建议。

---

## 2. 编写目的

本文档用于明确 Generative UI Workbench：

- 在 Generative UI Platform 中承担什么职责；
- 如何通过 AG-UI 与 Agent Runtime Host 交互；
- 如何展示 Business Agent 主动公开的过程事件和最终展示结果；
- 如何提供跨刷新、跨 Runtime Host 重启的 Debug Conversation；
- 如何查看逐 Turn 的阶段、工具调用、输入输出、错误与耗时；
- 如何处理大型 Diagnostic Artifact；
- 如何验证 Markdown、A2UI、Action 和人工确认闭环；
- MVP 达到什么条件才可以验收。

本文档是产品范围、系统架构、Runtime Host 接口、Frontend Runtime、场景包、测试和阶段验收的共同基线。
本文档不替代详细接口 Schema、数据库设计、页面视觉设计或 Compiler 内部设计。

---

## 3. 产品背景

### 3.1 业务背景

智慧安防、空地多智能体协同巡防指挥等 Agent 应用通常包含：

1. 用户以自然语言提出巡防或处置要求；
2. Business Agent 查询区域、设备和任务状态；
3. Business Agent 在运行过程中发布工具调用、进度、状态或确认请求；
4. Business Agent 生成一个或多个候选方案；
5. 平台以 Markdown 或受控生成式 UI 展示设备编组、路线、风险和执行约束；
6. 用户比较方案并作出选择；
7. 高风险操作经过人工确认；
8. Runtime Host 将 Action 或确认结果恢复给 Business Agent；
9. 页面持续展示执行状态、异常和处理结果。

复杂业务结果可能包含：

- 多个候选方案；
- 设备状态列表；
- 任务草稿；
- 风险提示；
- 地图区域和路线；
- 后端工具调用；
- 人工确认；
- 实时状态和异常信息。

固定聊天气泡或纯 Markdown 难以稳定承载复杂比较、操作和状态展示，但过程事件也不应全部进入 UI Compiler。

### 3.2 平台技术背景

Generative UI Platform 已形成：

- Agent Runtime Host；
- Business Agent Adapter；
- 可嵌入的 CopilotKit Runtime；
- AG-UI 交互入口；
- PlatformRunService；
- 可嵌入的 Presentation Pipeline；
- Presentation Router；
- UI Compiler Core；
- Presentation Request 和 PresentationResult；
- UI Plan Candidate；
- UI IR；
- A2UI 编译；
- Component Catalog；
- Markdown 安全处理；
- Schema 校验和降级机制；
- Debug Conversation 与 Business Agent Checkpoint 的 shared threadId；
- 诊断持久化扩展位置。

Workbench 需要把这些能力组成统一、可部署、可观察、可恢复历史的完整开发闭环。

### 3.3 当前问题

没有统一 Workbench 时，各角色通常通过临时页面、接口工具和分散日志分别验证能力，无法稳定回答：

- Runtime Host 是否正确适配了 Business Agent；
- Business Agent 公开了哪些消息、工具调用和状态；
- Agent 结果为什么被展示为 Markdown；
- UI Plan 为什么没有通过校验；
- 某个组件为什么没有被选择或渲染；
- 某个 Action 为什么不能执行；
- 用户确认是否真正阻止了高风险操作；
- 浏览器刷新或 Runtime Host 重启后是否还能恢复诊断历史；
- 某个大型 Tool Result、UI IR 或 A2UI 是否完整保存；
- 实时连接断开后是否丢失部分事件。

因此需要建设统一的开发与诊断工作台。

---

## 4. 产品定位

### 4.1 核心定位

Generative UI Workbench 定位为：

> Generative UI Platform 的官方 Frontend Runtime 参考实现，以及面向 Agent Runtime Host 的开发、联调、实时诊断和历史诊断工作台。

它同时是：

- Runtime Host 的统一 Web 客户端；
- AG-UI Agent 交互客户端；
- Markdown 和 A2UI 运行环境；
- Component Catalog 和 Frontend Action 验证环境；
- Debug Conversation 和逐 Turn Inspect 入口；
- 智慧安防参考场景运行环境。

它不是：

- Business Agent；
- Agent Runtime Host；
- UI Compiler；
- Agent 路由网关；
- 正式智慧安防生产系统；
- 通用低代码平台；
- 完整案例管理、自动断言和回归测试平台；
- 面向公众的营销门户。

### 4.2 产品方案

产品采用：

> **通用 Workbench 核心 + 智慧安防场景包 + 空地多智能体巡防指挥参考实现。**

其中：

- 通用 Workbench 核心负责 AG-UI 交互、会话、渲染、诊断、Catalog 和配置；
- 智慧安防场景包负责领域组件、前端 Action、示例输入和参考场景；
- Agent Runtime Host 负责 CopilotKit Runtime、PlatformRunService、Business Agent Adapter、Action 校验、Presentation Pipeline 和诊断查询；
- Business Agent 负责业务推理、后端工具、权威状态和私有工作流恢复；
- Presentation Pipeline 负责最终 AgentContent 的 Markdown 或 Generative UI 展示路径；
- UI Compiler Core 负责 UI Plan 校验、UI IR 和 A2UI 编译。

### 4.3 一句话价值

> 让生成式 UI 的完整链路可运行、过程可观察、历史可恢复、问题可定位，同时保持 Agent、Runtime、Compiler 和 Frontend 的职责边界。

---

## 5. 系统边界与职责

### 5.1 正式运行关系

```text
Generative UI Workbench
          │
          │ AG-UI（当前参考实现：HTTP POST + SSE）
          ▼
Agent Runtime Host
          ├── Embedded CopilotKit Runtime
          ├── PlatformRunService
          ├── Business Agent Adapter ──> Business Agent
          │                             ├── 公开过程事件
          │                             └── 最终 AgentContent
          ├── Embedded Presentation Pipeline
          │       ├── Markdown PresentationResult
          │       └── UI Plan → UI Compiler Core → A2UI PresentationResult
          ├── PlatformRuntimeEvent 双投影
          │       ├── AG-UI → Workbench
          │       └── Diagnostic Recorder → Event / Artifact
          └── Debug Conversation / Turn / Artifact REST Query
          ▼
Generative UI Workbench
          ├── Conversation Surface
          ├── Markdown Renderer
          ├── A2UI Renderer
          ├── Component Registry
          ├── Frontend Action Registry
          └── Inspect
```

### 5.2 Workbench 职责

Workbench 必须负责：

- 只连接 Agent Runtime Host；
- 使用 AG-UI 发送用户输入、接收实时事件、取消或继续运行；
- 展示 Business Agent 主动公开的消息、工具调用、进度、状态和 Interrupt；
- 渲染安全 Markdown；
- 渲染 A2UI；
- 维护 Component Registry；
- 维护 Frontend Action Registry；
- 展示人工确认界面；
- 执行已注册且通过校验的前端 Action；
- 将 Action、选择和 Renderer 结果回传 Runtime Host；
- 管理 Debug Conversation 的列表、创建、切换、重命名、归档和删除入口；
- 展示逐 Turn 时间线、阶段、工具调用、输入输出引用、错误和耗时；
- 按需加载、分页或流式查看大型 Artifact；
- 导出用户选择的 Diagnostic Bundle；
- 加载前端场景包；
- 独立构建和部署。

### 5.3 Workbench 非职责

Workbench 禁止承担：

- 直接连接 Business Agent；
- 实现 Business Agent Adapter；
- 适配 Business Agent 私有协议；
- 选择由哪个 Business Agent 处理请求；
- 编排 Agent Run；
- 管理或复制 Business Agent Checkpoint；
- 直接调用后端业务工具；
- 保存权威设备、任务或审批状态；
- 判断 Agent 业务结果是否正确；
- 生成 UI Plan；
- 将 UI Plan 编译为 A2UI；
- 执行模型生成的任意代码；
- 保存或展示 Provider 原始请求响应、系统提示词或 Agent 私有 State；
- 建设完整测试案例导入、重跑、断言和回归中心。

### 5.4 Agent Runtime Host 职责

Agent Runtime Host 必须负责：

- 嵌入 CopilotKit Runtime 并提供 AG-UI 入口；
- 通过 PlatformRunService 维护运行生命周期；
- 注册和调用 Business Agent Adapter；
- 接收并规范化 Business Agent 公开事件；
- 为事件补充 eventId、sequence、threadId、runId、turnId、toolCallId 等关联信息；
- 将过程事件投影为 AG-UI；
- 将最终 AgentContent 提交给 Presentation Pipeline；
- 校验 Action，并恢复 Business Agent；
- 产生和转发 PlatformRuntimeEvent；
- 提供 Debug Conversation、TurnDetailsResponse、Artifact 和 Diagnostic Bundle 查询；
- 接收受控 Renderer/Action 诊断；
- 保证诊断持久化失败不影响主业务执行。

### 5.5 Business Agent 与 Adapter 职责

Business Agent 负责：

- 业务推理；
- 后端业务工具；
- 权威业务状态；
- 私有工作流 State 和 Checkpoint；
- 主动公开业务消息、工具调用、状态、进度、Interrupt 和最终 AgentContent；
- 决定公开事件的业务内容和可见范围。

Business Agent Adapter 只负责：

- 公共契约校验；
- 关联标识补充；
- 私有协议事件到 PlatformRuntimeEvent 和 AG-UI 语义的映射；
- 非法事件拒绝。

Adapter 禁止总结、改写、重新解释或重新判断业务内容。

### 5.6 Presentation Pipeline 与 UI Compiler Core 职责

Presentation Pipeline：

- 只处理最终 AgentContent；
- 对 Markdown AgentContent 直接形成 Markdown PresentationResult；
- 对结构化 AgentContent 进行展示路由；
- 仅在 Generative UI 分支调用 Presentation Model 和 UI Compiler Core；
- 不处理 Business Agent 的全部过程事件；
- 不改写 Business Agent 返回的 Markdown。

UI Compiler Core：

- 校验 UI Plan Candidate 和 Component Catalog；
- 构建可信 UI IR；
- 编译 A2UI；
- 失败时返回安全降级结果；
- 不承担 Business Agent 路由、Run 编排和真实组件渲染。

---

## 6. 建设目标与非目标

### 6.1 MVP 核心目标

MVP 必须实现：

1. 可独立部署的 Web Workbench；
2. Workbench 与 Runtime Host 的 AG-UI 交互；
3. Business Agent 公开过程事件实时展示；
4. Markdown 和 A2UI 完整渲染；
5. 用户 Action 与确认结果回传；
6. 跨刷新、跨 Runtime Host 重启的 Debug Conversation；
7. 逐 Turn Inspect；
8. Diagnostic Event 和 Diagnostic Artifact 持久化；
9. 大型 Artifact 延迟、分页或流式查看；
10. Diagnostic Bundle Export；
11. 智慧安防参考场景；
12. 设备查询、方案比较和任务确认连续流程；
13. Workbench、Runtime Host、Business Agent、Compiler 和场景包职责边界。

### 6.2 当前非目标

MVP 不建设：

- 完整生产级智慧安防应用；
- 大规模真实设备控制；
- 多租户、计费、细粒度诊断权限和审计；
- 通用低代码页面设计器；
- 任意 HTML、CSS、JavaScript、Vue 或 React 代码生成；
- 完整模型管理和 Prompt 管理平台；
- 完整 Case Definition、导入、重跑、语义断言和回归测试平台；
- Provider 原始日志和 Agent 私有执行轨迹查看；
- 独立 Diagnostic Service；
- 面向公众的营销门户。

---

## 7. 业务需求

### BR-001 完整链路验证

系统必须提供统一环境，验证用户输入、AG-UI、Runtime Host、Business Agent、Presentation Pipeline、UI Compiler、Frontend Runtime 和 Action 回传形成完整闭环。

### BR-002 统一联调入口

系统必须为平台开发者和 Agent 开发者提供统一 Web 联调入口，避免为每个 Agent 重复建设测试页面。

### BR-003 实时可观察

系统必须实时展示 Business Agent 主动公开的消息、工具调用、状态、进度和 Interrupt，以及 Presentation、Compiler、Renderer 和 Action 的公开诊断。

### BR-004 历史可恢复

系统必须支持跨浏览器刷新和跨 Runtime Host 重启恢复多轮 Debug Conversation 和逐 Turn 诊断历史。

### BR-005 可定位

系统必须使用户能够判断失败阶段、字段路径、事件缺口、降级原因和诊断持久化状态。

### BR-006 完整 Artifact

正式公开契约边界上的诊断对象原则上必须完整保留，并通过适合其大小的存储和查看方式提供。

### BR-007 业务价值验证

系统必须通过巡防业务流程验证生成式 UI 对方案比较、地图协同、人工确认和状态展示的价值。

### BR-008 领域解耦

智慧安防能力必须通过场景包和领域组件扩展，不得写入通用 Workbench 或 UI Compiler Core。

### BR-009 可发布运行

Workbench 必须能够部署为稳定的开发、联调和诊断网站，而不是只能本地运行的一次性 Demo。

---

## 8. 用户需求

### UR-001 平台开发者查看链路

平台开发者必须能够在一个 Turn 中查看时间线、阶段、工具调用、输入输出引用、错误、耗时和降级原因。

### UR-002 Agent 开发者查看公开事件

Agent 开发者必须能够查看 Business Agent 主动公开的消息、工具调用参数与结果、状态、进度、Interrupt 和最终 AgentContent。

### UR-003 Agent 开发者验证展示结果

Agent 开发者必须能够判断最终 AgentContent 被展示为 Markdown 还是 Generative UI，以及展示决策和编译结果。

### UR-004 组件开发者验证 Catalog

组件开发者必须能够查看组件定义、Props Schema、Action Schema、示例数据和渲染预览。

### UR-005 历史问题复现

开发者必须能够打开历史 Conversation 和 Turn，查看当时已保存的事件与 Artifact，而不默认重新运行 Agent、Pipeline 或 Compiler。

### UR-006 大型对象查看

开发者必须能够延迟、分页、分段或流式查看大型 Tool Result、UI Plan、UI IR、A2UI 和错误详情，避免浏览器一次性加载完整对象。

### UR-007 诊断导出

开发者必须能够导出选定 Conversation 或 Turn 的 Diagnostic Bundle，用于问题分享和离线分析。

### UR-008 架构边界确认

架构人员必须能够确认 Workbench 未直接连接 Business Agent、未保存 Agent 私有 Checkpoint、未承担 UI 编译和后端工具职责。

### UR-009 参考场景验证

业务团队应该能够使用预设场景验证设备查询、巡防方案和任务确认的基本交互目标。

---

## 9. 主要使用场景

### 9.1 设备状态查询

用户输入：

```text
查看当前可用的无人机和无人车。
```

系统应展示：

- Agent 的查询活动和后端工具调用；
- 可用设备数量；
- 设备类型；
- 在线状态；
- 电量；
- 当前任务状态；
- 位置摘要；
- 最终 Markdown 或 Generative UI 结果。

该场景验证公开 Tool Call/Tool Result、结构化数据展示和 Artifact 查看。

### 9.2 巡防方案生成与比较

用户输入：

```text
使用一架无人机和两台无人车巡查 A 区域。
```

系统应展示：

- Agent 运行进度；
- 一个或多个候选方案；
- 设备编组；
- 巡防路线摘要；
- 预计时长；
- 风险与限制；
- 方案选择操作；
- Presentation Decision、UI Plan、Validation、UI IR 和 A2UI 诊断入口。

### 9.3 任务草稿确认

用户输入：

```text
采用方案二并创建巡防任务。
```

系统必须先展示任务草稿和人工确认界面。
用户确认后，Workbench 只将确认结果回传 Runtime Host。
Runtime Host 校验后恢复 Business Agent，由 Business Agent 或业务后端调用任务创建工具。

### 9.4 历史诊断恢复

开发者刷新浏览器或重启 Runtime Host 后，重新打开原 Debug Conversation。
系统必须从持久历史加载 Conversation、Turn、Diagnostic Event 和 Artifact 元数据，不重新执行原业务链路。

### 9.5 大型 Artifact 查看

某个工具返回大型设备列表或 GeoJSON，或 Compiler 产生大型 UI IR/A2UI。
Workbench 首先显示大小、哈希、状态、摘要和引用；用户展开后按需加载，数组分页或文本流式读取。

### 9.6 实时断线补偿

Workbench 在 Turn 运行过程中断线。
重新连接后系统根据最后收到的 sequence 补齐历史事件，再继续接收实时事件；发现 sequence 缺口时必须明确提示诊断可能不完整。

---

## 10. 功能需求

### FR-001 Runtime Host 连接

系统必须通过配置连接 Agent Runtime Host，不得要求浏览器配置 Business Agent 私有地址或密钥。

### FR-002 AG-UI 通信

Workbench 的 Agent 交互必须使用 AG-UI。
当前参考实现必须支持 CopilotKit Runtime 的 HTTP POST + SSE 路径。

HTTP、SSE 和 WebSocket 是传输机制，不得在 Workbench 内维护并列的自定义 Agent 业务协议。
普通 REST 可以用于非 Agent 交互查询。

### FR-003 用户输入与运行控制

系统必须支持：

- 输入并发送消息；
- 查看请求状态；
- 取消请求；
- 在允许时继续或恢复运行；
- 防止重复提交。

### FR-004 公开事件展示

系统必须展示 Business Agent 主动公开的：

- 文本消息；
- 活动和步骤；
- 进度与状态；
- 后端工具调用；
- 工具参数和公开结果；
- Interrupt 和确认；
- 业务 Artifact；
- 最终 AgentContent。

Workbench 不得自行总结或改写这些业务内容。

### FR-005 结果渲染

系统必须支持：

- 安全 Markdown；
- A2UI；
- Fallback Markdown；
- Error。

页面必须明确展示当前结果类型和是否发生降级。

### FR-006 Markdown 安全

Markdown 必须经过安全处理，禁止脚本、危险 HTML、未授权嵌入和危险链接协议。

### FR-007 A2UI 渲染

A2UI Renderer 必须：

- 只从 Component Registry 加载组件；
- 校验组件类型；
- 使用受控 Props；
- 不执行模型生成代码；
- 对未知组件提供明确错误或安全降级。

### FR-008 Component Registry

Workbench 必须维护前端组件类型到真实组件实现的映射。
智慧安防领域组件必须通过场景包注册，不得写入通用 Renderer 判断分支。

### FR-009 Frontend Action Registry

Workbench 必须维护允许的前端 Action。
每个 Action 至少定义名称、参数 Schema、风险级别、执行器、确认要求和执行结果 Schema。

### FR-010 Action 执行和回传

系统必须：

1. 校验 Action 名称；
2. 校验参数；
3. 检查风险和确认要求；
4. 执行已注册前端能力；
5. 记录受控执行结果；
6. 将结果回传 Runtime Host。

### FR-011 人工确认

涉及任务创建、设备控制或其他高风险行为时，Workbench 必须展示操作名称、目标对象、关键参数、影响范围、风险提示、确认和取消操作。
Runtime Host 不得在用户确认前恢复确认型 Action。

### FR-012 运行状态

Workbench 至少应支持：

- 等待发送；
- 已发送；
- Agent 运行中；
- 工具调用中；
- 展示决策中；
- UI 编译中；
- 渲染中；
- 等待用户确认；
- Action 执行中；
- 已完成；
- 已取消；
- 已失败；
- 已降级；
- 诊断持久化中；
- 诊断持久化失败；
- 事件可能不完整。

### FR-013 Debug Conversation

系统必须支持：

- Conversation 列表；
- 创建；
- 打开；
- 重命名；
- 归档；
- 删除；
- 多 Turn 历史；
- 跨刷新恢复；
- 跨 Runtime Host 重启恢复。

Debug Conversation 只保存平台公开事件和展示诊断，不复制 Business Agent 私有 Checkpoint。

### FR-014 Turn Inspect

系统必须提供单一逐 Turn 诊断入口，展示：

- Turn 状态、开始时间、完成时间和耗时；
- 按 sequence 排序的时间线；
- Business Agent、Presentation、Compiler、Renderer 和 Action 阶段；
- 工具调用与结果；
- 输入和输出 Artifact 引用；
- 错误、字段路径和降级原因；
- 事件缺口；
- Artifact 持久化状态。

Runtime Host 根据 Diagnostic Event 临时聚合 `TurnDetailsResponse`；Workbench 不要求存在持久化 TurnTrace。

### FR-015 Diagnostic Artifact 查看

系统必须支持查看正式公开契约边界上的完整 Artifact，包括：

- Tool Call 参数和 Tool Result；
- AgentContent；
- Presentation Request；
- Presentation Decision；
- UI Plan Candidate；
- Validation Result；
- UI IR；
- A2UI；
- PresentationResult；
- Renderer 和 Action 结果。

小中型 Artifact 可以直接加载；大型 Artifact 必须支持延迟、分页、分段或流式查看。

### FR-016 Renderer 诊断回传

Workbench 可以向 Runtime Host 追加受控 Renderer 和 Action 结果，例如 componentId、presentationId、errorCode 和 message。
浏览器不得覆盖 Business Agent、Presentation 或 Compiler 已保存的后端阶段诊断。

### FR-017 断线补偿

系统应记录 Workbench 最后接收的 sequence。
连接恢复后，可以请求该 sequence 之后的持久事件，再继续实时流。
发现 sequence 缺口时必须明确提示，不得静默伪装为完整历史。

### FR-018 Diagnostic Bundle Export

系统必须支持导出用户选择的 Conversation 或 Turn 的：

- 公开 Diagnostic Event；
- 所选 Diagnostic Artifact；
- 错误和耗时；
- 协议、Catalog、场景和构建版本信息。

导出包不得包含凭据、私有 Checkpoint、系统提示词、Provider 原始响应或未公开 Agent 内部事件。

### FR-019 Component Catalog

系统应提供组件名称、场景、版本、Props Schema、Action 定义、示例数据、渲染预览和可用状态。

### FR-020 场景包

Workbench 必须支持加载前端场景包。
场景包可以包含领域组件注册、前端 Action 注册、示例输入、受控示例数据和场景说明。
场景包不得包含 Business Agent Adapter 或后端工具实现。

### FR-021 环境配置

Workbench 必须支持开发、测试和发布环境配置，至少包括：

- Runtime Host 地址；
- 场景；
- 请求超时；
- 调试信息开关；
- Artifact 查看分页参数；
- 外部环境配置。

不得提供 HTTP/WebSocket 自定义 Agent 协议切换项。
敏感密钥不得进入浏览器构建产物。

### FR-022 可部署网站

Workbench 必须独立构建，支持 Nginx 或容器托管、外部环境配置和健康检查。

---

## 11. 页面与信息架构

```text
/workbench
├── /playground
├── /conversations
│   └── /:conversationId/turns/:turnId
├── /inspect/:turnId
├── /catalog
├── /scenarios
└── /settings
```

### 11.1 Playground

用于输入请求、查看公开过程事件和最终 Markdown 或 Generative UI。

### 11.2 Conversations

用于查看、创建、切换、重命名、归档和删除 Debug Conversation，以及打开历史 Turn。

### 11.3 Inspect

用于查看单个 Turn 的时间线、阶段、工具调用、输入输出、错误、耗时和 Artifact。

### 11.4 Catalog

用于查看和预览当前 Component Catalog。

### 11.5 Scenarios

用于查看通用场景和智慧安防场景包。

### 11.6 Settings

用于配置 Runtime Host、超时、调试和 Artifact 查看参数。

当前 MVP 不要求 `/cases` 路由、案例导入、案例重跑或自动断言中心。

---

## 12. 外部接口需求

### IR-001 AG-UI Agent 交互

Workbench 必须只通过 Runtime Host 的 AG-UI 入口交换用户消息、公开运行事件、工具调用、Interrupt、最终展示结果和运行控制信息。

### IR-002 普通 REST 查询

Workbench 可以通过 Runtime Host 的普通 REST 接口获取：

- Catalog；
- Scenarios；
- Health；
- Debug Conversation；
- TurnDetailsResponse；
- Diagnostic Artifact；
- Diagnostic Bundle。

这些接口不得重新形成一套自定义 Agent Run 协议。

### IR-003 Runtime Host 与 Business Agent

该接口不属于 Workbench 实现范围。
Workbench 不感知 Business Agent 的 HTTP + SSE、WebSocket、进程内调用或其他私有协议。

### IR-004 Runtime Host 与 Presentation Pipeline

该接口不属于 Workbench 直接调用范围。
Runtime Host 在进程内调用 Presentation Pipeline，并将 PresentationResult 和公开诊断映射给 Workbench。

### IR-005 Renderer 与 Registry

Renderer 必须通过 Component Registry 和 Action Registry 使用真实组件和前端能力，不得根据字符串执行任意模块或函数。

### IR-006 Artifact 读取

Artifact API 必须支持元数据查询，并根据对象类型和大小提供完整读取、分页读取、范围读取或流式读取。

---

## 13. 数据与契约需求

### DR-001 共享契约

系统应复用或扩展仓库共享契约，禁止在 Workbench 内重复定义与 Runtime Host 不一致的公共类型。

### DR-002 核心数据

Workbench 需要消费或维护：

- AG-UI Event；
- Platform Runtime Event 的前端投影；
- PresentationResult；
- MarkdownResult；
- A2UI；
- DebugConversation；
- DiagnosticEvent；
- DiagnosticArtifactMetadata；
- TurnDetailsResponse；
- Component Catalog；
- Frontend Component Registry；
- Frontend Action Definition；
- ActionRequest / ActionResult；
- ConfirmationRequest / ConfirmationResult；
- DiagnosticBundleMetadata。

不要求持久化 TurnTrace、TestCase 或 TestRunResult 作为当前产品模型。

### DR-003 事件标识

每个公开平台事件必须具有：

- 唯一 eventId；
- Turn 内单调递增 sequence；
- threadId；
- runId；
- turnId；
- source；
- type；
- timestamp；
- 可选 toolCallId、artifactRef、summary 和 metadata。

### DR-004 事件可靠性

事件传递采用至少一次语义。
Diagnostic Recorder 必须按 eventId 幂等去重。
Workbench 必须按 sequence 排序，不得只依赖时间戳。

### DR-005 Artifact 存储

Diagnostic Artifact 元数据至少包含：

- artifactId；
- conversationId；
- turnId；
- eventId 或 itemId；
- stage；
- artifactType；
- contentType；
- storageType；
- storageRef；
- sizeBytes；
- contentHash；
- persistenceStatus；
- createdAt。

小中型对象可以数据库内联；大型对象应自动转为文件或对象存储。

### DR-006 正式公开契约边界

完整诊断只覆盖正式公开契约边界上的完整可序列化输入输出。
以下内容不得进入浏览器或平台诊断历史：

- API Key、Token、密码、Cookie、设备控制凭据；
- 环境变量和数据库连接信息；
- Business Agent 或 Presentation Model 系统提示词；
- Provider 原始请求和响应；
- Business Agent 私有 State 和 Checkpoint；
- 未主动公开的内部工具调用；
- 模块局部变量、运行时实例和内存转储。

### DR-007 历史权威来源

Diagnostic Event 是过程事实，Diagnostic Artifact 是完整内容事实。
TurnDetailsResponse 是查询时聚合结果，不是第二份权威数据。

### DR-008 版本信息

以下数据应具备可追踪版本：

- AG-UI 和平台扩展事件；
- Runtime Contract；
- Presentation Contract；
- A2UI Profile；
- Component Catalog；
- 场景包；
- Diagnostic Bundle 格式。

---

## 14. 非功能需求

### NFR-SEC-001 安全性

- 模型和 Agent 输出视为不可信输入；
- 不得执行任意模型生成代码；
- 未注册组件不得渲染；
- 未注册 Action 不得执行；
- Props 和 Action 参数必须校验；
- 高风险操作必须确认；
- Markdown 必须安全处理；
- 浏览器不得持有后端敏感密钥；
- 禁止内容必须在进入平台公开事件前被排除，而不是发送到浏览器后隐藏。

### NFR-REL-001 可靠性

- UI 编译或渲染失败不得导致有效业务内容丢失；
- 实时连接断开必须显示明确状态；
- 连接恢复后应支持按 sequence 补齐；
- Action 应防止重复提交；
- 用户取消后不得继续执行受控操作；
- 诊断持久化失败不得导致业务 Turn 失败；
- Artifact 保存失败必须显示明确状态。

### NFR-OBS-001 可观察性

每个 Turn 至少应具备：

- eventId 和 sequence；
- threadId、runId、turnId；
- scenarioId 和 runtimeConfigId；
- 各阶段状态和耗时；
- 工具调用关联；
- 最终结果类型；
- 错误阶段和字段路径；
- 降级原因；
- Artifact 引用与持久化状态。

### NFR-PERF-001 性能

MVP 建议目标：

- 页面首次可交互时间不超过 3 秒；
- 发送请求后 500 毫秒内出现状态反馈；
- 实时事件展示不得等待诊断存储；
- 大型诊断 JSON 不得默认一次性加载和渲染；
- 数组应支持分页或虚拟化；
- 文本或文件应支持范围读取或流式读取；
- Inspect 不得阻塞主要业务结果渲染。

### NFR-STORAGE-001 存储保护

部署可以配置：

- 数据库内联阈值；
- 单文件保护阈值；
- 总存储容量；
- 文件系统可用空间下限；
- 对象存储超时。

保护阈值不得设计为过小的产品语义限制。
超过阈值只影响诊断持久化，不得影响主业务。

### NFR-EXT-001 可扩展性

新增业务场景的主要工作应是新增场景包、注册组件、注册前端 Action、增加示例输入并在 Runtime Host 注册 Agent 配置。
不得修改 UI Compiler Core 的领域逻辑。

### NFR-MAINT-001 可维护性

AG-UI Client、Renderer、Registry、Conversation、Inspect、Artifact Viewer 和场景加载应职责分离。
Diagnostic Recorder 当前应作为 Runtime Host 应用内模块，不因逻辑边界自动拆成 workspace package。

### NFR-TEST-001 可测试性

必须支持：

- AG-UI Client 集成测试；
- Registry 和 Schema 单元测试；
- Renderer 集成测试；
- Action 回传和人工确认测试；
- Diagnostic Event 去重和 sequence 测试；
- Debug Conversation 跨重启测试；
- Artifact 存储路由测试；
- 断线补偿测试；
- 关键业务场景端到端测试。

### NFR-DEPLOY-001 可部署性

- 支持独立构建；
- 支持 Nginx 或容器部署；
- 支持外部环境配置；
- 测试和发布环境应隔离；
- 构建产物不应包含开发环境密钥；
- 当前不实现 Debug Conversation 细粒度权限，访问边界由部署环境负责。

### NFR-USABILITY-001 易用性

用户无需阅读服务端原始日志即可判断：

- 请求是否成功；
- 当前处于什么阶段；
- Agent 调用了什么公开工具；
- 最终展示模式；
- 是否发生降级；
- 失败发生在哪一层；
- 诊断是否完整保存；
- 可以采取什么恢复操作。

### NFR-COMP-001 兼容性

MVP 优先支持 Chrome 最新稳定版本、Edge 最新稳定版本和 Windows 11 开发测试环境。

---

## 15. 架构和实现约束

### AC-001

Workbench 必须只连接 Agent Runtime Host，不得直接连接 Business Agent。

### AC-002

Workbench 的 Agent 交互必须使用 AG-UI；普通 REST 只用于非 Agent 查询。

### AC-003

CopilotKit Runtime 必须嵌入 Agent Runtime Host，不得作为绕过 PlatformRunService 和 Presentation Pipeline 的并列 Runtime。

### AC-004

Business Agent Adapter 不得总结、改写或重新解释业务内容。

### AC-005

过程消息、工具调用、状态、进度和 Interrupt 直接通过 AG-UI 传递，不进入 Presentation Pipeline。

### AC-006

最终 AgentContent 才进入 Presentation Pipeline；Markdown 不调用 Presentation Model 或 Compiler。

### AC-007

UI Plan、UI IR 和 A2UI 编译属于 UI Compiler Core，不得在 Workbench 重复实现。

### AC-008

真实前端组件和 Action 必须通过 Registry 注册并校验。

### AC-009

地图定位、路线显示、区域高亮和打开面板属于前端 Action；查询权威设备数据、创建任务和调用真实设备属于后端业务工具。

### AC-010

任务创建和设备控制必须经过用户确认。

### AC-011

智慧安防领域能力必须位于场景包或领域组件包，不得进入通用 Workbench 核心。

### AC-012

只持久化 Diagnostic Event 和 Diagnostic Artifact，不单独持久化 TurnTrace。

### AC-013

Diagnostic Event 不得保存原始 SSE、WebSocket Frame 或 CopilotKit 内部实例。

### AC-014

大型 Artifact 必须通过存储引用和按需读取处理，不得要求浏览器一次性加载。

### AC-015

Diagnostic Recorder 当前属于 Runtime Host 应用内模块，不自动新建 workspace package。

### AC-016

诊断持久化、重试或导出失败不得阻断 Agent、Presentation、Compiler 和 Renderer 主链路。

### AC-017

Workbench 的诊断能力不得成为未来正式业务前端运行的强制依赖。

---

## 16. 验收需求

### AR-001 可部署

Workbench 可以独立构建，并部署为可访问的开发诊断网站。

### AR-002 AG-UI 通信

Workbench 可以通过 Runtime Host 内嵌 CopilotKit Runtime 的 AG-UI 入口发送消息并接收实时事件。

### AR-003 公开事件

Workbench 可以展示至少一种 Business Agent 文本事件、一次后端工具调用与结果、一个运行状态事件和最终 AgentContent。

### AR-004 Markdown

Workbench 可以安全展示 Markdown PresentationResult，且该路径不调用 UI Compiler Core。

### AR-005 A2UI

Workbench 可以通过 Component Registry 渲染至少一组 A2UI 组件。

### AR-006 Action

Workbench 可以执行至少一个地图前端 Action，并将结果回传 Runtime Host。

### AR-007 人工确认

任务创建流程在用户确认前，Runtime Host 不得恢复确认型 Action，Business Agent 不得调用后端任务创建工具。

### AR-008 Debug Conversation

完成至少一个多 Turn Conversation，刷新浏览器和重启 Runtime Host 后仍能加载历史消息、Turn 和诊断元数据。

### AR-009 Turn Inspect

单个 Turn 可以展示按 sequence 排序的时间线、阶段、工具调用、输入输出引用、错误和耗时。

### AR-010 Artifact

至少验证：

- 一个数据库内联 Artifact；
- 一个文件或对象存储 Artifact；
- 大型数组分页查看；
- Artifact 持久化失败状态；
- 主业务不因诊断失败而失败。

### AR-011 断线补偿

断开实时连接并恢复后，可以根据 lastSequence 补齐事件；人为制造序号缺口时，Workbench 明确显示不完整提示。

### AR-012 Diagnostic Bundle

可以导出所选 Turn 的公开事件、Artifact 和版本信息，且不包含凭据、私有 Checkpoint、系统提示词或 Provider 原始响应。

### AR-013 智慧安防闭环

至少完成：

1. 查询可用设备；
2. 生成并比较巡防方案；
3. 选择方案并确认任务草稿；
4. 将确认结果回传 Runtime Host；
5. 展示创建结果或失败恢复信息。

### AR-014 职责边界

验收时必须确认：

- Workbench 未直接连接 Business Agent；
- Workbench 不包含 Business Agent Adapter；
- Workbench 未直接调用后端业务工具；
- Business Agent 私有 Checkpoint 未复制到 Debug Conversation；
- 智慧安防组件通过场景包注册；
- UI Compiler Core 未增加智慧安防领域判断；
- 不存在 HTTP/WebSocket 自定义 Agent 协议与 AG-UI 并列运行。

---

## 17. 开发优先级

### P0：Agent 交互与渲染闭环

- Workbench 应用基础；
- AG-UI Client；
- Conversation Surface；
- Markdown Renderer；
- A2UI Renderer；
- Component Registry；
- Action Registry；
- 状态和错误展示。

### P0：Debug Conversation 与诊断事实

- Debug Conversation 持久化；
- Diagnostic Event；
- Diagnostic Artifact；
- eventId 幂等与 sequence；
- TurnDetailsResponse；
- Inspect；
- 跨重启加载。

### P1：大型 Artifact 与可靠性

- Artifact Storage Router；
- 文件或对象存储；
- 延迟、分页和流式查看；
- 断线补偿；
- 持久化失败状态；
- Diagnostic Bundle Export。

### P1：首个业务闭环

- 设备状态查询；
- 巡防方案生成与比较；
- 地图 Action；
- 任务草稿确认；
- 确认结果回传；
- 智慧安防场景包。

### P2：增强能力

- Artifact 搜索和 JSON Path 定位；
- 运行统计；
- 链路性能分析；
- 多场景管理；
- 外部 Trace 系统关联。

完整 Case Definition、重跑、断言和回归管理作为未来独立测试平台能力评估。

---

## 18. 需求追踪矩阵

| 业务需求 | 对应需求 | 主要验收 |
|---|---|---|
| BR-001 完整链路验证 | FR-001～FR-012 | AR-002～AR-007 |
| BR-002 统一联调入口 | FR-001～FR-005 | AR-002～AR-005 |
| BR-003 实时可观察 | FR-004、FR-012、FR-014 | AR-003、AR-009 |
| BR-004 历史可恢复 | FR-013、FR-014 | AR-008、AR-009 |
| BR-005 可定位 | FR-014～FR-017 | AR-009～AR-011 |
| BR-006 完整 Artifact | FR-015、DR-005 | AR-010 |
| BR-007 业务价值验证 | 第 9 节 | AR-013 |
| BR-008 领域解耦 | FR-019、FR-020、AC-011 | AR-014 |
| BR-009 可发布运行 | FR-021、FR-022 | AR-001 |

---

## 19. 最终产品决策

Generative UI Workbench 采用：

> **通用 Workbench 核心 + 智慧安防场景包 + 空地多智能体巡防指挥参考实现。**

同时采用以下基础决策：

1. Workbench 与 Runtime Host 的 Agent 交互统一使用 AG-UI；
2. CopilotKit Runtime 嵌入 Runtime Host；
3. Business Agent 主动公开过程事件，Adapter 不改写内容；
4. 过程事件直接进入 Conversation/Inspect，最终 AgentContent 才进入 Presentation Pipeline；
5. Markdown 与 Generative UI 是 Presentation Pipeline 的两条最终展示路径；
6. Diagnostic Event 和 Diagnostic Artifact 是诊断历史的两类权威数据；
7. TurnDetailsResponse 是查询时聚合，不持久化 TurnTrace；
8. 正式公开契约 Artifact 原则上完整保留；
9. 大型 Artifact 自动转入文件或对象存储，并按需查看；
10. 诊断持久化不阻塞主业务；
11. 当前只提供 Diagnostic Bundle，不建设完整案例测试平台；
12. 当前不实现 Debug Conversation 细粒度权限。

最终定义：

> Generative UI Workbench 是 Generative UI Platform 的官方 Frontend Runtime 参考实现和开发诊断环境。它通过 AG-UI 连接 Agent Runtime Host，展示 Business Agent 主动公开的过程事件，渲染 Markdown 和受控生成式 UI，执行前端 Action，管理可恢复的 Debug Conversation，并通过逐 Turn Inspect 查看完整公开契约诊断；它不直接连接 Business Agent，不承担 Agent 私有状态、运行编排、UI 编译或后端业务工具职责。
