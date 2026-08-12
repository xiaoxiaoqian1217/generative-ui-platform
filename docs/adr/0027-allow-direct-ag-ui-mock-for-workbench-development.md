# ADR-0027: 允许 Workbench 在开发验证中直接连接 AGUIMock

- **状态:** 已接受
- **日期:** 2026-08-12
- **来源决策:** #202

## 背景

ADR-0026 规定 AG-UI 是 Workbench 的唯一 Agent 应用协议，并把 Runtime Host 定义为正式 Agent Runtime Integration 的入口。
这一约束继续适用于生产拓扑、Runtime Truth、Command Admission、Surface Lifecycle 和业务副作用。

Frontend Tool 的开发仍缺少一个更小的协议测试边界。
如果每次验证浏览器工具调用都必须启动真实 Business Agent 和完整 Runtime Host 编排，协议回归会依赖模型、业务状态和非确定性外部服务。
如果改用自定义 REST 夹具，又会绕开 AG-UI Tool Call 的真实事件语义。

Issue #202 选择增加一个确定性的 `AGUIMock` workspace package，并允许 Workbench 在显式开发配置下直接连接它。
该选择与正式 Runtime Host 拓扑存在表面冲突，因此需要明确例外的范围和安全边界。

## 决策

### 1. 正式拓扑不变

生产和正式 Agent Runtime Integration 仍采用以下拓扑:

```text
Workbench
   | AG-UI
   v
Agent Runtime Host
   v
Business Agent Adapter
```

Runtime Host 继续拥有 Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot。
Workbench 不得直接连接真实 Business Agent，也不得持有 Business Agent 私有地址或凭据。

### 2. 增加受控开发例外

在本地开发、自动化测试和演示环境中，Workbench 可以通过显式 `agUiMockUrl` 或 `VITE_AG_UI_MOCK_URL` 直接连接 `AGUIMock`。
这条连接必须继续使用 AG-UI 语义和受支持的 Transport，当前为 HTTP POST + SSE。
它不是第二套 Agent 应用协议。

```text
Workbench
   | AG-UI over HTTP POST + SSE
   v
AGUIMock
```

未提供显式配置时，这条路径必须保持关闭。
生产配置不得设置 `agUiMockUrl`。

### 3. AGUIMock 只做协议替身

`AGUIMock` 只产生确定性的 AG-UI 事件并消费浏览器返回的 Frontend Tool 结果。
它不得拥有或模拟平台 Runtime Truth，不得执行真实业务副作用，不得绕过 Command Admission，也不得调用 Presentation Pipeline 或 UI Compiler Core。
它不是 Business Agent Adapter，也不是 Runtime Host 的替代实现。

### 4. 直接工具调用只能改变浏览器本地 UI 状态

直接连接场景只允许调用可逆、无业务副作用的 Frontend Tool。
当前 `locateDevice({ deviceId })` 只读取受控本地设备目录，并更新地图视角、标记高亮和设备卡片。
需要真实设备控制、业务写入、Command、Action Resume、Surface 生命周期或跨刷新恢复的能力必须经过 Runtime Host。

### 5. Mock package 必须可复用

`packages/ag-ui-mock` 必须提供可导入的 Server API 和可执行 CLI。
场景必须可替换，并且测试不得依赖模型密钥、远程服务或真实设备。
Workbench E2E 必须使用发布构建和真实浏览器验证完整 Tool Call 闭环。

## 与既有 ADR 的关系

本 ADR 细化 ADR-0026，不取代其 AG-UI 单一应用协议决策。
本 ADR 只放宽 Workbench 在显式开发验证配置下的连接目标，不放宽正式 Runtime Host 的事实所有权和安全边界。
ADR-0024 定义的 Runtime Truth 与 Command Admission 继续完整有效。

## 后果

正面后果:

- Frontend Tool 的协议、参数和 UI 效果可以在无真实 Business Agent 的环境中确定性回归。
- E2E 仍然经过真实 AG-UI Tool Call 事件和浏览器工具注册，而不是自定义测试捷径。
- Mock Server 可以被其他前端或协议测试复用。

负面后果:

- Workbench 存在两个 AG-UI 连接目标，需要通过显式配置和场景路由保持边界清晰。
- 开发环境必须防止把 AGUIMock 配置带入生产。
- 浏览器本地结果不能被误认为 Runtime Truth 或业务执行结果。

## 验收约束

- `AGUIMock` 的 Server API、CLI、health endpoint 和 locate-device 场景有自动化测试。
- Workbench 注册公开的 `locateDevice({ deviceId })` Frontend Tool。
- 输入“定位无人机 01”会产生 Tool Call、执行浏览器工具、移动 MapLibre 视角、高亮标记并展示设备卡。
- 该 E2E 不启动真实 Business Agent，也不需要模型密钥。
- 未配置 AGUIMock 时，Workbench 的正式 Runtime Host 行为保持不变。
