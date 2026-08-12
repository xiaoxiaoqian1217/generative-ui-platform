# AG-UI Mock

<!-- cspell:words aimock -->

`@generative-ui/ag-ui-mock` 是基于 [`@copilotkit/aimock`](https://aimock.copilotkit.dev/agui-mock/) 的可复用 AG-UI HTTP POST + SSE 测试服务。

它只模拟 Supporting Agent Integration，不定义 Presentation、Compiler 或 Runtime Core 语义。

## 场景

- `echo` 用于验证基础 AG-UI 连接与文本响应。
- `locate-device` 先请求浏览器执行 `locateDevice({ deviceId: "01" })`，再消费工具结果并返回最终 Markdown Presentation。

## CLI

从仓库根目录执行：

```bash
pnpm --filter @generative-ui/ag-ui-mock build
pnpm --filter @generative-ui/ag-ui-mock exec ag-ui-mock --scenario locate-device --port 4800
```

服务同时接受标准根路径 `POST /` 和 Workbench 使用的 `POST /api/copilotkit/agent/default/run`。

Workbench 的 Runtime Host 地址可以配置为 `http://127.0.0.1:4800`。

## Node API

```ts
import { createAguiMockServer } from "@generative-ui/ag-ui-mock";

const server = createAguiMockServer({
  port: 4800,
  scenario: "locate-device",
});

await server.start();
await server.stop();
```

测试中可以传入 `port: 0`，由操作系统分配空闲端口，并从 `start()` 的返回值读取实际 URL。
