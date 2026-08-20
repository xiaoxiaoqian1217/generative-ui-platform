# 地图场景人机交互验证方向（Agent 操作地图）

- **性质：** 非规范性讨论记录（research）
- **日期：** 2026-08-19
- **更新：** 2026-08-20
- **背景：** 与领导沟通确定的新验证方向：验证人与 Agent 的交互方式，结合地图场景，让 Agent 可以操作地图，成果可沉淀为关键技术方向或报告输出

## 起点观点

来自领导的方向判断：

- 需要对当前探索方向做验证，验证对象是人与 Agent 的交互方式。
- 验证要结合地图场景落地，让 Agent 可以操作地图。
- 验证成果以后可以作为关键技术或报告输出。
- 领导后续建议自己做一个 Agent 用于验证，其受控落地形态见"实施载体"中的薄验证 Agent。

本文记录对该方向的论证、业界参照、验证矩阵与实施顺序，作为后续实现与报告的输入。

## 验证问题与最终交付

本方向首先要回答三个验证问题：

1. 当 Agent 连续操作地图时，用户能否理解变化、归因意图并保持控制感。
2. 当用户征询、纠偏、取消或直接操作地图时，Agent 与 Workbench 能否给出明确、可预期的让渡和恢复语义。
3. 地图域意图工具是否足以承载这些场景，而不把智能参谋业务实体或具体地图引擎机制泄漏给 Agent。

最终主交付是一份可决策的《地图共享表面中的人机协作交互验证报告》。
关键技术不是与报告二选一的交付形态，而是报告根据证据识别出的技术结论与可复用资产。

最终交付分为四层：

1. 主报告：验证结论、证据、适用边界、失败模式与 Go / Pivot / Stop 建议。
2. 证据包：场景定义、AG-UI 事件、Frontend Tool 轨迹、录屏或截图、评分与模型配置。
3. 技术资产：地图域工具契约、中断与控制权语义、UX 准则、fixture 与 e2e 回归。
4. 后续决策：需要进入主线的 Issue、ADR 或终止投入的理由。

如果验证不成立，报告应当明确给出否定或收缩结论，不为了形成“关键技术”而预设成功。

## 与既有研究的关系

本方向是 [Agent 交互泛化方向讨论记录](./AGENT-INTERACTION-GENERALIZATION.md) 中"工具中介行动"模式的深化验证载体。

- 该研究把"工具中介行动"描述为"Agent 驱动前端能力，用户观察结果"，当前由 locateDevice 单次调用跑通。
- 本方向把验证对象从单次工具调用扩展为"地图作为 Agent 的可操作表面"：多步编排、混合主导、中断语义、意图可见性。
- 地图场景同时是"打断纠偏"与"征询等待"模式最自然的触发场（Agent 操作序列进行中用户介入），因此它是 Layer 2 交互模式验证的集中试验场。

## 为什么地图是合适的验证载体

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

## 智能参谋场景锚点

本方向使用现有智能参谋项目作为业务场景与领域词汇来源，不继续围绕通用设备运维故事堆叠场景。
智能参谋中的巡逻任务、任务区域、观察点、限制区、候选路线和参谋人员等概念，为当前地图交互实验提供真实业务语境。
所有实现、运行、取证和体验评估仍在当前项目的 Workbench 中完成，不接入或改造智能参谋项目。

### 业务语义与地图工具的边界

场景应当保留智能参谋业务语义，地图工具不应绑定业务语义。
用户可以提出"帮我想想怎么巡逻北侧通道"，Agent 也可以理解巡逻目标、限制条件和候选路线，但最终只能通过稳定的地图域意图操作共享地图。

fixture 预先提供业务事实和业务分析结果，包括巡逻区域、必经观察点、限制区、两条候选路线及其固定取舍。
薄验证 Agent 不计算路线或判断专业方案优劣，而是根据这些业务语义选择地图目标、编排地图域意图、决定征询时机，并在用户纠偏后重排后续操作。

从第一性原理看，本实验要操纵的自变量是人与 Agent 如何共享地图、理解操作、征询纠偏和让渡控制权。
如果同时让 Agent 生成业务事实、分析威胁或规划路线，业务推理质量就会成为混杂变量，失败时无法判断问题来自业务判断、地图工具还是交互设计。
因此首轮固定业务事实，只让 Agent 决定地图意图及其顺序，这是实验控制手段，不是对真实智能参谋产品职责的长期定义。

这种约束不是为了去掉业务，而是为了隔离职责和失败归因。
场景负责回答"用户为什么要看这些对象"，地图工具只负责回答"地图应当发生什么变化"。

核心原则是：

> 业务语义留在场景与 Agent 上下文中，地图工具只表达地图域意图。

首轮使用一个贯穿 A-D 的母场景：北侧通道巡逻方案研判与调整。

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
| 显示任务所需上下文 | `setLayerVisibility` | 批量显示或隐藏既有地图图层，不接收样式 JSON |
| 比较候选巡逻路线 | `previewPath` | 临时预览一条既有路径，不负责生成路径 |
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

工具参数只包含地图目标或图层引用。
"巡逻任务"、"限制区"和"候选方案"等业务含义来自场景上下文，不进入工具名称或专用参数。

当前项目是本方向唯一的实现与验证载体，复用 AGUIMock、Playground、Inspect 和 e2e 取证能力。
智能参谋只提供业务故事、角色和领域对象参考，不承担后续产品环境复验，也不形成跨项目集成任务。

## 业界参照：Felt

在本次已调研的公开材料中，Felt 是"Agent 操作地图"的主要产品化参照。
Felt MCP Server 的公开页面给出约 30 个工具和 Make maps、Bring in data、Write SQL、Run spatial analysis、Style automatically、Collaborate 六类能力，但没有逐项公开完整的 MCP 工具名和 schema。[Felt MCP Server 发布页](https://felt.com/blog/introducing-felt-mcp-server)
因此本文不把推测出的 MCP 方法当成事实，也不照搬其完整 GIS 工具面。

精确的方法名来自 [Felt JavaScript SDK](https://developers.felt.com/)，它们用于校验地图域意图背后的浏览器原语，不是 Agent 工具契约的直接模板。
详细资料与事实、推断边界见 [Felt 地图域意图参考](./FELT-MAP-INTENT-REFERENCE.md)。

### Felt 原语与当前地图域意图的映射

| 当前意图或机制 | Felt 中可核验的相近原语 | 当前设计结论 |
| --- | --- | --- |
| `focusOn` | `setViewport()`、`fitViewportToBounds()`、`selectFeature({ fitViewport })` | 保留较深的地图意图，由 Workbench 解析目标，不向 Agent 暴露中心点、缩放级别和动画参数 |
| `highlight` | `selectFeature()`、临时 `setLayerStyle()`、临时 `setLayerFilters()` | 保留统一意图，由 Workbench 选择实现并管理多目标、替代和清理语义 |
| `setLayerVisibility` | 同名 `setLayerVisibility({ show, hide })` | 对齐批量 show / hide 终态，但只接收图层引用，不暴露引擎机制 |
| `previewPath` | session-only Path element、既有 Path、交互式 `route` 工具 | 只预览既有路径，不生成、规划或持久化路线 |
| `useHumanInTheLoop` + 地图本地预览 | selection、pointer 与 element 事件 | 地图预览支持用户检查候选项，业务确认仍通过标准征询闭环返回 Agent |
| Workbench 状态处置 | `clearSelection()`、`deleteElement()`、`setTool(null)` 等局部清理原语 | Run 级清理、效果所有权和控制权让渡仍由 Workbench 定义 |

`focusOn`、`highlight` 和 `previewPath` 不是 Felt 的同名 SDK 方法。
它们是当前项目根据交互场景组织出的 Agent 意图层，一个意图可以在 Workbench 内部编排多个地图原语。

Felt 的 `route` 是带交通方式与途经点的交互式路线创建能力，而当前 `previewPath` 只展示 fixture 中已经存在的路线。
这个区别确保实验不会在无意中引入路径规划业务能力。

Felt 的 selection 是地图本地状态，不等于用户对业务方案的确认。
因此候选路线的悬停、点击和预览留在地图本地交互中，选择、取消或修改巡逻要求仍由 `useHumanInTheLoop` 承担。

Felt 还提供 pin、line、route、polygon、highlighter、text 和 note 等绘制工具。
如果后续真实场景需要用户圈区或画线，可以新增受控地图输入机制，但首轮不因参考 Felt 而扩展成通用 GIS Agent SDK。

Felt 证明了视口、可见性、选择、绘制和标注可以按稳定地图概念组织。
它没有替当前项目回答 Run 打断、临时效果所有权、用户接管和恢复规则，这些仍是本次人机交互验证的核心问题。

## 验证契约

"验证"必须先定义可证伪的假设和通过判据，否则会退化成 demo 堆砌。
本矩阵覆盖当前选定的地图交互模式，用于验证既有 taxonomy 在智能参谋业务语境下的解释力，不声称覆盖所有人与 Agent 交互。

### 证据分层

1. 工程证据验证协议闭环、事件关联、地图终态、取消与失败语义，由确定性 fixture 和 e2e 回归产生。
2. Agent 行为证据验证征询时机、工具选择、重规划质量与新模式发现，由薄验证 Agent 在固定配置下重复运行产生。
3. 体验证据验证用户能否理解意图、完成任务、预测后续行为并在需要时接管，由形成性用户评估产生。

三类证据不可互换。
fixture 通过不等于用户理解，单次模型成功也不等于 Agent 行为稳定。

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
| 委托执行："帮我想想怎么巡逻北侧通道" | 作为完整地图协作任务入口 | Agent 使用给定业务事实组织地图展示与路线比较，不生成新路线 | Run lifecycle | 待做 |
| 单步工具基线：从 locateDevice 迁移 | 地图域意图工具可替代业务工具而不损失已有闭环 | 目标、高亮、视口和返回结果与基线一致 | focusOn、highlight | 机制已证明，待迁移 |
| A 多步工具中介：Agent 显示限制图层、总览北侧通道、高亮观察点和限制区，再预览候选路线 A | 参谋人员能跟上连续地图变化，并理解每次变化与巡逻任务的关系 | 地图域意图选择、调用顺序和终态正确；业务语义没有进入工具契约；意图归因正确率达标 | setLayerVisibility、focusOn、highlight、previewPath | 待做 |
| B 征询等待：Agent 依次介绍并预览候选路线 A / B，请用户选择、取消或提出修改要求 | Agent 能在业务选择处停止，地图预览能够支持决策而不声称路线由 Agent 计算 | 答复前不提交或执行路线；候选路线可独立预览；选择、取消和修改要求都能闭环 | previewPath、useHumanInTheLoop、地图本地预览 | 待做 |
| C 打断纠偏：Agent 正在展示路线 A 时，用户要求"避开东侧高地，重点巡逻桥下区域" | 用户修改业务目标后，Agent 能根据已给定候选信息替换后续地图意图，而不是生成新业务方案 | 未执行调用被取消；路线 A 临时效果处置清晰；Agent 高亮桥下区域并预览已存在的路线 B | Run 级 / 语义步骤级打断、highlight、previewPath | 待做 |
| D 混合主导：Agent 正在预览路线 A 时，用户手动固定路线 B、点击桥下区域或平移地图 | 用户直接操作共享地图与 Agent 当前引导冲突时，控制权让渡可预期 | 用户操作优先；Agent 不抢回视口或覆盖固定路线；只有用户明确要求继续后才恢复引导 | 地图本地交互、控制权让渡 | 待做 |

#### 横切验证维度

| 横切维度 | 可证伪假设 | 必须通过项 | 注入位置 | 现状 |
| --- | --- | --- | --- | --- |
| E 失败路径 | 多步序列 RUN_ERROR、限制图层不可用或候选路径要素缺失后，地图残余状态与恢复边界清晰 | 错误归因正确，不把失败操作呈现为已完成，不声称已展示缺失路线，残余状态可见且可恢复 | A-D 任一多步场景 | run-error fixture 已有模式 |
| F 意图可见性 | 用户能归因每次地图变化的发起者和理由 | 所有变化都有可观察来源，归因正确率达标 | 从 A 开始持续记录 | 未验证 |
| G 状态残余 | Agent 部分操作后停止、失败或被纠偏时，临时路线预览、Agent 高亮和用户固定路线有不同且明确的保留规则 | 保留、清理和恢复结果与场景规则一致 | B / C / D / E | 未验证 |
| H 恢复与接续 | 新指令或新 Run 到来时，系统能明确继续、修改还是替换旧地图意图序列 | 新旧 Run 和路线预览关系可观察，被替代的地图操作不会意外恢复 | C / D / E | 未验证 |

单轮问答、委托执行与单步工具调用构成基线。
新增核心研究工作是同一个智能参谋巡逻母场景中的 A-D 四种交互，E-H 作为横切维度注入，不继续堆独立 demo。
Agent-facing 地图意图随场景收敛为 `focusOn`、`highlight`、`setLayerVisibility` 和 `previewPath`。
用户点击、固定路线和视口操作属于地图本地交互，不提升为 Agent Tool。

### 关于场景 C 的打断边界

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

### 地图域工具契约

工具随场景入场，工具面与被验证的交互维度同步增长，不长成通用 GIS Agent SDK。

首轮 Agent 可见地图工具收敛为四个地图域意图：

| 工具 | 用户可感知结果 | 明确不承担的职责 |
| --- | --- | --- |
| `focusOn` | 视口聚焦一个或多个地图目标 | 不查询业务实体，不接收相机参数 |
| `highlight` | 强调一个或多个既有地图目标 | 不接收业务状态或样式 JSON |
| `setLayerVisibility` | 按 show / hide 终态批量调整既有地图图层 | 不创建图层，不决定业务数据权限 |
| `previewPath` | 临时预览一条既有路径，并替代上一次 Agent 路径预览 | 不计算、优化或提交路线 |

工具使用地图域目标或图层引用，不使用 `deviceId`、`incidentId`、`taskId` 或 `blueprintId` 等业务参数，也不接收坐标、相机配置或样式 JSON。

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

新工具入场时过四道校验：

1. 命名落在地图域意图上，不落在 MapLibre 机制或智能参谋业务对象上。
2. 一次调用对应一个用户可感知的结果，内部可编排多个地图引擎调用。
3. 参数只表达地图目标与意图，业务语义由上游结构化资源、场景上下文与 prompt 提供。
4. 结果必须表达完成、取消、被替代和失败，使 Agent 能根据真实地图结果重规划。

现有 `locateDevice` 是纵向切片的务实起点，但它暴露了业务语义，不符合本阶段的目标契约。
步骤 1 将 Agent 可见的 `locateDevice` 迁移为 `focusOn` 与 `highlight`，并同步迁移 fixture 和 e2e 基线，不把业务工具保留为目标契约。
`setLayerVisibility` 和 `previewPath` 随巡逻场景入场，不因工具分类学完整性提前增加其他 GIS 能力。
`select`、路线固定和视口操作保留为地图本地状态，不提升为 Agent Tool。

交互模式 taxonomy 仍然是待验证假设，不是完备性定理。
如果探索中发现 Agent 主动 map push 等新模式，应新增矩阵行并重新评估覆盖范围。

## 框架复用清点（CopilotKit / AG-UI）

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

## 实施载体

1. 场景契约使用"北侧通道巡逻方案研判与调整"版本化 fixture，固定任务区域、观察点、限制区、候选路线、路线取舍和地图投影。
2. 当前仓库中的地图域工具实现位于 `apps/web-workbench/src/features/frontend-tools/`，沿用已证明的 `useFrontendTool` 浏览器执行模式。
3. 确定性 fixture 位于 `packages/ag-ui-mock/src/scenarios/`，为每个工程验证维度提供可回归的成功、纠偏、被替代与失败场景。
   打断纠偏 fixture 必须包含天然需要多个 Tool Call 的语义序列，可在步骤间加入短暂、确定性的观察间隔，不靠拉长瞬时操作证明打断。
4. 本验证方向明确准入一个 AGUIMock / SACS 之外的第三 Agent source，即 dev-only 薄验证 Agent。
5. 薄验证 Agent 采用 LangGraph + CopilotKit 官方集成路径，挂接到现有 copilot-runtime 的 Agent 注册，只挂地图域工具与征询能力。
6. 薄验证 Agent 不承载业务逻辑、持久化状态或产品 Runtime Truth，由 LLM 决定工具选择、顺序、征询时机与被纠偏后的重规划。
7. 薄验证 Agent 默认关闭，使用独立配置与明确的验证 source 标识，不伪装为 SACS 也不进入产品默认 source 列表。
8. AGUIMock 保持确定性，LLM 不进入 mock。
9. 薄验证 Agent 的每次运行都记录模型、prompt、工具 schema 与推理参数，使得探索证据可重放、可比较，不将其定义为“不可复现”。

当前 Issue #213 Scenario Lab 只服务 `PresentationInput -> Secondary Presentation LLM -> A2UI surface` 与 expected facts 检查。
本方向只复用其场景文件、人工审定和 expected facts 经验，不声称它已经具备地图交互运行记录能力。

地图交互证据由 Playground / Inspect 采集，并增加最小 JSON 导出或等价的可审查留证方式。
这一能力只导出 Workbench 已观测的公开事实，不创建 Runtime Repository、私有诊断协议或通用评估平台。

## 实施顺序

每步带 e2e 回归：

1. 基线与工具迁移：固定当前 `locateDevice` e2e 基线，将 Agent 可见契约迁移为 `focusOn` 与 `highlight`，并用 `MapTargetRef` 和 `MapOperationResult` 验证行为等价。
2. 场景事实固化：为北侧通道、观察点、限制区、两条候选路线、固定路线取舍和地图投影建立版本化 fixture 与 expected facts。
3. 地图意图扩展：在 `focusOn` / `highlight` 基线上按场景增加 `setLayerVisibility` 与 `previewPath`，分别验证图层可见性和临时路径预览语义。
4. 多步工具场景：AGUIMock 完成限制图层显示、区域总览、约束高亮和路线 A 预览的场景 A，并从这一步开始累积意图可见性 F 的证据。
5. 征询等待闭环：使用 Vue v2 `useHumanInTheLoop` 实现路线 A / B 的本地预览、选择、取消和修改要求，完成场景 B。
6. 薄验证 Agent：按 Feature admission gate 立 Issue，以约 1 周的时间盒完成接线和首轮 prompt 探索，并按首轮评估协议重复运行。
7. 打断纠偏与混合主导：以用户修改巡逻目标和手动固定路线 B 为载体，定义场景 C / D 的 Tool Call 处置、地图意图重排、地图残余状态、新旧 Run 衔接和控制权让渡语义。
8. 横切维度：将失败 E、意图可见性 F、状态残余 G 和恢复接续 H 注入 A-D，不为它们另造孤立 demo。
9. 形成性评估与报告：汇总当前 Workbench 与 Inspect 中的可观察证据，完成参与者任务与评分，产出主报告、证据包、技术资产与后续决策。

核心逻辑：先定义可证伪契约和工具基线，再用确定性 fixture 与薄验证 Agent 分别取工程证据和行为证据，最后用体验证据决定 Go / Pivot / Stop。

## 边界与纪律

- 不做通用 GIS Agent SDK，该能力在仓库规则中明确 out of scope。
- 本方向是 Frontend Tool 能力扩展 + 交互模式验证，不是 GIS Agent 平台化，也不是恢复已删除的 Runtime / Compiler / Presentation 架构。
- 场景保留智能参谋业务语义；工具名称、参数和结果只表达地图域意图，不为巡逻、事件、设备或任务建立专用工具。
- 薄验证 Agent 可以根据已给定业务事实组织展示和征询，但不承担路径计算、设备调度或真实任务执行。
- 智能参谋只提供业务场景参考，本方向不修改、接入、部署或复验智能参谋项目及其 Cesium、Dashboard 能力。
- 复用 AG-UI 协议与 CopilotKit `useFrontendTool` 既有机制，不自建交互框架，遵守既有研究对 Layer 2 的"薄"警告。
- SACS 当前不支持 client-provided Frontend Tools，相关验证基于 AGUIMock 与薄验证 Agent，capability gap 显式呈现，不伪造协议能力。
- 本方向已准入薄验证 Agent 作为第三个 dev-only Agent source，无需再把“是否允许该 source”作为实施阻塞。
- 该准入只覆盖受时间盒约束的本地验证仪器，不自动允许它进入产品默认拓扑或演变为自研 Business Agent。
- 每个新增 Issue / PR 按仓库 Feature admission gate 答卷。

## 产出物定义

主交付是《地图共享表面中的人机协作交互验证报告》，其他内容作为报告附件与后续资产。

### 主报告

1. 执行摘要与 Go / Pivot / Stop 结论。
2. 验证问题、范围、方法、参与者与局限。
3. 按场景填写的假设、阈值、证据、失败样本与结论矩阵。
4. 地图共享表面的交互模式 taxonomy，包括发起者、编排、征询、纠偏与控制权让渡。
5. 失败模式和 UX 准则，包括意图可见性、撤销边界、残余状态和操作反馈。
6. Felt agent-as-cartographer 与本平台 operational copilot 的对比分析。
7. 关键技术方向、不成立的假设与下一阶段投入建议。

### 证据包

1. 版本化场景、输入、预期结果和评分表。
2. Inspect 导出的公开事件、Frontend Tool 调用与地图操作前后状态。
3. 薄验证 Agent 的模型、prompt、工具 schema、参数、重复运行结果和失败样本。
4. 体验评估的任务完成结果、意图归因结果、评分和必要的录屏或截图。

### 经证据支持的技术资产

1. `MapTargetRef`、`MapLayerRef` 与 `MapOperationResult` 地图域契约。
2. `focusOn`、`highlight`、`setLayerVisibility` 与 `previewPath` 的意图和副作用边界。
3. 取消、被替代、失败和用户接管语义。
4. Agent source 能力声明与 Workbench 工具实现的对应矩阵。
5. 可回归 fixture、e2e 测试和经体验证据支持的 UX 准则。

只有当证据表明某项能力稳定、可复用且超越单一场景时，才将其提升为关键技术方向或长期架构约束。

## 进入主线前的重新验证

按 `docs/research/README.md` 的使用原则，本文为非规范性输入。

若此方向准备进入主线：

1. 按"实施顺序"先固定智能参谋场景事实，完成 `locateDevice` 到地图域意图工具的基线迁移，再跑通场景 A。
2. 复用 Issue #213 Scenario Lab 的场景文件和人工审定经验，但为地图交互单独定义 Inspect 证据导出、录屏和评分方式。
3. 按本文准入 dev-only 薄验证 Agent source，并在实施 Issue 中固定开关、source 标识、配置留证与时间盒。
4. 场景 A-D 的实现、运行、体验评估和证据导出全部在当前项目完成，不增加智能参谋项目集成步骤。
5. 与 `docs/ARCHITECTURE.md` 对齐工具边界、Runtime 职责和 SACS capability gap 后再进入实现。
6. 如果验证后决定把薄验证 Agent 留在产品默认拓扑，或把交互 taxonomy 提升为正式契约，再新增 ADR。
