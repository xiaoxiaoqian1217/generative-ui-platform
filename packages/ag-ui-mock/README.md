# AG-UI Mock

<!-- cspell:words aimock -->

`@generative-ui/ag-ui-mock` 是基于 [`@copilotkit/aimock`](https://aimock.copilotkit.dev/agui-mock/) 的可复用 AG-UI HTTP POST + SSE 测试服务。

它只模拟 Business Agent 的 AG-UI 协议行为，不定义 Presentation、Compiler 或 Runtime Core 语义。

## 场景

- `echo` 提供 `hello`、`echo` 和 `连接测试` 三个基础 AG-UI 连接探针。
- `inspection-summary-a2ui` 为 `展示巡检摘要 A2UI` 返回固定 `a2ui-surface` Activity Snapshot，并为 `展示损坏的 A2UI` 返回缺失 Catalog 的隔离测试数据。
- `inspection-summary-platform-a2ui` 为 `展示平台 Catalog 巡检摘要 A2UI` 返回使用 Platform Catalog（Metric / StatusBadge / InfoRow）的固定 `a2ui-surface` Activity Snapshot。
- `inspection-summary-structured` 为 `展示巡检摘要结构化结果` 通过 `activityType: inspection-summary` 的标准 `ACTIVITY_SNAPSHOT.content` 返回不含 A2UI 的受控结构化业务内容，作为 Dynamic A2UI 的受控输入（Issue #210）。
- 两个 A2UI fixture 的 `createSurface.catalogId` 都引用 `@generative-ui/shared-types` 导出的 `PLATFORM_A2UI_CATALOG_ID`，与 Workbench 注册的合并 Catalog 保持一致。
- `locate-device` 将原有定位意图迁移为 `focusOn` 后接 `highlight`，每次续跑先返回对应的标准 `TOOL_CALL_RESULT`，再继续或返回最终 AG-UI 文本消息。
- `map-patrol-route-review` 为“北侧通道巡逻方案研判与调整”确定性执行 `setLayerVisibility`、`focusOn`、`highlight`、`previewPath` 四步地图意图，并在每步之间保留短暂观察间隔。
- `consult-patrol-route-selection` 通过 `requestPatrolRouteSelection` 等待标准 role = tool 的用户答复，并确定性覆盖路线 A、路线 B、取消和固定修改要求四个 continuation 分支。
- `previewPath` 仅预览 fixture 中已有的候选路线，不计算、优化或提交路线。
- `run-error` 对包含 `mock failure` 的输入返回 bounded `RUN_ERROR`（`MOCK_FIXTURE_ERROR`），用于失败定位与 Inspect 回归。

服务器启动时会注册全部场景，不需要也不支持逐个启用场景。
新增场景后，应将其注册到同一个服务器实例。

## CLI

从仓库根目录执行：

```bash
pnpm dev:ag-ui-mock
```

执行 `pnpm dev` 会同时启动 AG-UI Mock 与 Web Workbench。
Workbench 的 Vite 开发服务器会将同源 `/api/copilotkit` 请求代理到该 Mock。

服务同时接受标准根路径 `POST /` 和 Workbench 使用的 `POST /api/copilotkit/agent/default/run`。

Workbench 的 Agent 地址可以配置为 `http://127.0.0.1:4800`。
Workbench 会由这个地址生成 CopilotKit Runtime 基础地址 `/api/copilotkit`。
CopilotKit 会自动请求 `/api/copilotkit/info` 发现 `default` Agent，再把消息发送到 `/api/copilotkit/agent/default/run`。
输入 `连接测试` 应返回 `AG-UI mock is connected.`。

## Node API

```ts
import { createAguiMockServer } from "@generative-ui/ag-ui-mock";

const server = createAguiMockServer({
  port: 4800,
});

await server.start();
await server.stop();
```

测试中可以传入 `port: 0`，由操作系统分配空闲端口，并从 `start()` 的返回值读取实际 URL。
