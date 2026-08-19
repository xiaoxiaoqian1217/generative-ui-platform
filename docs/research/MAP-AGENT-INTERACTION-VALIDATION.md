# 地图场景人机交互验证方向（Agent 操作地图）

- **性质：** 非规范性讨论记录（research）
- **日期：** 2026-08-19
- **背景：** 与领导沟通确定的新验证方向：验证人与 Agent 的交互方式，结合地图场景，让 Agent 可以操作地图，成果可沉淀为关键技术方向或报告输出

## 起点观点

来自领导的方向判断：

- 需要对当前探索方向做验证，验证对象是人与 Agent 的交互方式。
- 验证要结合地图场景落地，让 Agent 可以操作地图。
- 验证成果以后可以作为关键技术或报告输出。
- 领导后续建议自己做一个 Agent 用于验证，其受控落地形态见"实施载体"中的薄验证 Agent。

本文记录对该方向的论证、业界参照、验证矩阵与实施顺序，作为后续实现与报告的输入。

## 与既有研究的关系

本方向是 [Agent 交互泛化方向讨论记录](./AGENT-INTERACTION-GENERALIZATION.md) 中"工具中介行动"模式的深化验证载体。

- 该研究把"工具中介行动"描述为"Agent 驱动前端能力，用户观察结果"，当前由 locateDevice 单次调用跑通。
- 本方向把验证对象从单次工具调用扩展为"地图作为 Agent 的可操作表面"：多步编排、混合主导、中断语义、意图可见性。
- 地图场景同时是"打断纠偏"与"征询等待"模式最自然的触发场（Agent 操作序列进行中用户介入），因此它是 Layer 2 交互模式验证的集中试验场。

## 为什么地图是合适的验证载体

1. 已有基线可直接延伸。locateDevice 已经跑通 Agent -> Frontend Tool -> MapLibre 链路，扩展工具面是增量而非新架构。
2. 验证的是交互模型空白，不是重复验证能力。业界大多在验证"Agent 能否生成或驱动 UI"，但人与 Agent 如何共享一个有状态表面（相机、图层、选区）很少被系统验证。
3. 地图交互性质理想。视觉即时可评估、有真实状态同步问题、天然支持多步操作（可验证 Agent 规划），且贴合设备 / 告警业务场景。
4. 基础设施现成。AGUIMock 支持确定性 Frontend Tool fixture，Issue #213 Scenario Lab 可作评估载体。
5. 与 A2UI 线互补。A2UI 验证"Agent 生成内容"，本方向验证"Agent 操作既有表面"，两者合并构成人机交互的完整图景。

## 业界参照：Felt

Felt 是目前把"Agent 操作地图"产品化程度最高的参照。

### 产品事实

- Felt AI（2026 年 6 月发布）：单一会话 Agent，主张 "Ask a question. Get a map."，多轮上下文保持（如 "Now exclude the flood zones" 式渐进 refine），能力分层为 Understand -> Act -> Deliver，其中 Deliver 层明确包含 viewport control（Agent 控制地图视口聚焦）。
- Felt MCP Server（2026 年 4 月发布）：一个 endpoint，约 30 个工具，覆盖建图（5）、取数（5）、SQL（6）、空间分析（5）、自动样式（2）、协作标注 pins / routes / polygons / notes（7）。

### 值得借鉴的设计与原则

1. 工具分类学。30 工具 / 6 类是 Felt 自身场景（从数据建图）的工具总和，词汇表全部是 GIS 域对象（map / layer / feature / pin / style），零业务名词，业务概念只出现在 prompt 与参数值中。对本平台不是需求清单，而是归类、粒度、命名的校验器。
2. "The output is a living map, not an API response"。Agent 的每次操作落在用户可继续编辑的同一表面上，操作产物不是一次性响应。
3. "Humans stay in the loop because the map is right there"。可见、可编辑本身就是信任机制，是意图可见性设计的北极星。
4. 权限继承："It can only see what they can see, only edit what they can edit"。Agent 以用户身份行事，对应本平台的能力契约纪律（capability gap 显式呈现，不伪造能力）。
5. "Maps at the scale of your data, not your model"。数据留在 warehouse，Agent 写 SQL，只渲染结果。与仓库 GIS 边界同构：Agent 只看稳定的能力契约，不看地图内部实现。

### 分阶段参考价值

Felt 的定位是 agent-as-cartographer：Agent 从零产出一张地图作为交付物。
本平台的场景是 Agent 在实时运行的运营地图上与人共驾（定位设备、查看告警）。
混合主导、中断 / 撤销、并发冲突、意图可见性这些最难的问题 Felt 公开叙事基本未触及，这正是本方向的差异化空间，也是报告对比分析的主轴。
按"实施顺序"的五个步骤看，Felt 的参考价值递减：越靠近工具面参考价值越高，越靠近交互语义层越是对比对象而非参照对象。

| 实施顺序步骤 | Felt 可参考的 | 参考方式 |
| --- | --- | --- |
| 1. 工具面 | viewport control 被列为 Felt AI 一等能力，确认 focus 类意图工具的地位；"No hand-authored JSON" 的样式意图化设计；Collaborate 的 pins / routes / polygons / notes 标注设计 | 直接借鉴分类学与命名，过滤掉取数 / SQL / warehouse 三类（超出运营场景） |
| 2. 征询等待 | Understand 层的 conversational refinement，渐进 refine 话术给出征询时机的自然样例：澄清模糊目标、提出备选、解释结果 | 借鉴征询时机的类型学，不抄话术本身 |
| 3. 薄验证 Agent | "The agent decides which capabilities to invoke, in what order"，Agent 职责定义为能力选择与排序；wildfire 风险四步 walkthrough 是现成的探索脚本模板 | 借鉴决策空间结构，不抄规模（他们几十个能力，本平台 4-6 个工具） |
| 4. 打断 / 混合主导 | 公开材料基本未触及中止语义与并发控制权 | 对比对象，非参照 |
| 5. 评估与报告 | "Agent 操作地图已产品化"的行业证据 | 作为对比基线 |

一手研究动作：

- 步骤 1 动工前细读 [Felt 开发者文档](https://developers.felt.com/) 的 MCP 工具清单，提取 30 个工具的命名与参数设计作为工具面设计输入。
- 报告期间注册试用 Felt AI，把多轮 refine 与 viewport 控制的一手体验记入对比分析。

官方来源：

- [Felt MCP Server 发布](https://felt.com/blog/introducing-felt-mcp-server)
- [Felt AI 发布](https://www.felt.com/blog/a-brand-new-era-of-gis)
- [Felt AI 产品页](https://felt.com/platform/felt-ai)

## 验证矩阵

"验证"必须先定义假设，否则会退化成 demo 堆砌。
覆盖判据沿用五类交互模式：场景库把五类模式在地图域全部实例化，即视为覆盖"所有与 Agent 的交互"；设计层面用矩阵保证完备，实现层面按优先级增量进场。

场景设计分成两层：

- **核心交互场景**回答"人与 Agent 如何共同完成任务"；
- **横切验证维度**回答"任一核心场景发生异常、留下状态或需要解释时，系统是否仍然可理解、可恢复"。

### 核心交互场景

| 场景（交互模式） | 验证假设 | 工具需求 | 现状 |
| --- | --- | --- | --- |
| 单轮问答："东区现在有多少离线设备？" | - | 无，只读 | 已有能力覆盖 |
| 委托执行："生成这片区的设备健康报告" | - | 执行中可选高亮进度 | Issue #200 已完成 |
| 工具中介（单步）：locateDevice | Agent 发起前端工具调用并观察结果是可理解、可信赖的交互 | focusOn（重构自 locateDevice） | 已证明 |
| 工具中介（多步）A："分析告警最集中的区域"，focusOn 总览 -> highlight 簇 -> focusOn 最密处 -> 汇报 | Agent 连续操作相机 / 图层 /选区时，用户能跟上并理解整体意图 | focusOn、highlight | 待做 |
| 征询等待 B："定位离线设备"，序列中发现两组候选，征询"先看哪组"，用户选择后继续 | Agent 停下征询、用户答复、恢复序列的闭环对用户可理解、可预期 | 复用 A + 征询机制 | 待做 |
| 打断纠偏 C："逐组查看所有离线设备分组"，Agent 依次 focusOn / highlight 各组；已查看若干组后用户说"停一下，只看东区" | 用户在多步 Run 的语义步骤之间修改目标时，未执行调用、已产生地图状态与新指令之间有明确衔接语义 | 复用 A + 打断 / 重规划语义 | 待做 |
| 混合主导 D：Agent 正在分析全区告警热点并自动切换视口；用户此时手动圈选或聚焦东区，表达"只关注这里" | 用户直接操作共享地图与 Agent 当前计划发生意图冲突时，控制权让渡与 Agent 后续行为可定义且可预期 | 探索后定义；优先复用地图本地交互 | 待做 |

### 横切验证维度

| 横切维度 | 验证假设 | 注入位置 | 现状 |
| --- | --- | --- | --- |
| 失败路径 E：多步序列中途 RUN_ERROR | 错误后地图残余状态与恢复边界清晰 | A-D 任一多步场景 | run-error fixture 已有模式 |
| 意图可见性 F | 地图发生变化时，用户能归因到 Agent 的哪个操作与理由 | 从场景 A 开始持续记录 | 未验证 |
| 状态残余 G | Agent 已完成部分操作后停止、失败或被纠偏，地图保留哪些状态有明确规则 | C / D / E | 未验证 |
| 恢复与接续 H | 新指令或新 Run 到来时，能够明确继续、替换还是清理旧状态 | C / D / E | 未验证 |

### 关于场景 C 的打断边界

场景 C 不应依赖一个本来会瞬间完成的操作。若"定位所有离线设备"最终只是一次 `focusOn(features)`，它没有真实可观察的打断窗口，不适合作为第一阶段的打断验证载体。

第一阶段验证的是 **Run 级 / 语义步骤级打断**：任务本身天然需要多个用户可感知的 Tool Call，例如逐组 `focusOn -> highlight -> focusOn -> highlight`。用户在两个语义步骤之间改变目标，系统需要决定：

- 尚未执行的 Tool Call 是否取消；
- 已经完成的 focus / highlight 是否保留；
- 当前 Run 如何结束；
- 新指令是续接旧 Run 还是启动新 Run；
- Agent 是否需要基于新目标重新规划。

AGUIMock 可以在语义步骤之间加入短暂、确定性的可观察间隔，便于回归和人工观察；但**间隔只是验证手段，不是场景成立的原因**。不能通过把一个原本瞬时完成的 Tool Call 人为拉长来证明"支持打断"。

如果未来出现路径规划、轨迹播放、批量编辑等真正长时间运行的单个 Frontend Tool，再单独研究 Tool 内部取消（in-tool cancellation）；它与当前的 Run 级纠偏是不同问题。

三个观察：

1. 单轮问答、委托执行与单步工具调用构成基线；新增核心研究工作是 A-D 四个场景，失败、意图可见性、状态残余、恢复接续作为横切维度注入，而不是继续堆独立 demo。
2. 工具面仍然收敛。覆盖当前矩阵推导出的 Agent-facing 地图工具只有 focusOn 与 highlight 两个，加上征询机制；D 中的用户直接操作优先作为地图本地交互存在，不因为混合主导就提前增加 Agent Tool。
3. 矩阵直接构成报告的能力矩阵骨架，每个格子填入证据（fixture 回归 + 体验记录）。

工具准入规则：工具随场景入场，工具面与被验证的交互维度同步增长，不长成平台。
新工具入场时过三道校验：

1. 归类与命名：参照 Felt 分类学，命名落在地图域意图上（focusOn、highlight、setLayerVisibility），不落在渲染机制（setCenter、setPaintProperty）或业务对象（focusDevice）上。
2. 粒度：一次调用等于一个用户可感知的结果；参数值用业务标识或语义意图，不出现坐标、样式 JSON 等机制参数；一个意图工具内部编排多个 MapLibre 调用。
3. 业务无关测试：工具结构与命名不含业务名词（设备、告警），业务语义只进参数值，与 Catalog 的 business-agnostic 纪律同源。工具词汇表是地图语义（viewport / layer / feature / annotation）；业务实体到地图要素的翻译由数据管线约定承担（业务数据以业务可寻址的 ID 作为 featureId 落图）。

业务无关是报告结论可泛化的前提：工具面绑死业务场景，验证结论就只对该场景成立，与交互模式不绑业务是同一条纪律在两层的应用。
现有 locateDevice 是纵向切片的务实产物（focus 与 select 打包、deviceId 入参），在步骤 1 扩展工具面时重构为 focusOn 与 highlight，deviceId 降级为参数值；`select` 暂时保留为地图本地状态，不在缺少混合主导证据前提升为 Agent Tool。

完备性警告：五类模式是完备性假设，不是定理。
运营域可能长出第六类（如 Agent 主动把新告警标注到地图上的 map push，用户未发起）。
探索阶段必须回头校验模式词汇表，发现新模式即新增矩阵行。

## 框架复用清点（CopilotKit / AG-UI）

既有研究提出"泛化动作是清点"，下表是清点结果。
轮子与缺口的边界很清楚：CopilotKit 提供的是挂起 / 回传这类机制件，打断语义与共享表面控制权从来不在任何框架的射程内，因为它们是应用语义，不是框架语义。

| 闭环需求 | 框架已提供，直接复用 | 必须自己做 |
| --- | --- | --- |
| 单轮问答 | 聊天 UI 与 streaming text 渲染 | - |
| 工具中介行动（挂起 / 回传） | `useFrontendTool` 的调用、挂起、TOOL_CALL_RESULT 回传管道 | 工具实现本身（focusOn / highlight） |
| 征询等待（工具级） | `renderAndWaitForResponse` 与 render prop 渲染等待组件 | 征询 UI 的具体设计 |
| 事件词汇与路由 | AG-UI 事件协议、SSE、thin Runtime 的 Agent 注册 | - |
| 打断纠偏 | 传输层断流（AbortController）有基础 | 全部语义层，详见"实施顺序"第 4 步 |
| 意图可见性 / 混合主导 | 无 | 全部 |

## 实施载体

1. 工具实现位于 `apps/web-workbench/src/features/frontend-tools/`，沿用 locateDevice 与 `useFrontendTool` 的既有模式。
2. 确定性 fixture 位于 `packages/ag-ui-mock/src/scenarios/`，为每个验证维度提供可回归的场景（含失败场景，参照 run-error.ts 模式）。打断纠偏同样由 AGUIMock 驱动：mock 提供天然需要多个 Tool Call 的可中断序列，并可在语义步骤间加入短暂、确定性的观察间隔；不靠把一个原本瞬时的操作人为拉长来证明打断。
3. 薄验证 Agent：LangGraph + CopilotKit 官方集成路径，挂接到现有 copilot-runtime 的 Agent 注册，定位为 dev-only 验证仪器（类比 Issue #213 Scenario Lab 的先例），不承载业务逻辑，只挂地图操作工具，由 LLM 决策交互动作（何时征询、被打断后如何反应）。它与 AGUIMock 按证据类型分工，两类证据不可互换：fixture 产工程证据（闭环语义，可回归），验证 Agent 产体验证据（征询时机、重规划质量、新模式发现），后者不可复现，探索会话通过 Scenario Lab / Inspect 录制留证。它将成为 AGUIMock / SACS 之外的第三个 Agent source，按仓库 Feature admission gate 走 Issue 立项；AGUIMock 保持确定性，LLM 不进入 mock。
4. 评估载体复用 Issue #213 Scenario Lab 的 scenarios JSON 与运行记录，不新建评估平台。
5. 验证证据通过 Playground / Inspect 的既有观测能力采集。

## 实施顺序

每步带 e2e 回归：

1. 地图操作工具面 MVP：将 locateDevice 重构为业务无关的 focusOn（deviceId 降级为参数值）并扩展 highlight，AGUIMock 增加带节奏的多步序列场景。覆盖场景 A；从这一步开始记录意图可见性证据，而不是等到后续再补 UX。
2. 征询等待工具级闭环：`renderAndWaitForResponse` 征询工具与征询 UI，AGUIMock 增加 consult-during-sequence 场景。机制 CopilotKit 现成，工作量最小，为后续两步提供参照实现。覆盖场景 B。
3. 薄验证 Agent：按 admission gate 立 Issue 后实现，做体验探索，产出交互模式发现，为第 4 步语义设计提供输入。工作量约 1 周：接线 2 天（agent 骨架、runtime 注册、模型配置），prompt 迭代 2-5 天（真正的研究工作，即报告素材本身），新探索场景边际成本接近零；Issue 中写入时间盒，prompt 迭代限定 5 天内出第一版探索结论。
4. 打断纠偏与混合主导语义：探索中观察用户何时、为何介入，Workbench 侧定义并实现未执行 Tool Call 处置、地图残余状态、新旧 Run 衔接与控制权让渡语义，用 AGUIMock 的天然多步 interruptible fixture 固化。覆盖场景 C / D；失败路径 E、状态残余 G、恢复接续 H 作为横切维度注入，意图可见性 F 继续累计。
5. 评估与报告：Scenario Lab 采集证据，产出 taxonomy、能力矩阵、失败模式清单、UX 准则与 Felt 对比分析。

核心逻辑：先建资产（工具面、闭环），再用仪器取证据（验证 Agent），最后固化语义出报告。

## 边界与纪律

- 不做通用 GIS Agent SDK，该能力在仓库规则中明确 out of scope。
- 本方向是 Frontend Tool 能力扩展 + 交互模式验证，不是 GIS Agent 平台化，也不是恢复已删除的 Runtime / Compiler / Presentation 架构。
- 复用 AG-UI 协议与 CopilotKit `useFrontendTool` 既有机制，不自建交互框架，遵守既有研究对 Layer 2 的"薄"警告。
- SACS 当前不支持 client-provided Frontend Tools，相关验证基于 AGUIMock 与薄验证 Agent，capability gap 显式呈现，不伪造协议能力。
- 薄验证 Agent 是 dev-only 验证仪器，不演变为自研 Business Agent。
- 每个新增 Issue / PR 按仓库 Feature admission gate 答卷。

## 产出物定义

验证成果的目标形态：

1. 地图场景实例化的交互模式 taxonomy（谁发起、如何编排、如何让渡控制权）。
2. 能力矩阵（Agent 侧能力声明与 Workbench 侧实现的对应关系）。
3. 失败模式清单（中断、冲突、超时、错误归因）。
4. UX 准则（意图可见性、撤销边界、操作反馈）。
5. Felt 对比分析（agent-as-cartographer 与 operational copilot 的模式差异）。

## 进入主线前的重新验证

按 `docs/research/README.md` 的使用原则，本文为非规范性输入。

若此方向准备进入主线：

1. 按"实施顺序"第 1 步在 web-workbench 内跑通场景 A。
2. 与 Issue #213 Scenario Lab 的评估流程对齐，确定证据采集方式。
3. 与 `docs/ARCHITECTURE.md` 对齐后再进入实现。
4. 若涉及架构阶段变化（如交互模式词汇表成为正式契约），新增 ADR。