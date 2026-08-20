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
3. 地图域意图工具是否足以承载这些场景，而不把业务实体或 MapLibre 机制泄漏给 Agent。

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
   视觉即时可评估、有真实状态同步问题、天然支持多步操作（可验证 Agent 规划），且贴合设备 / 告警业务场景。
4. 基础设施可延伸。
   AGUIMock 支持确定性 Frontend Tool fixture，Playground / Inspect 已能采集可观察事实，Issue #213 Scenario Lab 的场景文件与 expected facts 经验可作为设计参考。
5. 与 A2UI 线互补。
   A2UI 验证"Agent 生成内容"，本方向验证"Agent 操作既有表面"，两者合并构成人机交互的完整图景。

## 业界参照：Felt

在本次已调研的公开材料中，Felt 是"Agent 操作地图"的主要产品化参照。

### 产品事实

- Felt AI（2026 年 6 月发布）：单一会话 Agent，主张 "Ask a question. Get a map."，多轮上下文保持（如 "Now exclude the flood zones" 式渐进 refine），能力分层为 Understand -> Act -> Deliver，其中 Deliver 层明确包含 viewport control（Agent 控制地图视口聚焦）。
- Felt MCP Server（2026 年 4 月发布）：一个 endpoint，约 30 个工具，覆盖建图（5）、取数（5）、SQL（6）、空间分析（5）、自动样式（2）、协作标注 pins / routes / polygons / notes（7）。

### 值得借鉴的设计与原则

1. 工具分类学。
   Felt 官方公开了 30 工具 / 6 类的 GIS 能力结构，可作为归类、粒度与命名的校验器，但具体工具名与参数是否完全业务无关仍需逐项清点。
2. "The output is a living map, not an API response"。
   Agent 的每次操作落在用户可继续编辑的同一表面上，操作产物不是一次性响应。
3. "Humans stay in the loop because the map is right there"。
   可见、可编辑本身就是信任机制，是意图可见性设计的北极星。
4. 权限继承："It can only see what they can see, only edit what they can edit"。
   Agent 以用户身份行事，对应本平台的能力契约纪律（capability gap 显式呈现，不伪造能力）。
5. "Maps at the scale of your data, not your model"。
   数据留在 warehouse，Agent 写 SQL，只渲染结果。
   这与仓库 GIS 边界同构：Agent 只看稳定的能力契约，不看地图内部实现。

### 分阶段参考价值

Felt 的定位是 agent-as-cartographer：Agent 从零产出一张地图作为交付物。
本平台的场景是 Agent 在实时运行的运营地图上与人共驾（定位设备、查看告警）。
本次已调研的 Felt 官方公开材料基本未触及混合主导、中断 / 撤销、并发冲突和意图可见性，这些问题是本方向的差异化空间，也是报告对比分析的主轴。
按"实施顺序"的五个步骤看，Felt 的参考价值递减：越靠近工具面参考价值越高，越靠近交互语义层越是对比对象而非参照对象。

| 实施顺序步骤       | Felt 可参考的                                                                                                                                | 参考方式                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1. 工具面       | viewport control 被列为 Felt AI 一等能力，确认 focus 类意图工具的地位；"No hand-authored JSON" 的样式意图化设计；Collaborate 的 pins / routes / polygons / notes 标注设计 | 直接借鉴分类学与命名，过滤掉取数 / SQL / warehouse 三类（超出运营场景） |
| 2. 征询等待      | Understand 层的 conversational refinement，渐进 refine 话术给出征询时机的自然样例：澄清模糊目标、提出备选、解释结果                                                         | 借鉴征询时机的类型学，不抄话术本身                             |
| 3. 薄验证 Agent | "The agent decides which capabilities to invoke, in what order"，Agent 职责定义为能力选择与排序；wildfire 风险四步 walkthrough 是现成的探索脚本模板                  | 借鉴决策空间结构，不抄规模（他们几十个能力，本平台 4-6 个工具）            |
| 4. 打断 / 混合主导 | 公开材料基本未触及中止语义与并发控制权                                                                                                                      | 对比对象，非参照                                      |
| 5. 评估与报告     | "Agent 操作地图已产品化"的行业证据                                                                                                                    | 作为对比基线                                        |

一手研究动作：

- 步骤 1 动工前细读 [Felt 开发者文档](https://developers.felt.com/) 的 MCP 工具清单，提取 30 个工具的命名与参数设计作为工具面设计输入。
- 报告期间注册试用 Felt AI，把多轮 refine 与 viewport 控制的一手体验记入对比分析。

官方来源：

- [Felt MCP Server 发布](https://felt.com/blog/introducing-felt-mcp-server)
- [Felt AI 发布](https://www.felt.com/blog/a-brand-new-era-of-gis)
- [Felt AI 产品页](https://felt.com/platform/felt-ai)

## 验证契约

"验证"必须先定义可证伪的假设和通过判据，否则会退化成 demo 堆砌。
本矩阵覆盖当前选定的地图交互模式，用于验证既有 taxonomy 在运营地图域的解释力，不声称覆盖所有人与 Agent 交互。

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
| 单轮问答："东区现在有多少离线设备？" | 作为只读对照基线 | 不产生地图副作用 | 无 | 已有能力覆盖 |
| 委托执行："生成这片区的设备健康报告" | 作为长任务对照基线 | 本轮不产生新结论 | 执行中可选高亮进度 | Issue #200 路径已覆盖 |
| 单步工具基线：从 locateDevice 迁移 | 地图域意图工具可替代业务工具而不损失已有闭环 | 目标、高亮、视口和返回结果与基线一致 | focusOn、highlight | 机制已证明，待迁移 |
| A 多步工具中介：总览告警、高亮簇、聚焦最密处并汇报 | 用户能跟上连续变化并理解整体意图 | 序列终态正确，意图归因正确率达标 | focusOn、highlight | 待做 |
| B 征询等待：两组候选中请用户选择先看哪组 | Agent 能在歧义处停止并在用户答复后继续 | 答复前无后续副作用，答复后目标正确 | useHumanInTheLoop | 待做 |
| C 打断纠偏：逐组查看离线设备分组时，用户改为只看东区 | 用户在多步 Run 的语义步骤之间修改目标时，旧状态与新指令有明确衔接 | 未执行调用被取消，已完成状态处置清晰，Agent 按新目标重规划 | Run 级 / 语义步骤级打断 | 待做 |
| D 混合主导：Agent 切换视口时，用户手动圈选或聚焦东区 | 用户直接操作共享地图与 Agent 当前计划冲突时，控制权让渡可预期 | 用户操作优先或冲突被明确呈现，不出现拉扯振荡 | 优先复用地图本地交互 | 待做 |

#### 横切验证维度

| 横切维度 | 可证伪假设 | 必须通过项 | 注入位置 | 现状 |
| --- | --- | --- | --- | --- |
| E 失败路径 | 多步序列 RUN_ERROR 后地图残余状态与恢复边界清晰 | 错误归因正确，残余状态可见且可恢复 | A-D 任一多步场景 | run-error fixture 已有模式 |
| F 意图可见性 | 用户能归因每次地图变化的发起者和理由 | 所有变化都有可观察来源，归因正确率达标 | 从 A 开始持续记录 | 未验证 |
| G 状态残余 | Agent 部分操作后停止、失败或被纠偏时，地图保留哪些状态有明确规则 | 保留、清理和恢复结果与场景规则一致 | C / D / E | 未验证 |
| H 恢复与接续 | 新指令或新 Run 到来时，系统能明确继续、替换还是清理旧状态 | 新旧 Run 关系可观察，旧操作不会意外恢复 | C / D / E | 未验证 |

单轮问答、委托执行与单步工具调用构成基线。
新增核心研究工作是 A-D 四个场景，E-H 作为横切维度注入，不继续堆独立 demo。
地图 Agent-facing 工具仍收敛为 `focusOn` 与 `highlight`，D 中的直接操作优先作为地图本地交互，不提前增加 Agent Tool。

### 关于场景 C 的打断边界

场景 C 不依赖一个本来会瞬间完成的操作。
如果"定位所有离线设备"最终只是一次 `focusOn(features)`，它没有真实可观察的打断窗口，不适合作为第一阶段的打断验证载体。

第一阶段验证的是 **Run 级 / 语义步骤级打断**。
任务本身天然需要多个用户可感知的 Tool Call，例如逐组 `focusOn -> highlight -> focusOn -> highlight`。
用户在两个语义步骤之间改变目标时，系统需要决定：

- 尚未执行的 Tool Call 是否取消。
- 已经完成的 focus / highlight 是否保留。
- 当前 Run 如何结束。
- 新指令是续接旧 Run 还是启动新 Run。
- Agent 是否需要基于新目标重新规划。

AGUIMock 可以在语义步骤之间加入短暂、确定性的可观察间隔，便于回归和人工观察。
间隔只是验证手段，不是场景成立的原因。
不能通过把一个原本瞬时完成的 Tool Call 人为拉长来证明"支持打断"。

如果未来出现路径规划、轨迹播放、批量编辑等真正长时间运行的单个 Frontend Tool，再单独研究 Tool 内部取消（in-tool cancellation）。
它与当前的 Run 级纠偏是不同问题。

### 地图域工具契约

工具随场景入场，工具面与被验证的交互维度同步增长，不长成通用 GIS Agent SDK。

首轮 Agent 可见地图工具收敛为 `focusOn` 和 `highlight`。
它们使用地图域目标引用，不使用 `deviceId`、`alarmId` 等业务字段，也不接收坐标或样式 JSON。

```text
MapTargetRef
  featureId: string
  layerId?: string

MapOperationResult
  status: completed | cancelled | superseded | failed
  affectedFeatureIds: string[]
  reason?: string
```

业务实体到 `MapTargetRef` 的翻译由数据管线约定承担。
业务可寻址 ID 可作为 `featureId` 的值落图，但 Agent 只看到地图域字段。

新工具入场时过四道校验：

1. 命名落在地图域意图上，不落在 MapLibre 机制或业务对象上。
2. 一次调用对应一个用户可感知的结果，内部可编排多个 MapLibre 调用。
3. 参数只表达地图目标与意图，业务语义由上游数据与 prompt 提供。
4. 结果必须表达完成、取消、被替代和失败，使 Agent 能根据真实地图结果重规划。

现有 `locateDevice` 是纵向切片的务实起点，但它暴露了业务语义，不符合本阶段的目标契约。
步骤 1 将 Agent 可见的 `locateDevice` 迁移为 `focusOn` 与 `highlight`，并同步迁移 fixture 和 e2e 基线，不把业务工具保留为目标契约。
`select` 暂时保留为地图本地状态，不在缺少混合主导证据前提升为 Agent Tool。

交互模式 taxonomy 仍然是待验证假设，不是完备性定理。
如果探索中发现 Agent 主动 map push 等新模式，应新增矩阵行并重新评估覆盖范围。

## 框架复用清点（CopilotKit / AG-UI）

既有研究提出"泛化动作是清点"，下表是清点结果。
轮子与缺口的边界很清楚：CopilotKit 提供工具、挂起、响应和传输机制，地图副作用、残余状态与共享表面控制权仍是 Workbench 应用语义。

| 闭环需求 | 框架已提供 | Workbench 必须定义 |
| --- | --- | --- |
| 单轮问答 | 聊天 UI 与 streaming text 渲染 | - |
| 工具中介行动 | `useFrontendTool`、TOOL_CALL_RESULT 回传与 handler AbortSignal | `focusOn` / `highlight` 的地图副作用和结果契约 |
| 征询等待 | Vue v2 `useHumanInTheLoop` 与 component renderer | 征询内容、超时、取消和回复 UI |
| 事件词汇与路由 | AG-UI 事件协议、SSE 与 thin Runtime 的 Agent 注册 | 验证 source 的可见标识与开关 |
| 传输取消 | AbortController / AbortSignal 基础 | 地图动画与副作用的实际终止和残余状态 |
| 对话纠偏 | 新 Run 和消息传输机制 | 新旧 Run 取代关系和旧操作处置 |
| 意图可见性 / 混合主导 | 可观察工具和 Run 事件 | 变化归因、用户接管和冲突规则 |

## 实施载体

1. 地图域工具实现位于 `apps/web-workbench/src/features/frontend-tools/`，沿用已证明的 `useFrontendTool` 浏览器执行模式。
2. 确定性 fixture 位于 `packages/ag-ui-mock/src/scenarios/`，为每个工程验证维度提供可回归的成功、纠偏、被替代与失败场景。
   打断纠偏 fixture 必须包含天然需要多个 Tool Call 的语义序列，可在步骤间加入短暂、确定性的观察间隔，不靠拉长瞬时操作证明打断。
3. 本验证方向明确准入一个 AGUIMock / SACS 之外的第三 Agent source，即 dev-only 薄验证 Agent。
4. 薄验证 Agent 采用 LangGraph + CopilotKit 官方集成路径，挂接到现有 copilot-runtime 的 Agent 注册，只挂地图域工具与征询能力。
5. 薄验证 Agent 不承载业务逻辑、持久化状态或产品 Runtime Truth，由 LLM 决定工具选择、顺序、征询时机与被纠偏后的重规划。
6. 薄验证 Agent 默认关闭，使用独立配置与明确的验证 source 标识，不伪装为 SACS 也不进入产品默认 source 列表。
7. AGUIMock 保持确定性，LLM 不进入 mock。
8. 薄验证 Agent 的每次运行都记录模型、prompt、工具 schema 与推理参数，使得探索证据可重放、可比较，不将其定义为“不可复现”。

当前 Issue #213 Scenario Lab 只服务 `PresentationInput -> Secondary Presentation LLM -> A2UI surface` 与 expected facts 检查。
本方向只复用其场景文件、人工审定和 expected facts 经验，不声称它已经具备地图交互运行记录能力。

地图交互证据由 Playground / Inspect 采集，并增加最小 JSON 导出或等价的可审查留证方式。
这一能力只导出 Workbench 已观测的公开事实，不创建 Runtime Repository、私有诊断协议或通用评估平台。

## 实施顺序

每步带 e2e 回归：

1. 基线与工具迁移：固定当前 `locateDevice` e2e 基线，将 Agent 可见契约迁移为 `focusOn` 与 `highlight`，并用 `MapTargetRef` 和 `MapOperationResult` 验证行为等价。
2. 多步工具场景：AGUIMock 增加天然需要多个 Tool Call 的语义序列，完成场景 A，并从这一步开始累积意图可见性 F 的证据。
3. 征询等待闭环：使用 Vue v2 `useHumanInTheLoop` 实现征询工具与等待 UI，AGUIMock 增加 consult-during-sequence 场景，完成场景 B。
4. 薄验证 Agent：按 Feature admission gate 立 Issue，以约 1 周的时间盒完成接线和首轮 prompt 探索，并按首轮评估协议重复运行。
5. 打断纠偏与混合主导：定义场景 C / D 的未执行 Tool Call 处置、地图残余状态、新旧 Run 衔接和控制权让渡语义，再用确定性多步 fixture 固化。
6. 横切维度：将失败 E、意图可见性 F、状态残余 G 和恢复接续 H 注入 A-D，不为它们另造孤立 demo。
7. 形成性评估与报告：导出 Inspect 可观察证据，完成参与者任务与评分，产出主报告、证据包、技术资产与后续决策。

核心逻辑：先定义可证伪契约和工具基线，再用确定性 fixture 与薄验证 Agent 分别取工程证据和行为证据，最后用体验证据决定 Go / Pivot / Stop。

## 边界与纪律

- 不做通用 GIS Agent SDK，该能力在仓库规则中明确 out of scope。
- 本方向是 Frontend Tool 能力扩展 + 交互模式验证，不是 GIS Agent 平台化，也不是恢复已删除的 Runtime / Compiler / Presentation 架构。
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

1. `MapTargetRef` 与 `MapOperationResult` 地图域契约。
2. 取消、被替代、失败和用户接管语义。
3. Agent source 能力声明与 Workbench 工具实现的对应矩阵。
4. 可回归 fixture、e2e 测试和经体验证据支持的 UX 准则。

只有当证据表明某项能力稳定、可复用且超越单一场景时，才将其提升为关键技术方向或长期架构约束。

## 进入主线前的重新验证

按 `docs/research/README.md` 的使用原则，本文为非规范性输入。

若此方向准备进入主线：

1. 按"实施顺序"先完成 `locateDevice` 到地图域意图工具的基线迁移，再跑通场景 A。
2. 复用 Issue #213 Scenario Lab 的场景文件和人工审定经验，但为地图交互单独定义 Inspect 证据导出、录屏和评分方式。
3. 按本文准入 dev-only 薄验证 Agent source，并在实施 Issue 中固定开关、source 标识、配置留证与时间盒。
4. 与 `docs/ARCHITECTURE.md` 对齐工具边界、Runtime 职责和 SACS capability gap 后再进入实现。
5. 如果验证后决定把薄验证 Agent 留在产品默认拓扑，或把交互 taxonomy 提升为正式契约，再新增 ADR。
