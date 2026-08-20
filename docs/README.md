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
Frontend Tool
  ↓
MapLibre + DeviceCard

已实现
Web Workbench
  ↓
Thin CopilotKit Runtime
  ↓
AGUIMock / single-agent-chat-server

当前阶段
#200 Real SACS Interoperability

下一阶段
SACS AgentContent → Dynamic A2UI
```

当前仍遵循：

> **先纵向跑通场景，再横向抽象公共能力。**

## 当前权威入口

- [根 README](../README.md)：产品主线、模块和开发入口；
- [CONTEXT.md](../CONTEXT.md)：当前阶段上下文与边界；
- [AGENTS.md](../AGENTS.md)：编码 Agent 必须遵守的工程规则；
- [当前架构](./ARCHITECTURE.md)：当前实现、目标拓扑和职责边界；
- [ADR-0029](./adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md)：当前阶段架构决策；
- [ADR-0028](./adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md)：上一阶段 Scope Reset，继续约束 native AG-UI 与 Removed / Historical 边界；
- [CopilotKit Runtime 文档](../apps/copilot-runtime/README.md)：Runtime 配置、SACS 凭据和真实服务 smoke test；
- [Web Workbench 文档](./workbench/README.md)：Workbench 产品定位与演进；
- [Workbench 原型基线](./workbench/PROTOTYPE_BASELINES.md)：已确认的 UI / IA 参考；
- [Research](./research/README.md)：非规范性研究与未来能力参考；
- [Agent 工程文档](./agents/)：Issue、领域与 triage 协作规则。

发生冲突时，以当前代码、ADR-0029、根 `AGENTS.md` 和 `CONTEXT.md` 为准。

## 文档目录职责

```text
docs/
├─ README.md             # 当前文档导航
├─ ARCHITECTURE.md       # 当前架构
├─ adr/                  # 架构决策历史
├─ agents/               # 工程协作规则
├─ research/             # 非规范性研究资料
└─ workbench/            # Workbench 产品与原型资料
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

`docs/research/` 用于保留值得参考的思想、方案调查和未来能力研究。

Research：

- 不是当前架构事实；
- 不是 Release Gate；
- 不授权直接恢复旧实现；
- 真正进入产品前必须结合当时真实需求重新验证。

### Workbench

`docs/workbench/` 只保留仍服务当前 Workbench 路线的产品和设计输入。

## 当前实现与目标架构必须区分

Issue #207 已经落地 thin CopilotKit Runtime。
当前可执行链路通过统一 `/api/copilotkit` endpoint 接入 `ag-ui-mock` 与 `single-agent-chat-server` 两个 Agent Source。
受控 Dynamic A2UI 不作为独立身份存在：Dynamic scenario 经 `forwardedProps` 携带 `requestedMode`，由挂在 `ag-ui-mock` 上的薄 Presentation Policy middleware 在同一 run 内完成生成与缝合。

AGUIMock 路线继续验证业务无关 `setLayerVisibility` / `focusOn` / `highlight` / `previewPath` Frontend Tools、浏览器地图操作与确定性多步场景。
SACS 路线消费 streaming text、Run lifecycle、State、Activity、Artifact 和 bounded `RUN_ERROR`，但不伪造其尚未支持的 client-provided Frontend Tools。

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
3. 研究资料放入 `docs/research/`，并保持非规范性定位。
4. 已退出路线且只描述旧实现、旧命令、旧 Release Gate 的资料直接从当前主文档树移除；需要时通过 Git 历史或 archive 查阅。
5. 不因为历史资料仍可找到，就恢复已经删除的 Runtime / Compiler / Presentation 架构。
