# 地图场景人机交互验证方向（Agent 操作地图）

- **性质：** 非规范性讨论记录（research）
- **日期：** 2026-08-19
- **背景：** 与领导沟通确定的新验证方向：验证人与 Agent 的交互方式，结合地图场景，让 Agent 可以操作地图，成果可沉淀为关键技术方向或报告输出

## 起点观点

来自领导的方向判断：

- 需要对当前探索方向做验证，验证对象是人与 Agent 的交互方式。
- 验证要结合地图场景落地，让 Agent 可以操作地图。
- 验证成果以后可以作为关键技术或报告输出。

本文记录对该方向的论证、业界参照、验证维度与最小实施方案，作为后续实现与报告的输入。

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
- Agent 权限继承用户身份：官方表述为 "It can only see what they can see, only edit what they can edit"。

### 值得借鉴的设计

1. 工具分类学。30 工具 / 6 类是"Agent 地图操作面长什么样"的一个成熟答案，可作为本平台 MapLibre Frontend Tool surface 的设计参照。
2. "The output is a living map, not an API response"。Agent 的每次操作落在用户可继续编辑的同一表面上，操作产物不是一次性响应。
3. "Humans stay in the loop because the map is right there"。可见、可编辑本身就是信任机制，不要求用户盲信输出。

### 定位差异（本方向的差异化空间）

Felt 的定位是 agent-as-cartographer：Agent 从零产出一张地图作为交付物。
本平台的场景是 Agent 在实时运行的运营地图上与人共驾（定位设备、查看告警）。
混合主导、中断 / 撤销、实时并发冲突、意图可见性这些最难的问题，Felt 的公开产品叙事基本未触及。
这恰好是本方向系统化验证的价值所在，也是报告与 Felt 对比分析的主轴。

官方来源：

- [Felt MCP Server 发布](https://felt.com/blog/introducing-felt-mcp-server)
- [Felt AI 发布](https://www.felt.com/blog/a-brand-new-era-of-gis)
- [Felt AI 产品页](https://felt.com/platform/felt-ai)

## 验证假设与维度

"验证"必须先定义假设，否则会退化成 demo 堆砌。

| 维度 | 假设 | 现状 |
| --- | --- | --- |
| 单步工具调用 | Agent 发起前端工具调用并观察结果是可理解、可信赖的交互 | locateDevice 已证明 |
| 多步编排 | Agent 连续操作相机 / 图层 / 选区时，用户能跟上并理解整体意图 | 未验证 |
| 混合主导 | 用户与 Agent 并发操作同一地图时，控制权让渡规则可定义且可预期 | 未验证 |
| 中断 / 撤销 | Agent 操作序列中断（含 RUN_ERROR）时，地图状态有明确语义，撤销边界清晰 | 未验证 |
| 意图可见性 | 地图发生变化时，用户能归因到 Agent 的哪个操作与理由 | 未验证 |

## 最小地图操作工具面

参照 Felt 工具分类，按本平台运营场景过滤出最小相关子集：

| 类别 | 工具 | Felt 参照 |
| --- | --- | --- |
| Viewport | focusDevice / flyTo | Felt AI Deliver 层 viewport control |
| Layer | setLayerVisibility | 最近邻为 Style automatically（自动样式） |
| Selection | selectDevice（已有）、highlightFeatures | 无直接对应 |
| Annotation | pin / note | Collaborate |

实施顺序按验证维度驱动，不按工具面完整性驱动：先只做验证多步编排所需的最小组合。

## 实施载体

1. 工具实现位于 `apps/web-workbench/src/features/frontend-tools/`，沿用 locateDevice 与 `useFrontendTool` 的既有模式。
2. 确定性 fixture 位于 `packages/ag-ui-mock/src/scenarios/`，为每个验证维度提供可回归的场景（含失败场景，参照 run-error.ts 模式）。
3. 评估载体复用 Issue #213 Scenario Lab 的 scenarios JSON 与运行记录，不新建评估平台。
4. 验证证据通过 Playground / Inspect 的既有观测能力采集。

## 边界与纪律

- 不做通用 GIS Agent SDK，该能力在仓库规则中明确 out of scope。
- 本方向是 Frontend Tool 能力扩展 + 交互模式验证，不是 GIS Agent 平台化，也不是恢复已删除的 Runtime / Compiler / Presentation 架构。
- 复用 AG-UI 协议与 CopilotKit `useFrontendTool` 既有机制，不自建交互框架，遵守既有研究对 Layer 2 的"薄"警告。
- SACS 当前不支持 client-provided Frontend Tools，相关验证基于 AGUIMock，capability gap 显式呈现，不伪造协议能力。
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

1. 先在 web-workbench 内以最小工具面组合跑通多步编排场景。
2. 与 Issue #213 Scenario Lab 的评估流程对齐，确定证据采集方式。
3. 与 `docs/ARCHITECTURE.md` 对齐后再进入实现。
4. 若涉及架构阶段变化（如交互模式词汇表成为正式契约），新增 ADR。
