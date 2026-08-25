# 文档导航

`dev_1.0` 的普通文档只描述**当前产品路线、当前实现边界和下一阶段工作**。

历史实现细节不继续堆叠在主文档树中；旧 Compiler / Runtime Platform / Operations 资料可通过 Git 历史和 `archive/pre-scope-reset-2026-08-13` 查阅。

## 当前产品路线

```text
已验证
AGUIMock
  ↓ AG-UI
CopilotKit Frontend
  ↓
Map-domain Frontend Tools / HITL
  ↓
MapLibre persistent surface

已实现
Web Workbench
  ↓
Thin CopilotKit Runtime
  ↓
AGUIMock / single-agent-chat-server / optional map-validation-agent

已实现
A2UI Renderer / Platform Catalog / controlled Dynamic A2UI
Scenario Lab / dev-only Map Validation Agent

当前阶段
#200 Real SACS Interoperability
Map interaction real-provider smoke and human evaluation

下一阶段
SACS AgentContent → Dynamic A2UI
```

当前仍遵循：

> **先纵向跑通场景，再横向抽象公共能力。**

Agent–User Interaction 验证进一步采用：

> **以有限的 Interaction Mode 为一级索引，用具体场景验证，再沉淀交互知识资产与可复用技术资产。**

## 当前权威入口

- [根 README](../README.md)：产品主线、模块和开发入口；
- [CONTEXT.md](../CONTEXT.md)：当前阶段上下文与边界；
- [AGENTS.md](../AGENTS.md)：编码 Agent 必须遵守的工程规则；
- [当前架构](./ARCHITECTURE.md)：当前实现、目标拓扑和职责边界；
- [ADR-0029](./adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md)：当前阶段架构决策；
- [ADR-0030](./adr/0030-prioritize-dynamic-a2ui-over-theme-and-extend-runtime-presentation-scope.md)：Dynamic A2UI 阶段顺序与 Runtime Presentation 职责白名单；
- [ADR-0031](./adr/0031-separate-scenario-fixture-authoring-from-presentation-llm.md)：Scenario Fixture Authoring 与 Secondary Presentation LLM 分离；
- [ADR-0028](./adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md)：上一阶段 Scope Reset，继续约束 native AG-UI 与 Removed / Historical 边界；
- [CopilotKit Runtime 文档](../apps/copilot-runtime/README.md)：Runtime 配置、SACS 凭据和真实服务 smoke test；
- [Map Validation Agent 文档](../apps/map-validation-agent/README.md)：独立 LangGraph server、版本化场景、配置与真实模型 smoke；
- [Web Workbench 文档](./workbench/README.md)：Workbench 产品定位与演进；
- [Workbench 原型基线](./workbench/PROTOTYPE_BASELINES.md)：已确认的 UI / IA 参考；
- [Agent–User Interaction 地图场景验证说明](./AGENT-USER-INTERACTION-MAP-VALIDATION.md)：**面向分享的验证主文档**，说明 5 类交互模式、4 个地图实验、验证方式以及最终两类资产；
- [地图场景 Agent–User Interaction 验证方向](./research/MAP-AGENT-INTERACTION-VALIDATION.md)：**当前地图验证主设计**，维护 Interaction Mode → Scenario → EXP 的映射、横切问题和实现载体；
- [Research](./research/README.md)：详细研究底稿与未来能力参考；Research Protocol 保存 Research Question、假设与证据方法，但不负责当前 EXP 编号；
- [Experiments](./experiments/README.md)：按 Interaction Mode 组织的单次实验；
- [Reports](./reports/README.md)：由多次实验汇总形成的阶段性验证报告；
- [Agent 工程文档](./agents/)：Issue、领域与 triage 协作规则。

发生冲突时，以当前代码、ADR-0029 / ADR-0030 / ADR-0031、根 `AGENTS.md` 和 `CONTEXT.md` 为准。研究资料约束研究与证据表达，不替代当前架构事实。

## 文档目录职责

```text
docs/
├─ README.md                                # 当前文档导航
├─ ARCHITECTURE.md                          # 当前架构
├─ AGENT-USER-INTERACTION-MAP-VALIDATION.md # 面向分享的验证主文档
├─ adr/                                     # 架构决策历史
├─ agents/                                  # 工程协作规则
├─ research/                                # 验证主设计、方法底稿与研究输入
├─ experiments/                             # Interaction Mode 实验与结果记录
├─ reports/                                 # 多实验汇总后的阶段性成果
└─ workbench/                               # Workbench 产品与原型资料
```

### ADR

ADR 负责回答“为什么做出某个架构决策”。

旧 ADR 可以保留，因为它们是决策历史；被后续决策替代的 ADR 不再定义当前实现。

### Agents

`docs/agents/` 保留工程治理价值，不属于产品历史垃圾：

- 如何读取仓库领域上下文；
- Issue / PR 工作方式；
- triage 标签约定。

### Research

`docs/research/` 保存值得参考的思想、验证设计、研究协议和未来能力研究。

Research：

- 不是当前架构事实；
- 不是 Release Gate；
- 不授权直接恢复旧实现；
- 真正进入产品前必须结合当时真实需求重新验证。

对于 Agent–User Interaction 主线：

- `MAP-AGENT-INTERACTION-VALIDATION.md` 维护当前 Interaction Mode → Scenario → EXP 主设计；
- `AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md` 保留详细方法底稿，需要解释 Research Question、假设和证据时再查阅；
- 对外说明优先阅读 `docs/AGENT-USER-INTERACTION-MAP-VALIDATION.md`。

### Experiments

`docs/experiments/` 保存单次实验设计和实验结果。

当前 EXP 优先对应可跨业务描述的 Interaction Mode，并统一回答：

```text
交互模式
→ 实验目标
→ 实验场景
→ User / Agent / GUI 交互流程
→ 验证重点
→ 实验结果
→ 交互知识资产 + 可复用技术资产
```

A/B 对照是可选实验手段，不是每个 EXP 的固定要求。意图可见性、Shared State、Direct Manipulation 等优先作为横切问题放回相应模式中验证。

### Reports

`docs/reports/` 保存由多个实验汇总得到的阶段性验证结论。

稳定成果优先分成两类：

- **交互知识资产**：模式定义、标准流程、设计原则、适用边界和可迁移场景；
- **可复用技术资产**：交互能力、状态 / 协议约定、Frontend / Runtime 实现、Scenario / Fixture 和自动化测试。

只有单个 Demo 或单个地图领域的成功，不直接宣称为跨领域通用结论。

### Workbench

`docs/workbench/` 只保留仍服务当前 Workbench 路线的产品和设计输入。

## 当前实现与目标架构必须区分

Issue #207 已经落地 thin CopilotKit Runtime。
当前可执行链路通过统一 `/api/copilotkit` endpoint 接入默认注册的 `ag-ui-mock` 与 `single-agent-chat-server`，并可条件注册独立的 dev-only `map-validation-agent`。
受控 Dynamic A2UI 不作为独立身份存在：Dynamic scenario 经 `forwardedProps` 携带 `requestedMode`，由挂在 `ag-ui-mock` 上的薄 Presentation Policy middleware 在同一 run 内完成生成与缝合。

AGUIMock 路线继续验证业务无关 `setLayerVisibility` / `focusOn` / `highlight` / `previewPath` Frontend Tools、浏览器地图操作与确定性多步场景。
SACS 路线消费 streaming text、Run lifecycle、State、Activity、Artifact 和 bounded `RUN_ERROR`，但不伪造其尚未支持的 client-provided Frontend Tools。
Map Validation Agent 路线复用现有地图 Frontend Tools 与 HITL，以版本化 run-scoped 场景验证真实 LLM 的工具选择、征询和 Tool Result continuation。

A2UI Renderer、Platform Catalog 与受控 Dynamic A2UI 已完成。
Theme 与真实 SACS AgentContent 到 Dynamic A2UI 仍是后续路线，不应描述为已实现能力。

## 明确延期

当前不恢复：

- Thread / Turn / Operation Platform；
- Runtime Repository / Runtime Truth；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- 自研 Interaction Gateway；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- 通用 GIS Agent SDK。

CopilotKit Runtime 是薄的 Agent Integration Layer，不等同于以上 Runtime Platform。

## 文档维护规则

1. 普通文档优先描述当前事实和已接受的近期目标。
2. 重大架构阶段变化使用 ADR 记录，不静默覆盖历史决策。
3. 面向分享的 Agent–User Interaction 验证总览放在 `docs/AGENT-USER-INTERACTION-MAP-VALIDATION.md`。
4. Interaction Mode → Scenario → EXP 主设计放在 `docs/research/MAP-AGENT-INTERACTION-VALIDATION.md`；详细研究方法留在 Research Protocol。
5. 单次 Interaction Mode 实验和结果放入 `docs/experiments/`。
6. 多次实验汇总后的交互知识资产与可复用技术资产放入 `docs/reports/`。
7. 已退出路线且只描述旧实现、旧命令、旧 Release Gate 的资料直接从当前主文档树移除；需要时通过 Git 历史或 archive 查阅。
8. 不因为历史资料仍可找到，就恢复已经删除的 Runtime / Compiler / Presentation 架构。
