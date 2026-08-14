# AG-UI Mock

<!-- cspell:words aimock -->

`@generative-ui/ag-ui-mock` 是基于 [`@copilotkit/aimock`](https://aimock.copilotkit.dev/agui-mock/) 的可复用 AG-UI HTTP POST + SSE 测试服务。

它只模拟 Business Agent 的 AG-UI 协议行为，不定义 Presentation、Compiler 或 Runtime Core 语义。

## 场景

- `echo` 提供 `hello`、`echo` 和 `连接测试` 三个基础 AG-UI 连接探针。
- `locate-device` 先请求浏览器执行 `locateDevice({ deviceId: "01" })`，再消费工具结果并返回最终 AG-UI 文本消息。
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
