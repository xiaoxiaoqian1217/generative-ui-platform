# 地图场景 Agent–User Interaction 验证方向

- **性质：** 非规范性研究与验证设计
- **更新：** 2026-08-25
- **核心目标：** 通过地图场景验证可复用的 Agent 交互模式，并把结果沉淀为交互知识资产与可复用技术资产。

## 1. 验证目的

本方向不是为了继续扩展“地图 Agent Demo”，也不是为了泛化 UI 组件。

真正要验证的是：

> **当 Agent 进入一个持续变化、可直接操作的传统 GUI 后，用户与 Agent 应该如何通过有限、可复用的交互模式共同完成任务。**

最终沉淀两类成果：

### 1.1 交互知识资产

回答“以后类似 Agent 产品应该怎么设计”，包括：

- 交互模式定义；
- 标准交互流程；
- 设计原则；
- 适用边界；
- 可迁移场景。

### 1.2 可复用技术资产

回答“以后类似交互怎么快速实现和验证”，包括：

- 可复用交互能力；
- 状态 / 协议约定；
- Frontend / Runtime 承载；
- Scenario / Fixture；
- 自动化测试与可观察证据。

因此实验完成的标准不是“功能做出来”，而是：

```text
Interaction Mode
↓
Map Scenario
↓
Experiment
↓
Observed Result
↓
交互知识资产 + 可复用技术资产
```

---

## 2. 为什么选择地图作为验证场

地图不是研究对象本身，而是一个高交互密度、状态可观察、操作可结构化的共享 GUI。

它适合作为第一实验域，因为：

- **状态持续存在**：视口、图层、高亮、选择、路线都会保留；
- **用户可以直接操作**：点击、拖动、选择、调整天然存在；
- **Agent 也可以操作**：定位、聚焦、高亮、预览都可以通过受控 Frontend Tool 表达；
- **结果容易观察**：Agent 的操作会直接改变共享界面；
- **容易出现控制权问题**：Agent 执行过程中用户可能征询、打断、修改或接管；
- **交互关系可迁移**：委托、等待、工具行动、纠偏并不属于 GIS 专有概念。

地图因此用于把 Agent–User Interaction 问题放大和具体化，再判断哪些知识可以迁移到表格、甘特图、工作流、三维场景等其他 GUI。

---

## 3. 五类交互模式

当前项目以 `AGENT-INTERACTION-GENERALIZATION.md` 已归纳的五类模式作为一级索引。

| 交互模式 | 本质 | 是否单独 EXP |
| --- | --- | --- |
| 单轮问答 | 用户提问，Agent 返回文本 / 流式文本 | 否，基础能力已成熟 |
| 委托执行 | 用户给完整目标，Agent 接手、多步推进并交付结果 | EXP-001 |
| 征询等待 | Agent 在决策点停下询问，用户答复后恢复 | EXP-002 |
| 工具中介行动 | Agent 通过 Frontend Tool 操作既有 GUI，用户观察结果 | EXP-003 |
| 打断纠偏 | 用户在 Agent 执行中改变目标、约束或选择，Agent 调整后续计划 | EXP-004 |

准入原则：

> **一个 Interaction Mode 必须可以在不使用地图、设备、任务等业务名词的情况下完整描述。**

EXP 不再按“发现了一个 UI 问题”无限增加，而优先围绕这些有限交互模式建立验证闭环。

---

## 4. 母场景：北侧通道巡逻方案研判与调整

四个 EXP 共享同一套业务事实，避免每种交互模式都重新造一个 Demo。

固定 Fixture 提供：

| 业务事实 | 地图投影 |
| --- | --- |
| 北侧通道是当前研判区域 | `north-corridor` |
| 东侧高地、桥下区域、检查点 B 为观察点 | `east-ridge` / `under-bridge` / `checkpoint-b` |
| 北坡限制区不可进入 | `north-restricted-zone` / constraints layer |
| 路线 A、路线 B 为已有候选路线 | `patrol-path-a` / `patrol-path-b` |

Agent 不在首轮实验中计算路线、生成业务事实或判断专业方案优劣。

原因是本轮验证对象是**交互模式**。如果同时引入业务推理质量、路径规划算法和工具选择准确率，失败时就无法判断到底是业务能力问题还是交互问题。

业务语义留在 Scenario 与 Agent 上下文；地图工具只表达稳定的地图域意图。

---

## 5. Interaction Mode → Scenario → EXP

### EXP-001：委托执行

**地图场景：** 用户把“北侧通道巡逻研判”整体交给 Agent。

```text
用户委托完整任务
↓
Agent 接手
↓
多步推进
↓
必要的进度 / 阶段结果
↓
最终研判结果
```

验证重点：任务接手、执行状态、过程反馈、最终交付和结果边界。

文档：[`EXP-001-delegated-execution.md`](../experiments/map/EXP-001-delegated-execution.md)

### EXP-002：征询等待

**地图场景：** 路线 A / B 都合理，最终选择取决于用户偏好。

```text
Agent 研判
↓
发现多个合理方案
↓
展示关键差异
↓
征询并等待
↓
用户选择
↓
Agent 恢复
```

验证重点：决策点识别、等待语义、用户选择、恢复执行以及避免过度征询。

文档：[`EXP-002-consult-and-wait.md`](../experiments/map/EXP-002-consult-and-wait.md)

### EXP-003：工具中介行动

**地图场景：** Agent 使用受控 Frontend Tool 展示北侧通道巡逻要素。

```text
用户提出展示目标
↓
Agent 选择 Frontend Tool
↓
地图执行真实变化
↓
Tool Result 回传
↓
Agent 继续
```

当前地图能力：

- `setLayerVisibility`；
- `focusOn`；
- `highlight`；
- `previewPath`。

验证重点：Agent → Tool → GUI → Result → Continue 是否构成稳定闭环，以及地图工具是否保持业务无关。

文档：[`EXP-003-tool-mediated-action.md`](../experiments/map/EXP-003-tool-mediated-action.md)

### EXP-004：打断纠偏

**地图场景：** Agent 还在按旧约束推进时，用户提出“别走北坡，改从东侧绕”。

```text
Agent Working
↓
用户纠偏
↓
旧待执行计划失效
↓
保留仍有效状态
↓
对齐最新意图与 GUI 状态
↓
Agent 继续
```

验证重点：用户最新意图的优先级、旧计划失效、状态保留和重新继续。

文档：[`EXP-004-interrupt-and-correct.md`](../experiments/map/EXP-004-interrupt-and-correct.md)

---

## 6. 横切验证问题

下面这些问题很重要，但**不作为一级 Interaction Mode，也不默认单独创建 EXP**。

| 横切问题 | 主要影响模式 | 说明 |
| --- | --- | --- |
| 意图可见性 | 委托执行、工具中介行动 | 用户是否知道 Agent 为什么改变 GUI、做到哪一步 |
| Progress / Activity | 委托执行 | 多步任务需要展示多少过程信息 |
| 控制权让渡 | 征询等待、打断纠偏 | 当前应该由 Agent 还是用户行动 |
| Shared State | 工具中介行动、打断纠偏 | 哪些 GUI 语义状态需要进入 Agent Context |
| Direct Manipulation | 打断纠偏等 | 用户可通过 GUI 而非语言表达修改，是一种输入方式，不是独立模式 |
| 失败与恢复 | 四类模式 | 失败后如何归因、保留状态和继续 |
| Preview / Confirm / Approval | 征询等待、外部执行 | 高风险或不可逆操作可能需要更强控制机制 |

如果某个横切问题出现明确设计争议，再在对应 EXP 内增加局部对照或变体验证。

因此：

> **A/B Comparison 是实验手段，不是 EXP 的固定章节，也不是每个交互模式必须具备的结构。**

---

## 7. 当前实现与验证载体

### 7.1 AGUIMock

用于确定性验证和浏览器回归：

- 固定业务事实；
- 固定 Tool Call / Tool Result；
- 可复现 Frontend Tool 与 HITL 流程；
- 适合验证 UI、状态和协议边界。

### 7.2 Map Validation Agent

`apps/map-validation-agent` 是独立、dev-only 的 LangGraph 验证 Agent，不替代真实业务 Agent。

当前绑定：

- `setLayerVisibility`；
- `focusOn`；
- `highlight`；
- `previewPath`；
- `requestPatrolRouteSelection`。

当前版本化 Scenario：

- `north-corridor-overview-v1`；
- `north-corridor-route-choice-v1`；
- `north-corridor-route-choice-reversed-v1`。

真实 provider smoke 与确定性 Fixture 分开记录。只有真实运行过的事实才能进入 smoke evidence；Pending 不能被写成已验证结论。

### 7.3 Workbench

Workbench 是所有实验的共同观察面：

- Conversation；
- MapLibre persistent surface；
- Frontend Tools / HITL；
- Inspect；
- Run / Tool / Activity / Artifact 等公开证据。

### 7.4 SACS

SACS 用于真实 Business Agent 互操作验证，包括 streaming、Run lifecycle、State、Activity、Artifact 等现有能力。

当前能力缺口应显式呈现，不为了实验完整而伪造其尚未支持的 client-provided Frontend Tools。

---

## 8. EXP 文档统一结构

每个 EXP 统一采用：

```text
1. 交互模式
2. 实验目标
3. 实验场景
4. 交互流程
5. 验证重点
6. 实验结果
7. 最终沉淀
   7.1 交互知识资产
   7.2 可复用技术资产
```

其中：

- “交互模式”先脱离业务定义；
- “实验场景”再把模式落入地图；
- “实验结果”只写真实观察和当前判断；
- “最终沉淀”把地图经验重新抽象为知识和技术资产；
- 适用边界保留在交互知识资产中，但不是独立一级产物；
- 对照方案只有确实需要比较某个设计选择时才增加。

---

## 9. 最终产出物

每个 EXP 完成后，不以“功能是否完成”作为唯一结论。

### 交互知识资产

至少回答：

```text
这个模式解决什么问题？
标准流程是什么？
有哪些设计原则？
什么时候适合 / 不适合？
还能迁移到哪些 GUI 场景？
```

### 可复用技术资产

至少检查：

```text
现有能力中哪些可以直接复用？
是否形成新的状态 / 协议约定？
Frontend / Runtime 是否有可复用实现？
Scenario / Fixture 是否可以复用？
是否值得形成自动化回归？
```

多个 EXP 稳定以后，再汇总形成阶段性验证报告，而不是把单个场景直接上升成通用产品规范。

---

## 10. 当前推进顺序

```text
单轮问答
→ 已有，不单独实验

EXP-001 委托执行
↓
EXP-002 征询等待
↓
EXP-003 工具中介行动
↓
EXP-004 打断纠偏
↓
汇总交互知识资产与可复用技术资产
```

这不是功能 Roadmap。

实验是否继续、是否增加变体，应由前一个模式实际暴露的问题决定。

最终目标始终是：

> **验证有限的 Agent 交互模式，并把地图中的实践转化成可复用的交互知识和技术资产。**
