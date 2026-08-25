# Agent–User Interaction 地图场景验证说明

> **定位：面向项目分享的验证主文档**  
> **版本：v0.2**  
> **日期：2026-08-25**

## 一句话说明

我们不是在做一个“地图 Agent Demo”，而是把地图作为第一个实验场，验证：

> **当 Agent 进入一个持续变化的传统 GUI 后，用户与 Agent 应该通过哪些可复用交互模式共同完成任务。**

最终希望沉淀两类成果：

1. **交互知识资产**：模式定义、标准流程、设计原则、适用边界和可迁移场景；
2. **可复用技术资产**：交互能力、状态 / 协议约定、Frontend / Runtime 实现、Scenario / Fixture 和自动化测试。

---

## 1. 为什么要做这个验证

传统软件主要由用户直接操作界面；Agent 进入软件以后，用户和 Agent 都可能成为界面的操作者。

因此真正的问题已经不只是“Agent 能不能调用一个前端工具”，而是：

> **用户什么时候把任务交给 Agent，Agent 什么时候应该停下来问用户，什么时候可以直接操作 GUI，用户中途改变方向后 Agent 又应该如何继续。**

这些关系如果每个业务都重新设计，会很快变成大量互不一致的交互。

所以当前更值得泛化的不是 UI 长什么样，而是少量、稳定的 **Agent Interaction Mode**。

---

## 2. 为什么选择地图

地图不是最终研究对象，而是一个适合观察 Agent–User Interaction 的实验环境：

- 状态持续存在：视口、图层、高亮、选择和路线都会保留；
- 用户可以直接操作；
- Agent 也可以通过 Frontend Tool 操作；
- Agent 行为会直接改变共享界面，结果容易观察；
- 很容易出现等待、接管、纠偏和状态冲突；
- 委托、征询、工具行动、纠偏这些关系都可以迁移到其他 GUI。

因此地图用来把交互问题具体化，而不是把结论绑定到 GIS。

---

## 3. 我们验证哪些交互模式

当前项目已经把用户与 Agent 的基本交互收敛为五类：

| 交互模式 | 核心关系 | 地图实验 |
| --- | --- | --- |
| 单轮问答 | 用户问，Agent 回答 | 基础能力已成熟，不单独 EXP |
| 委托执行 | 用户给目标，Agent 接手、多步推进并交付结果 | EXP-001 |
| 征询等待 | Agent 在决策点停下，用户决定后继续 | EXP-002 |
| 工具中介行动 | Agent 通过受控 Frontend Tool 操作既有 GUI | EXP-003 |
| 打断纠偏 | 用户在执行中改变方向，Agent 调整后续计划 | EXP-004 |

这五类模式可以脱离地图、设备、巡逻等业务词汇描述，因此具备成为复用对象的基础。

---

## 4. 四个地图实验

所有实验共享“北侧通道巡逻方案研判与调整”这一套业务事实，避免每个模式重新制造一个独立 Demo。

### EXP-001：委托执行

用户：

> **帮我想想怎么巡逻北侧通道。**

```text
用户委托完整任务
↓
Agent 接手
↓
多步推进
↓
必要的过程反馈
↓
最终研判结果
```

主要验证：Agent 接手任务后，用户如何知道任务正在推进、当前结果是什么，以及什么时候算真正完成。

### EXP-002：征询等待

路线 A / B 都合理，但最终取舍依赖用户偏好：

```text
Agent 发现多个合理方案
↓
说明关键差异
↓
停下来等待用户
↓
用户选择
↓
Agent 继续
```

主要验证：Agent 是否能在正确的地方让渡控制权，而不是所有动作都询问用户，也不是所有决定都替用户做。

### EXP-003：工具中介行动

用户要求 Agent 展示北侧通道巡逻要素：

```text
Agent
↓
Frontend Tool
↓
GUI Change
↓
Tool Result
↓
Agent Continue
```

当前地图工具包括：

- `setLayerVisibility`；
- `focusOn`；
- `highlight`；
- `previewPath`。

主要验证：Agent 通过受控前端能力操作既有 GUI 的闭环是否稳定、清晰并可跨业务复用。

### EXP-004：打断纠偏

Agent 正在按旧计划推进时，用户提出：

> **别走北坡，改从东侧绕。**

```text
用户纠偏
↓
过时的待执行计划失效
↓
保留仍有效的 GUI 状态
↓
对齐最新意图
↓
Agent 继续
```

主要验证：用户改变方向以后，Agent 如何停止过时行为，并从最新任务状态继续协作。

---

## 5. 怎么验证

每个 EXP 都遵循同一个基本结构：

```text
交互模式
↓
实验目标
↓
地图场景
↓
User / Agent / GUI 交互流程
↓
验证重点
↓
实际运行与观察
↓
最终沉淀
```

我们不再要求每个实验都必须做 A0 / A1 对照。

> **对照方案只是实验手段。只有当某个具体设计选择存在争议时，才增加局部对照。**

例如“过程反馈应该是一句语义提示还是持久 Timeline”可以比较，但它不应该反过来定义“委托执行”这个交互模式。

---

## 6. 为什么这种验证有可信度

当前验证主要依赖三类事实。

### 真实工程链路

实验不是静态原型，而是在真实链路上运行：

```text
Agent
→ AG-UI / CopilotKit
→ Frontend Tool / HITL
→ Workbench GUI
→ Tool Result / User Result
→ Agent Continue
```

### 可重复场景

AGUIMock 和版本化 Scenario 固定业务事实与期望行为，使同一个交互模式可以重复验证，而不会每次都被业务数据变化打乱。

### 真实 Agent 与确定性验证分开

确定性 Fixture 用于确认 UI、协议和状态闭环；`map-validation-agent` 用于观察真实 LLM 是否能正确选择工具和交互模式。

真实 provider 的 smoke evidence 只有实际运行后才能填写，Pending 不被写成“已经验证”。

实验结果也不要求必须支持预设判断；出现反例、模式不适用或者已有简单交互已经足够，同样属于有效结果。

---

## 7. 横切问题怎么处理

一些重要问题不再单独升级成一级 EXP，而是放回相应交互模式里验证：

- **意图可见性**：主要影响委托执行、工具中介行动；
- **Progress / Activity**：主要影响委托执行；
- **控制权让渡**：主要影响征询等待、打断纠偏；
- **Shared State**：主要影响工具中介行动、打断纠偏；
- **Direct Manipulation**：是用户表达意图的一种输入方式，可作为打断纠偏等模式的变体；
- **失败与恢复**：横切所有模式；
- **Preview / Confirm / Approval**：在高风险或不可逆操作中进一步验证。

这样可以避免“每发现一个交互细节就新增一种模式”，保持 Interaction Mode 本身是有限、稳定的。

---

## 8. 最终形成什么

### 8.1 交互知识资产

每个模式最终需要回答：

```text
它解决什么问题？
标准交互流程是什么？
有哪些设计原则？
什么时候适合 / 不适合？
还能迁移到哪些 GUI？
```

例如“征询等待”最终不是一张路线选择卡，而是一条可以迁移的知识：

```text
Agent Working
→ Decision Point
→ Ask User
→ Wait
→ User Decision
→ Resume
```

适用边界继续保留，因为没有“什么时候不要用”，一个 Pattern 很容易被错误泛化。

### 8.2 可复用技术资产

同一个实验还要检查有没有值得留下的工程能力：

```text
交互能力
状态 / 协议约定
Frontend / Runtime 实现
Scenario / Fixture
自动化测试
```

例如“征询等待”除了形成设计知识，还可能沉淀 HITL、Tool Result continuation、等待 / 恢复状态、route-choice fixture 和 E2E 测试。

这意味着以后真实业务 Agent 接入时，拿到的不只是一篇研究报告，而是：

> **知道应该怎么设计，也有东西可以直接复用。**

---

## 9. 当前实现基础

当前仓库已经具备：

- AGUIMock 确定性场景；
- Thin CopilotKit Runtime；
- MapLibre persistent surface；
- 地图 Frontend Tools；
- `requestPatrolRouteSelection` HITL；
- dev-only `map-validation-agent`；
- `north-corridor-overview-v1`、route-choice 与 reversed Scenario；
- Workbench Inspect 与自动化回归基础。

这使当前工作重点可以从“先把技术链路造出来”转向：

> **用这些基础设施验证四种核心 Interaction Mode，并提炼知识与技术资产。**

---

## 10. 文档层级

```text
分享时看
AGENT-USER-INTERACTION-MAP-VALIDATION.md
↓

具体验证设计
research/MAP-AGENT-INTERACTION-VALIDATION.md
↓

四个交互模式实验
experiments/map/EXP-001 ~ EXP-004
↓

需要解释研究方法时
research/AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md
↓

多实验稳定后
reports/
```

详细 Research Protocol 继续保留作为方法底稿，但不再负责定义 EXP 编号或场景分类。

最终主线可以概括为：

> **验证有限的 Agent 交互模式 → 沉淀交互知识资产 → 沉淀可复用技术资产 → 指导真实 Agent + GUI 产品。**
