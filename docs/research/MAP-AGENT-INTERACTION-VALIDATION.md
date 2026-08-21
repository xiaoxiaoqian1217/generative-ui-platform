# 地图场景人机交互验证方向（Agent 操作地图）

- **性质：** 非规范性讨论记录（research）
- **日期：** 2026-08-19
- **更新：** 2026-08-20
- **背景：** 与领导沟通确定的新验证方向：验证人与 Agent 的交互方式，结合地图场景，让 Agent 可以操作地图，成果可沉淀为关键技术方向或报告输出

本文记录对该方向的论证、业界参照、验证矩阵与实施顺序，作为后续实现与报告的输入。

## 方向论证

### 起点观点

来自领导的方向判断：

- 需要对当前探索方向做验证，验证对象是人与 Agent 的交互方式。
- 验证要结合地图场景落地，让 Agent 可以操作地图。
- 验证成果以后可以作为关键技术或报告输出。
- 领导后续建议自己做一个 Agent 用于验证，其受控落地形态见"实施载体"中的薄验证 Agent。

### 验证问题

本方向首先要回答三个验证问题：

1. 当 Agent 连续操作地图时，用户能否理解变化、归因意图并保持控制感。
2. 当用户征询、纠偏、取消或直接操作地图时，Agent 与 Workbench 能否给出明确、可预期的让渡和恢复语义。
3. 地图域意图工具是否足以承载这些场景，而不把智能参谋业务实体或具体地图引擎机制泄漏给 Agent。

最终主交付是一份可决策的《地图共享表面中的人机协作交互验证报告》，产出物分层见文末"产出物定义"。

### 与既有研究的关系

本方向是 [Agent 交互泛化方向讨论记录](./AGENT-INTERACTION-GENERALIZATION.md) 中"工具中介行动"模式的深化验证载体。

- 该研究把"工具中介行动"描述为"Agent 驱动前端能力，用户观察结果"，当前由 locateDevice 单次调用跑通。
- 本方向把验证对象从单次工具调用扩展为"地图作为 Agent 的可操作表面"：多步编排、混合主导、中断语义、意图可见性。
- 地图场景同时是"打断纠偏"与"征询等待"模式最自然的触发场（Agent 操作序列进行中用户介入），因此它是 Layer 2 交互模式验证的集中试验场。

### 为什么地图是合适的验证载体

1. 已有基线可直接延伸。
   locateDevice 已经跑通 Agent -> Frontend Tool -> MapLibre 链路，扩展工具面是增量而非新架构。
2. 验证的是交互模型空白，不是重复验证能力。
   业界大多在验证"Agent 能否生成或驱动 UI"，但人与 Agent 如何共享一个有状态表面（相机、图层、选区）很少被系统验证。
3. 地图交互性质理想。
   视觉即时可评估、有真实状态同步问题、天然支持多步操作（可验证 Agent 规划），且贴合智能参谋的任务、设备、事件与方案场景。
4. 基础设施可延伸。
   AGUIMock 支持确定性 Frontend Tool fixture，Playground / Inspect 已能采集可观察事实，Issue #213 Scenario Lab 的场景文件与 expected facts 经验可作为设计参考。
5. 与 A2UI 线互补。
   A2UI 验证"Agent 生成内容"，本方向验证"Agent 操作既有表面"，两者合并构成人机交互的完整图景。

## 场景设计：北侧通道巡逻

本方向使用现有智能参谋项目作为业务场景与领域词汇来源，不继续围绕通用设备运维故事堆叠场景。
智能参谋中的巡逻任务、任务区域、观察点、限制区、候选路线和参谋人员等概念，为当前地图交互实验提供真实业务语境。
所有实现、运行、取证和体验评估仍在当前项目的 Workbench 中完成，不修改、接入、部署或复验智能参谋项目及其 Cesium、Dashboard 能力，不形成跨项目集成任务。

首轮使用一个贯穿 A-D 的母场景：北侧通道巡逻方案研判与调整。

### 业务语义与地图工具的边界

场景应当保留智能参谋业务语义，地图工具不应绑定业务语义。
用户可以提出"帮我想想怎么巡逻北侧通道"，Agent 也可以理解巡逻目标、限制条件和候选路线，但最终只能通过稳定的地图域意图操作共享地图。

核心原则是：

> 业务语义留在场景与 Agent 上下文中，地图工具只表达地图域意图。

fixture 预先提供业务事实和业务分析结果，包括巡逻区域、必经观察点、限制区、两条候选路线及其固定取舍。
薄验证 Agent 不计算路线、调度设备或执行真实任务，也不判断专业方案优劣，而是根据这些业务语义选择地图目标、编排地图域意图、决定征询时机，并在用户纠偏后重排后续操作。

从第一性原理看，本实验要操纵的自变量是人与 Agent 如何共享地图、理解操作、征询纠偏和让渡控制权。
如果同时让 Agent 生成业务事实、分析威胁或规划路线，业务推理质量就会成为混杂变量，失败时无法判断问题来自业务判断、地图工具还是交互设计。
因此首轮固定业务事实，只让 Agent 决定地图意图及其顺序，这是实验控制手段，不是对真实智能参谋产品职责的长期定义。
这种约束不是为了去掉业务，而是为了隔离职责和失败归因。
场景负责回答"用户为什么要看这些对象"，地图工具只负责回答"地图应当发生什么变化"。

### 共享场景事实

| 业务对象 | fixture 提供的固定事实 | 地图投影 |
| --- | --- | --- |
| 巡逻任务 | 参谋人员需要设计北侧通道巡逻方案 | `north-corridor` 区域要素 |
| 观察要求 | 东侧高地、桥下区域和检查点 B 必须纳入观察 | 三个点或区域要素 |
| 通行限制 | 北坡限制区不可进入 | 限制区面要素与限制图层 |
| 候选路线 A | 经过东侧高地，覆盖范围较大、距离较长 | 已生成的路径要素 `patrol-path-a` |
| 候选路线 B | 优先经过桥下区域，距离较短、东侧覆盖较少 | 已生成的路径要素 `patrol-path-b` |

业务对象到地图要素的投影由场景数据预先给定。
候选路线已经存在，Agent 只负责展示与比较，不调用路径规划或伪造路线计算能力。

### 业务请求到地图域意图

| 交互目的 | 地图域意图 | 说明 |
| --- | --- | --- |
| 展开巡逻任务的空间范围 | `focusOn` | 将视口调整到一个或多个地图目标 |
| 强调观察点和限制区 | `highlight` | 对既有地图目标进行视觉强调 |
| 显示任务所需上下文 | `setLayerVisibility` | 批量显示或隐藏既有地图图层 |
| 比较候选巡逻路线 | `previewPath` | 临时预览一条既有路径 |
| 请用户选择候选路线 | `useHumanInTheLoop` + 地图本地预览 | 选择项携带地图目标引用，用户可预览后答复 |
| 用户手动点击、缩放或固定路线 | 地图本地交互 | 用户操作优先，不提升为 Agent Tool |
| Run 被取消、替代或失败 | Workbench 状态处置 | 自动清理 Agent 临时效果，保留用户拥有的地图状态 |

一次完整映射示例：

```text
用户：帮我想想怎么巡逻北侧通道
  -> setLayerVisibility(show: [operational-constraints])
  -> focusOn(north-corridor)
  -> highlight(east-ridge, under-bridge, checkpoint-b, north-restricted-zone)
  -> previewPath(patrol-path-a)
  -> previewPath(patrol-path-b)
  -> 征询用户选择或提出修改要求
```

工具参数只包含地图目标或图层引用，工具的完整职责边界见"地图域工具契约"。
"巡逻任务"、"限制区"和"候选方案"等业务含义来自场景上下文，不进入工具名称或专用参数。

## 地图域工具契约

工具随场景入场，工具面与被验证的交互维度同步增长，不长成通用 GIS Agent SDK。

### 工具清单与职责边界

首轮 Agent 可见地图工具收敛为四个地图域意图：

| 工具 | 用户可感知结果 | 明确不承担的职责 |
| --- | --- | --- |
| `focusOn` | 视口聚焦一个或多个地图目标 | 不查询业务实体，不接收相机参数 |
| `highlight` | 强调一个或多个既有地图目标 | 不接收业务状态或样式 JSON |
| `setLayerVisibility` | 按 show / hide 终态批量调整既有地图图层 | 不创建图层，不决定业务数据权限 |
| `previewPath` | 临时预览一条既有路径，并替代上一次 Agent 路径预览 | 不计算、优化或提交路线 |

工具使用地图域目标或图层引用，不使用 `deviceId`、`incidentId`、`taskId` 或 `blueprintId` 等业务参数，也不接收坐标、相机配置或样式 JSON。

### 契约类型

```text
MapTargetRef
  featureId: string
  layerId?: string

MapLayerRef
  layerId: string

SetLayerVisibilityInput
  show?: MapLayerRef[]
  hide?: MapLayerRef[]

MapOperationResult
  status: completed | cancelled | superseded | failed
  affectedFeatureIds?: string[]
  affectedLayerIds?: string[]
  reason?: string
```

业务实体到 `MapTargetRef` 或 `MapLayerRef` 的翻译由数据管线约定承担。
业务可寻址 ID 可作为 `featureId` 的值落图，但 Agent 只看到地图域字段。

### 语义细则

`previewPath` 的目标必须引用已经存在的线要素。
候选路线的距离、覆盖范围和限制条件属于场景事实，不由地图工具计算。

`focusOn` 的 completed 表示用户可感知的视口移动已经结束，而不只是动画已经发起。
如果用户在移动期间接管视口，本次操作应返回 cancelled 或 superseded，Agent 不得继续抢回视口。

`highlight` 的一次调用表达一个完整目标集合，新 Agent 高亮替代旧 Agent 高亮，但不清除用户选择。
`setLayerVisibility` 的 show 与 hide 使用图层引用批量表达目标终态，避免多次调用产生不完整的中间状态。

征询不是第五个地图操作工具。
`useHumanInTheLoop` 的候选项可以携带 `MapTargetRef`，Workbench 复用同一预览行为帮助用户比较路线，但用户答复仍通过标准征询闭环返回 Agent。

清理也不作为 Agent Tool。
Workbench 按效果所有者自动处置状态：新的 Agent 预览替代旧预览，Run 取消或失败清理 Agent 临时效果，用户手动固定的路线和视口不被 Agent 清理。

### 新工具入场校验

新工具入场时过四道校验：

1. 命名落在地图域意图上，不落在 MapLibre 机制或智能参谋业务对象上。
2. 一次调用对应一个用户可感知的结果，内部可编排多个地图引擎调用。
3. 参数只表达地图目标与意图，业务语义由上游结构化资源、场景上下文与 prompt 提供。
4. 结果必须表达完成、取消、被替代和失败，使 Agent 能根据真实地图结果重规划。

现有 `locateDevice` 是纵向切片的务实起点，但它暴露了业务语义，不符合本阶段的目标契约。
步骤 1 将 Agent 可见的 `locateDevice` 迁移为 `focusOn` 与 `highlight`，并同步迁移 fixture 和 e2e 基线，不把业务工具保留为目标契约。
`setLayerVisibility` 和 `previewPath` 随巡逻场景入场，不因工具分类学完整性提前增加其他 GIS 能力。
`select`、路线固定和视口操作保留为地图本地状态，不提升为 Agent Tool。

### 业界参照：Felt

在本次已调研的公开材料中，Felt 是"Agent 操作地图"的主要产品化参照。
Felt MCP Server 的公开页面给出约 30 个工具和 Make maps、Bring in data、Write SQL、Run spatial analysis、Style automatically、Collaborate 六类能力，但没有逐项公开完整的 MCP 工具名和 schema。[Felt MCP Server 发布页](https://felt.com/blog/introducing-felt-mcp-server)
精确的方法名来自 [Felt JavaScript SDK](https://developers.felt.com/)，它们用于校验地图域意图背后的浏览器原语，不是 Agent 工具契约的直接模板。
详细资料与事实、推断边界见 [Felt 地图域意图参考](./FELT-MAP-INTENT-REFERENCE.md)，本文不把推测出的 MCP 方法当成事实，也不照搬其完整 GIS 工具面。

| 当前意图或机制 | Felt 中可核验的相近原语 | 当前设计结论 |
| --- | --- | --- |
| `focusOn` | `setViewport()`、`fitViewportToBounds()`、`selectFeature({ fitViewport })` | 保留较深的地图意图，由 Workbench 解析目标，不向 Agent 暴露中心点、缩放级别和动画参数 |
| `highlight` | `selectFeature()`、临时 `setLayerStyle()`、临时 `setLayerFilters()` | 保留统一意图，由 Workbench 选择实现并管理多目标、替代和清理语义 |
| `setLayerVisibility` | 同名 `setLayerVisibility({ show, hide })` | 对齐批量 show / hide 终态，但只接收图层引用，不暴露引擎机制 |
| `previewPath` | session-only Path element、既有 Path、交互式 `route` 工具 | 只预览既有路径，不生成、规划或持久化路线 |
| `useHumanInTheLoop` + 地图本地预览 | selection、pointer 与 element 事件 | 地图预览支持用户检查候选项，业务确认仍通过标准征询闭环返回 Agent |
| Workbench 状态处置 | `clearSelection()`、`deleteElement()`、`setTool(null)` 等局部清理原语 | Run 级清理、效果所有权和控制权让渡仍由 Workbench 定义 |

`focusOn`、`highlight` 和 `previewPath` 不是 Felt 的同名 SDK 方法，而是当前项目根据交互场景组织出的 Agent 意图层，一个意图可以在 Workbench 内部编排多个地图原语。
Felt 的 `route` 是带交通方式与途经点的交互式路线创建能力，与当前 `previewPath` 只展示既有路线有本质区别。
Felt 的 selection 是地图本地状态，不等于用户对业务方案的确认。
Felt 还提供 pin、line、route、polygon、highlighter、text 和 note 等绘制工具；如果后续真实场景需要用户圈区或画线，可以新增受控地图输入机制，但首轮不因此扩展工具面。

Felt 证明了视口、可见性、选择、绘制和标注可以按稳定地图概念组织。
它没有替当前项目回答 Run 打断、临时效果所有权、用户接管和恢复规则，这些仍是本次人机交互验证的核心问题。

## 验证设计

"验证"必须先定义可证伪的假设和通过判据，否则会退化成 demo 堆砌。
本章验证设计覆盖当前选定的地图交互模式，用于验证既有 taxonomy 在智能参谋业务语境下的解释力，不声称覆盖所有人与 Agent 交互。

### 证据分层

1. 工程证据验证协议闭环、事件关联、地图终态、取消与失败语义，由确定性 fixture 和 e2e 回归产生。
2. Agent 行为证据验证征询时机、工具选择、重规划质量与新模式发现，由薄验证 Agent 在固定配置下重复运行产生。
3. 体验证据验证用户能否理解意图、完成任务、预测后续行为并在需要时接管，由形成性用户评估产生。

三类证据不可互换。
fixture 通过不等于用户理解，单次模型成功也不等于 Agent 行为稳定。

### Issue #214 基线与当前验证主张

[Issue #214](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/214) 已建立场景 A 的确定性工程基线。
该基线证明标准 AG-UI Tool Call / Tool Result、四个地图域意图和同一 Map Surface 的连续操作可以闭环、断言和回归。
它不声称已经证明用户能够理解过程、预测后续行为或介入 Agent。

当前实现保留为形成性评估的 A0 对照基线：

```text
用户发出请求
  -> Agent 连续操作地图
  -> 用户看到地图终态和最终答复
  -> Inspect 审计完整事件与调用结果
```

对 A0 的当前体验观察是：工程过程已经存在，但普通用户主要感知到最终地图状态，难以恢复动作顺序、变化来源和当前决策阶段。
这一观察不是 Issue #214 工程验收失败，而是下一阶段需要验证的 Human-Agent Interaction 假设来源。

当前阶段的验证主张收敛为：

> 在不暴露原始协议细节或私有推理的前提下，最小语义反馈能否让用户感知、理解并正确归因 Agent 对共享地图的操作，同时不过度增加信息负担？

### 理论依据到场景假设

理论用于解释为什么存在交互需求，并帮助定义可证伪假设。
理论不能直接证明某个具体 UI 方案正确，最终结论仍需由当前场景的形成性体验证据支持。

| 理论或设计原则 | 当前场景风险 | 导出的设计假设 | 体验证据 |
| --- | --- | --- | --- |
| [系统状态可见性](https://media.nngroup.com/media/articles/attachments/Heuristic_Summary_compressed.pdf) | 用户只看到连续地图操作后的终态 | 及时、语义化的状态反馈能够改善动作来源和完成状态判断 | 来源归因正确率、完成状态判断正确率 |
| [ISO 9241-110 自描述性与可控性](https://www.iso.org/standard/75258.html?browse=tc) | 地图变化缺少目的说明，用户不知道能否停止或修改 | 使用用户任务语言说明行为并提供明确控制点能够改善理解和接管 | 过程复述正确率、正确介入率 |
| [情境感知](https://doi.org/10.1518/001872095779049543) | 用户难以感知当前元素、理解意义并预测下一步 | 保留少量当前状态和事实轨迹能够改善感知、理解和预测 | 当前阶段、结果边界与下一步判断正确率 |
| [Human-AI Interaction Guidelines](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf) | 用户不知道系统为什么这样行动，也难以纠正错误 | 解释公开行动依据并支持纠正能够改善行为理解和控制 | 行为理由复述、纠正成功率与纠正耗时 |
| 最小化与渐进披露 | 原始事件、参数和关联标识会与任务信息竞争注意力 | 默认呈现语义里程碑、按需展开技术证据比直接显示事件日志更有效 | 任务完成时间、主观负担与无用信息反馈 |

情境感知理论最初面向动态操作环境。
本文将其应用到 Agent 操作共享地图，是用于构造场景假设的设计推导，不声称原研究已经直接验证当前产品。

本方向采用以下论证链：

```text
场景事实
  -> 可观察的用户问题
  -> 理论或设计原则
  -> 场景化设计假设
  -> 用户感知契约
  -> 原型与评估指标
  -> Go / Pivot / Stop 证据
```

不得从"AG-UI 提供了某种事件"直接推出"Conversation 必须展示该事件"。
协议事件是承载方式，用户任务和验证假设才是呈现需求的来源。

### 交互状态与共享地图控制权

完整顺序执行只是 Happy Path。
后续场景还必须覆盖等待用户、主动打断、被新 Run 替代、取消、失败和恢复。

```text
running
  -> completed
  -> waiting_for_user -> resumed -> running
  -> interrupted_by_user -> cancelled / superseded -> replanned
  -> failed -> retry / recover / cancel
  -> cancelled
```

过程呈现必须区分计划与事实。
计划表示 Agent 准备做什么，可以在征询、打断或重规划后改变。
事实表示已经发生的公开事件和地图结果，不得把未执行、已取消或被替代的操作呈现为已完成。

过程项使用以下用户可解释状态，不要求立即建立新的通用状态框架：

```text
pending
running
completed
waiting_for_user
cancelled
superseded
failed
```

现有 `MapOperationResult` 已提供 completed、cancelled、superseded 与 failed 结果语义。
场景 A 先验证 completed，场景 C、D 与横切维度 E-H 再按真实需要验证其他路径。

共享地图效果同时区分来源和所有权：

| 地图状态 | 默认所有者 | 被打断或替代时的原则 |
| --- | --- | --- |
| Agent 临时高亮 | 当前 Agent Run | 按场景规则保留或清理，结果必须可观察 |
| Agent 路线预览 | 当前 Agent Run | 新预览可以替代旧预览，取消或失败时清理临时效果 |
| 用户选择或固定路线 | 用户 | Agent 不得自动清理或覆盖 |
| 用户视口操作 | 用户 | 用户接管优先，进行中的 Agent 视口操作返回 cancelled 或 superseded |
| 业务确认结果 | 用户与业务流程 | 不由 `previewPath` 或地图本地点击隐式产生 |

界面不仅要说明 Agent 做了什么，还要在非理想路径中说明哪些事实已经完成、哪些操作停止、哪些临时效果保留，以及下一步由谁行动。

### 用户感知契约

Conversation 不是 AG-UI 事件日志，而是用户与 Agent 的共享任务记忆。
Map 表达当前空间状态，Conversation 保存最低限度的时间、因果和决策边界，Inspect 保留工程审计事实。

一项信息至少满足以下一个条件，才默认进入用户感知层：

1. 它解释明显的地图或界面变化。
2. 它改变用户对任务阶段、完成状态或结果边界的判断。
3. 它帮助用户决定等待、选择、修改、取消、重试或接管。
4. 它能够由 Agent 文本、公开 AG-UI 事件、Tool Result 或 Workbench 真实地图状态直接证明。

只用于协议调试和关联的信息进入 Inspect，不进入默认 Conversation。
这类信息包括原始事件类型、toolCallId、runId、threadId、参数 JSON 和完整结果载荷。

首轮用户感知契约如下：

| 发生时刻 | 公开事实 | 用户需要回答的问题 | 默认用户感知 | Inspect 证据 |
| --- | --- | --- | --- | --- |
| Run 开始 | `RUN_STARTED` | Agent 是否已经开始工作 | 正在处理当前请求 | runId、threadId、原始事件 |
| 地图动作开始 | `TOOL_CALL_START` / `TOOL_CALL_ARGS` | 地图为什么正在变化 | 当前语义动作，不显示工具机制名 | toolCallId、toolCallName、参数 |
| 地图动作结束 | `TOOL_CALL_RESULT` / `MapOperationResult` | 操作成功、失败、取消还是被替代 | 语义结果与状态 | 完整 Tool Result 和关联 |
| 路线预览 | Workbench 地图状态 | 路线是否已经最终选择 | 明确标记“临时预览路线 A / B” | featureId、图层和地图前后状态 |
| 等待用户 | Human-in-the-loop / Interrupt | 现在需要用户做什么 | 选择、修改、取消和等待状态 | interrupt / tool correlation |
| 用户打断 | Abort、新指令或新 Run | 哪些已完成、停止、清理或保留 | 计划停止摘要、残余状态和下一行动者 | 新旧 Run、取消与结果事件链 |
| Run 结束 | `RUN_FINISHED` / `RUN_ERROR` | 当前任务达到什么结果和边界 | 完成、失败或可恢复状态摘要 | 原始结果、错误和全部关联 |

场景 A 的候选最小语义里程碑不是四个 Tool Call 的机械翻译。
它按用户任务目的合并为：

```text
正在展开北侧通道的任务范围与限制
已标记 3 个观察点和北坡限制区
已临时预览候选路线 A
初步地图展示完成，尚未比较或选择最终方案
```

第一项可以合并 `setLayerVisibility` 与 `focusOn`，因为两次地图动作服务同一个用户目的。
`highlight` 单独呈现，因为它引入支撑研判的空间事实。
`previewPath` 单独呈现，因为它改变当前决策对象，并且必须明确临时性。

这组内容目前只是 A1 原型假设，不是已经接受的生产 UI 契约。
是否需要持久结构化过程、可展开详情或更少信息，由形成性评估决定。

### 候选用户感知模型: Plan / Action / Evidence / Result

本模型是从 Felt 的对话式空间工作流与可见、可编辑地图产物中提炼出的设计假设，不是 Felt 官方公布的消息分类，也不是当前已经接受的产品协议。
它用于组织形成性验证、解释 Map 与 Conversation 的信息分工，并作为最终验证报告中描述用户如何感知 Agent 工作过程的候选分析框架。

模型不展示模型内部 Chain-of-Thought。
它只展示 Agent 主动公开且可以由事件、工具结果或应用状态验证的计划、动作、证据和结果。

信息产生与展示遵循三层责任：

```text
Agent 产生业务语义
  -> AG-UI 事件负责传输
  -> Workbench 根据事件和地图状态进行展示投影
```

AG-UI 只提供事件信封和通用 payload 结构，不会自动生成用户可理解的业务语义。
Agent 没有发送的计划、分析依据或建议，Workbench 不得根据最终结果补写或倒推。

#### 四类用户感知信息

| 类型 | 回答的问题 | 事实提供者 | 推荐 AG-UI 承载 | 展示原则 |
| --- | --- | --- | --- | --- |
| Plan | Agent 准备完成哪些用户可理解的阶段 | Agent | `ACTIVITY_SNAPSHOT` / `ACTIVITY_DELTA` 或 Assistant 文本 | 使用业务语言表达少量可验证阶段，不展示内部节点或 Chain-of-Thought |
| Action | Agent 此刻正在对地图做什么 | Agent Tool Call | `TOOL_CALL_START` / `TOOL_CALL_ARGS` / `TOOL_CALL_END` | Workbench 可以把稳定工具名和参数确定性投影为地图动作，但不得补写分析理由 |
| Evidence | 用户凭什么相信动作或判断成立 | Frontend Tool、地图应用状态或 Agent 分析结果 | `TOOL_CALL_RESULT`、应用状态、`ACTIVITY_*` 或结构化结果 | 操作证据必须来自真实执行和地图终态，分析证据必须由 Agent 提供并带有可检查的依据 |
| Result | 本轮最终产生了什么、边界是什么、下一步是什么 | Agent | `TEXT_MESSAGE_*`、结构化结果或 `RUN_FINISHED.result` | Conversation 保留业务总结、当前边界和下一步，不只显示“操作成功” |

Plan 是面向用户整理后的公开执行意图，不等同于模型推理文本。
例如“先展开任务范围，再标出观察点和限制区，最后预览候选路线”可以作为 Plan，但模型如何搜索 token、评估候选调用或形成内部推断不属于产品展示。

Action 必须对应已经发生或正在发生的外部行为。
例如 `focusOn`、`highlight`、`setLayerVisibility` 和 `previewPath` 可以投影为用户可理解的地图动作，但不能把尚未调用的工具提前显示为正在执行或已经完成。

Evidence 分为操作证据和分析证据。
操作证据包括 Tool Result 状态、受影响的 feature 或 layer、视口是否完成移动以及地图是否出现对应视觉结果。
分析证据包括约束、数据来源、比较维度和推荐依据，这些内容不能仅从 Tool Call 推导，必须由 Agent 或受控业务内容提供。

Result 应说明业务结果和结果边界。
如果当前只预览了已有路线 A，Result 可以说明路线已经显示并可继续比较或调整，但不能声称路线由 Agent 生成、已经最优或已经被用户选定。

#### Map、Conversation 与 Inspect 的分工

| Surface | 主要职责 | 应保留的信息 | 不应承担的信息 |
| --- | --- | --- | --- |
| Map | 让用户就地理解空间变化和当前执行状态 | 当前 Action、已完成的地图动作、空间 Evidence、可操作地图产物 | 长篇业务解释、原始事件参数、无法由地图验证的分析理由 |
| Conversation | 保持跨轮任务语境、决定和可追溯结果 | Plan、关键分析 Evidence、Result、失败说明、征询和用户决定 | 每个 Tool Call 的机械重复、地图上已经清楚表达的低层状态 |
| Inspect | 保存工程证据并支持关联诊断 | 原始 AG-UI 事件、toolCallId、参数、Tool Result、状态变化和投影关联 | 面向普通用户的主交互叙事 |

同一真实事件可以在多个 Surface 上进行不同粒度的投影，但不能形成多份互相独立的状态真相。
例如一次 `previewPath` Tool Call 可以在 Map 上显示路线和当前动作，在 Conversation 中留下“候选路线 A 已预览”的结果摘要，并在 Inspect 中保留完整调用参数与结果。

#### Surface 承载决策检查表

承载位置不应只按 AG-UI 事件类型预先固定，而应对每条用户可感知信息依次回答三个问题：

1. 不看地图后，这条信息是否仍对继续提问、确认决定或回顾任务有意义。
   如果有，应保留在 Conversation。
2. 这条信息是否必须结合位置、范围、路线或图层才能理解。
   如果是，应主要作用在 Map。
3. 用户以后是否需要据此确认、纠偏、追踪失败或审查依据。
   如果需要，即使 Map 已经显示结果，也应在 Conversation 或 Inspect 保留相应语义或证据。

三个问题形成以下承载结论：

| 判断结果 | 推荐承载 |
| --- | --- |
| 主要依赖空间位置理解，离开地图后没有持续任务意义 | Map only |
| 不依赖地图理解，但需要跨轮保留、继续提问或记录决定 | Conversation only |
| 既依赖空间对象理解，又需要跨轮保留业务意义 | Map 与 Conversation 双重投影 |
| 主要服务协议关联、原始参数、失败定位或审计 | Inspect |

双重投影不表示复制两份状态。
Map 表达空间对象、当前动作和可见结果，Conversation 表达同一事实的业务意义、决定边界与后续行动。

这三个问题也作为形成性评估的检查项。
参与者需要能够判断信息出现的位置是否有助于理解，是否造成 Map 与 Conversation 重复，以及离开当前地图视图后是否仍能恢复任务语境。

#### AG-UI 事件与语义边界

`RUN_STARTED`、`RUN_FINISHED` 和 `RUN_ERROR` 只提供运行生命周期，不能单独表达用户可理解的计划。
`STEP_STARTED` 和 `STEP_FINISHED` 当前主要携带 `stepName`，只有在 Agent 能稳定提供用户语义阶段时才适合作为公开进度来源。
`ACTIVITY_SNAPSHOT` 和 `ACTIVITY_DELTA` 可以承载结构化公开计划或进度，但 `activityType` 和 `content` 的业务语义仍需由 Agent 定义。
`TOOL_CALL_*` 提供工具名、参数和关联标识，适合驱动 Action 投影。
`TOOL_CALL_RESULT` 提供执行结果，适合形成操作 Evidence，但不能自动证明更高层的业务判断。
`TEXT_MESSAGE_*` 和 `RUN_FINISHED.result` 适合承载 Result。
`REASONING_*` 即使存在，也不作为本模型中 Plan 的默认来源，正式界面不依赖原始 Chain-of-Thought。

#### 场景 A 的当前事实与缺口

当前 AGUIMock 场景 A 发送四组真实 Tool Call、对应 Tool Result 和最终 Assistant 文本。
它已经提供 Action、操作 Evidence 和 Result 的基础事实，但没有发送公开 Plan、结构化分析 Evidence、`STEP_*` 或地图计划 `ACTIVITY_*`。

因此当前 Workbench 可以确定性展示：

- 显示任务限制图层；
- 聚焦北侧通道；
- 标记 3 个观察点和北坡限制区；
- 预览候选路线 A；
- 每项操作的完成、失败、取消或被替代状态。

当前 Workbench 不应自行声称：

- Agent 已经比较路线 A 与路线 B；
- 路线 A 是最优路线；
- Agent 根据实时风险生成了路线；
- 用户已经选定或提交路线 A；
- Agent 采用了事件中没有提供的分析理由。

如果后续真实 Agent 能稳定产生有用户意义的公开计划，可以评估新增 `activityType: "map-plan"` 的 `ACTIVITY_SNAPSHOT`，再通过 `ACTIVITY_DELTA` 更新计划状态。
在此之前不由 Runtime 或 Workbench 伪造 `STEP_*`、`ACTIVITY_*` 或 Agent 计划。

#### 形成性验证与报告使用

本模型需要通过场景 A 到 D 的形成性评估验证，而不是根据 Felt 参照直接接受。
评估需要检查参与者是否能够在不打开 Inspect 的情况下回答：Agent 准备做什么、当前做了什么、哪些结果可以直接观察、最终结论的边界是什么以及下一步由谁行动。

每次运行的证据包应同时记录：

- Agent 实际发送的公开语义；
- 对应 AG-UI 事件和 payload；
- Workbench 在 Map 与 Conversation 上的投影；
- Tool Result 和地图操作前后状态；
- 参与者对 Plan、Action、Evidence 和 Result 的理解结果；
- 缺失、重复、误导或无法验证的信息。

最终报告可以使用本模型组织“用户如何感知 Agent 工作过程”章节，并分别给出四类信息的有效性、冗余、失败模式和承载位置结论。
只有经体验证据证明稳定、必要且可复用的部分，才提升为正式 UX 准则、Agent 输出要求或长期协议约束。

### A0 / A1 / A2 形成性原型

首轮先比较三个受控呈现层级，不先决定使用 `STEP_*` 或 `ACTIVITY_*`：

| 原型 | 呈现范围 | 验证目的 |
| --- | --- | --- |
| A0 当前基线 | 地图终态与最终 Assistant 文本 | 测量没有显式过程反馈时的理解基线 |
| A1 最小语义反馈 | 当前动作、关键完成事实、临时预览与结果边界 | 验证最少信息能否支持归因、理解和预测 |
| A2 持久过程视图 | 可更新步骤、等待、失败、取消、恢复和按需详情 | 仅在 A1 不足时验证更完整过程是否带来额外收益 |

A0 保持与 Issue #214 相同的工具链和业务事实。
A1 与 A2 只改变用户呈现，不改变 Agent 输入、Tool Call 顺序、地图终态或 fixture 事实，避免把行为差异混入体验比较。

参与者完成任务后，在不打开 Inspect 的前提下回答：

1. 地图变化由谁发起。
2. Agent 已经完成哪些工作。
3. 当前路线是否已经最终选定。
4. 下一步由 Agent 还是用户行动。
5. Agent 行为错误时应如何停止或纠正。

同时记录参与者认为缺失、重复或无用的信息。
体验结论优先使用任务表现和理解正确率，主观评分用于补充解释，不以"看起来更像 Agent"作为通过标准。

形成性评估后的承载决策遵循：

1. 如果 A1 已满足理解与归因目标，优先使用现有 RUN_*、TOOL_CALL_*、TOOL_CALL_RESULT 和 Workbench 地图事实完成薄语义投影。
2. 如果用户确实需要跨消息保留、增量更新的结构化过程，再验证 ACTIVITY_SNAPSHOT / ACTIVITY_DELTA。
3. 只有真实 Agent 能稳定提供有用户意义的语义阶段时，才验证 STEP_STARTED / STEP_FINISHED。
4. 路线选择、修改与取消进入场景 B 的 Human-in-the-loop，不由场景 A 的过程呈现代替。
5. 原始协议事件、关联标识和载荷始终保留在 Inspect，不因主界面呈现而删除。

### 首轮评估协议

1. 每个确定性场景的必须通过项需要 100% 通过 e2e 回归，并核对调用参数、toolCallId、结果状态与地图终态。
2. 薄验证 Agent 对每个场景至少重复 10 次，固定模型、prompt、工具 schema 和推理参数，预期行为达成率不低于 80%。
3. 形成性体验评估至少覆盖 5 名目标角色内部参与者，任务完成率和意图归因正确率不低于 80%，可预期性与控制感评分中位数不低于 4 / 5。
4. 所有场景都不允许出现无法恢复的地图残余状态、用户接管后 Agent 继续覆盖操作，或将未发生的操作呈现为已完成。
5. 每次运行记录场景版本、模型与 prompt 版本、用户输入、公开事件、工具结果、操作前后地图状态与人工观察。

以上阈值是首轮形成性验证的决策线，不用于声称统计泛化。
未达阈值但问题可定位且可修正时给出 Pivot，出现重复的控制权失效或不可恢复状态时给出 Stop。

### 验证矩阵

场景设计分成两层：

- **核心交互场景**回答"人与 Agent 如何共同完成任务"。
- **横切验证维度**回答"任一核心场景发生异常、留下状态或需要解释时，系统是否仍然可理解、可恢复"。

#### 核心交互场景

| 场景 | 可证伪假设 | 必须通过项 | 工具 / 机制 | 现状 |
| --- | --- | --- | --- | --- |
| 单轮问答："北侧通道有哪些巡逻限制？" | 作为只读业务问答对照基线 | 回答只引用 fixture 事实，不产生地图副作用 | 无 | 已有能力覆盖 |
| 委托执行："帮我想想怎么巡逻北侧通道" | 作为完整地图协作任务入口 | Agent 使用给定业务事实组织地图展示与路线比较，不生成新路线 | Run lifecycle | 场景 A 工程基线已完成；完整协作待 B-D |
| 单步工具基线：从 locateDevice 迁移 | 地图域意图工具可替代业务工具而不损失已有闭环 | 目标、高亮、视口和返回结果与基线一致 | focusOn、highlight | 已完成迁移与回归 |
| A 多步工具中介：Agent 显示限制图层、总览北侧通道、高亮观察点和限制区，再预览候选路线 A | 参谋人员能跟上连续地图变化，并理解每次变化与巡逻任务的关系 | 地图域意图选择、调用顺序和终态正确；业务语义没有进入工具契约；意图归因正确率达标 | setLayerVisibility、focusOn、highlight、previewPath | Issue #214 工程基线已完成；用户感知待验证 |
| B 征询等待：Agent 依次介绍并预览候选路线 A / B，请用户选择、取消或提出修改要求 | Agent 能在业务选择处停止，地图预览能够支持决策而不声称路线由 Agent 计算 | 答复前不提交或执行路线；候选路线可独立预览；选择、取消和修改要求都能闭环 | previewPath、useHumanInTheLoop、地图本地预览 | 待做 |
| C 打断纠偏：Agent 正在展示路线 A 时，用户要求"避开东侧高地，重点巡逻桥下区域" | 用户修改业务目标后，Agent 能根据已给定候选信息替换后续地图意图，而不是生成新业务方案 | 未执行调用被取消；路线 A 临时效果处置清晰；Agent 高亮桥下区域并预览已存在的路线 B | Run 级 / 语义步骤级打断、highlight、previewPath | 待做 |
| D 混合主导：Agent 正在预览路线 A 时，用户手动固定路线 B、点击桥下区域或平移地图 | 用户直接操作共享地图与 Agent 当前引导冲突时，控制权让渡可预期 | 用户操作优先；Agent 不抢回视口或覆盖固定路线；只有用户明确要求继续后才恢复引导 | 地图本地交互、控制权让渡 | 待做 |

#### 横切验证维度

| 横切维度 | 可证伪假设 | 必须通过项 | 注入位置 | 现状 |
| --- | --- | --- | --- | --- |
| E 失败路径 | 多步序列 RUN_ERROR、限制图层不可用或候选路径要素缺失后，地图残余状态与恢复边界清晰 | 错误归因正确，不把失败操作呈现为已完成，不声称已展示缺失路线，残余状态可见且可恢复 | A-D 任一多步场景 | run-error fixture 已有模式 |
| F 意图可见性 | 用户能归因每次地图变化的发起者和理由 | 所有变化都有可观察来源，归因正确率达标 | 从 A 开始持续记录 | Inspect 工程证据已具备；体验未验证 |
| G 状态残余 | Agent 部分操作后停止、失败或被纠偏时，临时路线预览、Agent 高亮和用户固定路线有不同且明确的保留规则 | 保留、清理和恢复结果与场景规则一致 | B / C / D / E | 未验证 |
| H 恢复与接续 | 新指令或新 Run 到来时，系统能明确继续、修改还是替换旧地图意图序列 | 新旧 Run 和路线预览关系可观察，被替代的地图操作不会意外恢复 | C / D / E | 未验证 |

单轮问答、委托执行与单步工具调用构成基线。
新增核心研究工作是同一个智能参谋巡逻母场景中的 A-D 四种交互，E-H 作为横切维度注入，不继续堆独立 demo。

交互模式 taxonomy 仍然是待验证假设，不是完备性定理。
如果探索中发现 Agent 主动 map push 等新模式，应新增矩阵行并重新评估覆盖范围。

### 场景 C 的打断边界

场景 C 来自用户对巡逻目标的中途修改，但不要求 Agent 生成新路线。
fixture 已经给出路线 B 满足"避开东侧高地、优先桥下区域"的固定事实，Agent 只需据此替换后续地图意图。

第一阶段验证的是 **Run 级 / 语义步骤级打断**。
巡逻方案展开天然包含显示图层、总览区域、高亮约束和预览路线等多个用户可感知的地图步骤。
用户在两个语义步骤之间提出修改要求时，系统需要决定：

- 尚未执行的 Tool Call 是否取消。
- 已经完成的 focus / highlight 是否保留。
- 当前 Run 如何结束。
- 新指令是续接旧 Run 还是启动新 Run。
- 原地图意图序列和路线预览是继续、替换还是清理。
- Agent 是否需要根据已有候选信息重排地图操作并重新征询。

AGUIMock 可以在语义步骤之间加入短暂、确定性的可观察间隔，便于回归和人工观察。
间隔只是验证手段，不是场景成立的原因。
不能通过把一个原本瞬时完成的 Tool Call 人为拉长来证明"支持打断"。

如果未来出现路径规划、轨迹播放、批量编辑等真正长时间运行的单个 Frontend Tool，再单独研究 Tool 内部取消（in-tool cancellation）。
它与当前的 Run 级纠偏是不同问题。

## 实施

### 框架复用清点（CopilotKit / AG-UI）

既有研究提出"泛化动作是清点"，下表是清点结果。
轮子与缺口的边界很清楚：CopilotKit 提供工具、挂起、响应和传输机制，地图副作用、残余状态与共享表面控制权仍是 Workbench 应用语义。

| 闭环需求 | 框架已提供 | Workbench 必须定义 |
| --- | --- | --- |
| 单轮问答 | 聊天 UI 与 streaming text 渲染 | - |
| 工具中介行动 | `useFrontendTool`、TOOL_CALL_RESULT 回传与 handler AbortSignal | 四个地图域意图的副作用和结果契约 |
| 征询等待 | Vue v2 `useHumanInTheLoop` 与 component renderer | 征询内容、地图本地路线预览、超时、取消和回复 UI |
| 事件词汇与路由 | AG-UI 事件协议、SSE 与 thin Runtime 的 Agent 注册 | 验证 source 的可见标识与开关 |
| 传输取消 | AbortController / AbortSignal 基础 | 地图动画与副作用的实际终止和残余状态 |
| 对话纠偏 | 新 Run 和消息传输机制 | 新旧 Run 取代关系和旧操作处置 |
| 意图可见性 / 混合主导 | 可观察工具和 Run 事件 | 变化归因、用户接管和冲突规则 |

### 实施载体

1. 场景契约使用"北侧通道巡逻方案研判与调整"版本化 fixture，固定任务区域、观察点、限制区、候选路线、路线取舍和地图投影。
2. 当前仓库中的地图域工具实现位于 `apps/web-workbench/src/features/frontend-tools/`，沿用已证明的 `useFrontendTool` 浏览器执行模式。
3. 确定性 fixture 位于 `packages/ag-ui-mock/src/scenarios/`，为每个工程验证维度提供可回归的成功、纠偏、被替代与失败场景。
   打断纠偏 fixture 必须包含天然需要多个 Tool Call 的语义序列，可在步骤间加入短暂、确定性的观察间隔，不靠拉长瞬时操作证明打断。
4. 本验证方向明确准入一个 AGUIMock / SACS 之外的第三 Agent source，即 dev-only 薄验证 Agent。
5. 薄验证 Agent 采用 LangGraph + CopilotKit 官方集成路径，挂接到现有 copilot-runtime 的 Agent 注册，只挂地图域工具与征询能力。
6. 薄验证 Agent 不承载业务逻辑、持久化状态或产品 Runtime Truth，由 LLM 决定工具选择、顺序、征询时机与被纠偏后的重规划。
7. 薄验证 Agent 默认关闭，使用独立配置与明确的验证 source 标识，不伪装为 SACS 也不进入产品默认 source 列表。
8. AGUIMock 保持确定性，LLM 不进入 mock。
9. 薄验证 Agent 的每次运行都记录模型、prompt、工具 schema 与推理参数，使得探索证据可重放、可比较，不将其定义为"不可复现"。

当前 Issue #213 Scenario Lab 只服务 `PresentationInput -> Secondary Presentation LLM -> A2UI surface` 与 expected facts 检查。
本方向只复用其场景文件、人工审定和 expected facts 经验，不声称它已经具备地图交互运行记录能力。

地图交互证据由 Playground / Inspect 采集，并增加最小 JSON 导出或等价的可审查留证方式。
这一能力只导出 Workbench 已观测的公开事实，不创建 Runtime Repository、私有诊断协议或通用评估平台。

### 实施顺序

每步带 e2e 回归：

1. 已完成 - 基线与工具迁移：固定当前 `locateDevice` e2e 基线，将 Agent 可见契约迁移为 `focusOn` 与 `highlight`，并用 `MapTargetRef` 和 `MapOperationResult` 验证行为等价。
2. 已完成 - 场景事实固化：为北侧通道、观察点、限制区、两条候选路线、固定路线取舍和地图投影建立版本化 fixture 与 expected facts。
3. 已完成 - 地图意图扩展：在 `focusOn` / `highlight` 基线上按场景增加 `setLayerVisibility` 与 `previewPath`，分别验证图层可见性和临时路径预览语义。
4. 已完成工程基线 - 多步工具场景：AGUIMock 完成限制图层显示、区域总览、约束高亮和路线 A 预览的场景 A，并从这一步开始累积意图可见性 F 的证据。
5. 当前 - 场景 A 用户感知验证：保留 Issue #214 为 A0，对比 A1 最小语义反馈与必要时的 A2 持久过程视图，形成意图可见性 F 的首轮体验证据。
6. 待做 - 征询等待闭环：使用 Vue v2 `useHumanInTheLoop` 实现路线 A / B 的本地预览、选择、取消和修改要求，完成场景 B。
7. 待做 - 薄验证 Agent：按 Feature admission gate 立 Issue，以约 1 周的时间盒完成接线和首轮 prompt 探索，并按首轮评估协议重复运行。
8. 待做 - 打断纠偏与混合主导：以用户修改巡逻目标和手动固定路线 B 为载体，定义场景 C / D 的 Tool Call 处置、地图意图重排、地图残余状态、新旧 Run 衔接和控制权让渡语义。
9. 待做 - 横切维度：将失败 E、意图可见性 F、状态残余 G 和恢复接续 H 注入 A-D，不为它们另造孤立 demo。
10. 待做 - 形成性评估与报告：汇总当前 Workbench 与 Inspect 中的可观察证据，完成参与者任务与评分，产出主报告、证据包、技术资产与后续决策。

核心逻辑：先定义可证伪契约和工具基线，再用确定性 fixture 与薄验证 Agent 分别取工程证据和行为证据，最后用体验证据决定 Go / Pivot / Stop。

## 交付与边界

### 产出物定义

主交付是《地图共享表面中的人机协作交互验证报告》，其他内容作为报告附件与后续资产。
关键技术不是与报告二选一的交付形态，而是报告根据证据识别出的技术结论与可复用资产。
如果验证不成立，报告应当明确给出否定或收缩结论，不为了形成"关键技术"而预设成功。

最终交付分为四层：

1. 主报告：验证结论、证据、适用边界、失败模式与 Go / Pivot / Stop 建议。
2. 证据包：场景定义、AG-UI 事件、Frontend Tool 轨迹、录屏或截图、评分与模型配置。
3. 技术资产：地图域工具契约、中断与控制权语义、UX 准则、fixture 与 e2e 回归。
4. 后续决策：需要进入主线的 Issue、ADR 或终止投入的理由。

#### 主报告

1. 执行摘要与 Go / Pivot / Stop 结论。
2. 验证问题、范围、方法、参与者与局限。
3. 按场景填写的假设、阈值、证据、失败样本与结论矩阵。
4. 地图共享表面的交互模式 taxonomy，包括发起者、编排、征询、纠偏与控制权让渡。
5. 失败模式和 UX 准则，包括意图可见性、撤销边界、残余状态和操作反馈。
6. Felt agent-as-cartographer 与本平台 operational copilot 的对比分析。
7. 关键技术方向、不成立的假设与下一阶段投入建议。

#### 证据包

1. 版本化场景、输入、预期结果和评分表。
2. Inspect 导出的公开事件、Frontend Tool 调用与地图操作前后状态。
3. 薄验证 Agent 的模型、prompt、工具 schema、参数、重复运行结果和失败样本。
4. 体验评估的任务完成结果、意图归因结果、评分和必要的录屏或截图。

#### 经证据支持的技术资产

1. `MapTargetRef`、`MapLayerRef` 与 `MapOperationResult` 地图域契约。
2. `focusOn`、`highlight`、`setLayerVisibility` 与 `previewPath` 的意图和副作用边界。
3. 取消、被替代、失败和用户接管语义。
4. Agent source 能力声明与 Workbench 工具实现的对应矩阵。
5. 可回归 fixture、e2e 测试和经体验证据支持的 UX 准则。

只有当证据表明某项能力稳定、可复用且超越单一场景时，才将其提升为关键技术方向或长期架构约束。

### 边界与纪律

- 不做通用 GIS Agent SDK，该能力在仓库规则中明确 out of scope。
- 本方向是 Frontend Tool 能力扩展 + 交互模式验证，不是 GIS Agent 平台化，也不是恢复已删除的 Runtime / Compiler / Presentation 架构。
- 复用 AG-UI 协议与 CopilotKit `useFrontendTool` 既有机制，不自建交互框架，遵守既有研究对 Layer 2 的"薄"警告。
- SACS 当前不支持 client-provided Frontend Tools，相关验证基于 AGUIMock 与薄验证 Agent，capability gap 显式呈现，不伪造协议能力。
- 薄验证 Agent 作为第三个 dev-only Agent source 的准入只覆盖受时间盒约束的本地验证仪器，不自动允许它进入产品默认拓扑或演变为自研 Business Agent。
- 每个新增 Issue / PR 按仓库 Feature admission gate 答卷。

### 进入主线前的重新验证

按 `docs/research/README.md` 的使用原则，本文为非规范性输入。

若此方向准备进入主线：

1. 保留 Issue #214 已完成的地图域意图工具与场景 A 工程基线，将其作为 A0 对照，不把用户理解或正式体验评估追溯为该 Issue 的完成条件。
2. 按"用户感知契约"先比较 A0、A1 与必要时的 A2，形成场景 A 的意图可见性证据，再决定是否实现持久过程呈现或进入场景 B。
3. 为地图交互单独定义 Inspect 证据导出、录屏和评分方式，不只复用 Issue #213 Scenario Lab 的场景文件与人工审定经验。
4. 在实施 Issue 中固定薄验证 Agent 的开关、source 标识、配置留证与时间盒。
5. 与 `docs/ARCHITECTURE.md` 对齐工具边界、Runtime 职责和 SACS capability gap 后再进入实现。
6. 如果验证后决定把薄验证 Agent 留在产品默认拓扑，或把交互 taxonomy 提升为正式契约，再新增 ADR。
