# Generative UI Platform

Generative UI Platform 当前只聚焦一条主线：

> **验证真实 Business Agent 如何通过 AG-UI 与前端交互，并在 Web Workbench 中可靠驱动受控 UI 与 Frontend Tool。**

## 当前主链路

```text
Business Agent / AGUIMock
        │
        │ AG-UI
        ▼
CopilotKit
        │
        ▼
Web Workbench
  ├─ Conversation
  ├─ Controlled UI
  ├─ useFrontendTool
  └─ MapLibre
```

当前阶段遵循：

> **先纵向跑通一个真实场景，再横向抽象公共能力。**

第一条验证场景是：

```text
用户：定位无人机 01
        ↓
Business Agent / AGUIMock
        ↓ AG-UI TOOL_CALL
CopilotKit useFrontendTool("locateDevice")
        ↓
MapLibre 定位设备
        ↓
Frontend Tool Result 返回 Agent
```

## 当前模块

### Active

```text
apps/
└─ web-workbench/

packages/
├─ ag-ui-mock/
├─ ag-ui-adapter/
└─ shared-types/
```

- `web-workbench`：交互验证与调试入口。
- `ag-ui-mock`：可复用 AG-UI 测试服务。
- `ag-ui-adapter`：AG-UI 边界辅助能力；后续只保留协议相关职责。
- `shared-types`：真正跨模块使用的最小共享类型。

### Removed compatibility contracts

以下迁移期契约已经解除依赖并删除：

```text
packages/
├─ compiler-contract/
├─ presentation-contract/
└─ runtime-contract/
```

Workbench 直接使用 CopilotKit / AG-UI。
AG-UI Adapter 只使用 `@ag-ui/core` 原生契约。

### Frozen Workbench capabilities

以下能力为后续真实场景保留，但不属于当前 Release Gate：

- Playground / Inspect / Cases / Catalog / Scenarios / Settings 路由；
- 本地 A2UI reducer、受控 renderer、raw viewer 与 component registry；
- 已接受的 Workbench shell 与 inspection 原型基线；
- case library 与 inspection 支持。

冻结表示保留但不扩建平台能力。
这些能力不是迁移债务，不能因为不在当前 `locateDevice` 链路中就直接删除。

## 已移除的旧方向

当前开发不再维护：

- Agent Runtime Host；
- Reference Business Agent；
- Business Agent Adapter；
- Presentation Pipeline；
- UI Compiler Core；
- Component Catalog Schema；
- Runtime Platform 配套启动、环境和 E2E 脚本。

这些能力属于之前的 Runtime Platform / Presentation Compiler 方向，不再参与当前开发主线。

删除前的完整代码保存在：

```text
archive/pre-scope-reset-2026-08-13
```

基线提交：`c33504db91614420c2ccdf26a8c707f61d659065`。

## 当前不做

除非新的真实场景证明必要，否则当前不建设：

- Thread / Turn / Operation 平台模型；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- 完整 Runtime Diagnostics；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- A2UI 平台化能力；
- Theme 平台化能力；
- 通用 GIS Agent SDK。

后续需要时，从真实场景重新引入，而不是提前建设。

## 开发原则

新增模块前先回答两个问题：

1. 它是否直接服务当前真实的 Agent → AG-UI → Workbench → Frontend Tool 链路？
2. 如果删掉它，当前纵向场景是否无法成立？

如果答案都是否，当前阶段不新增。

## 快速开始

```bash
pnpm install --frozen-lockfile
pnpm dev:web-workbench
```

启动可复用 AG-UI Mock：

```bash
pnpm --filter @generative-ui/ag-ui-mock build
pnpm --filter @generative-ui/ag-ui-mock exec ag-ui-mock --port 4800
```

在 Workbench Settings 中将 Agent 地址设置为 `http://127.0.0.1:4800`，然后输入 `定位无人机 01`。

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm docs:check
```

## 文档

- [当前文档导航](./docs/README.md)；
- [当前阶段决策 ADR-0028](./docs/adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md)；
- [Web Workbench 手册](./apps/web-workbench/README.md)；
- [AG-UI Mock 手册](./packages/ag-ui-mock/README.md)。
